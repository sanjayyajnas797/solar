
const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");

const axiosInstance = axios.create({
    timeout: 60000
});

let TOKEN = null;
let TOKEN_TIME = 0;
const TOKEN_DURATION = 3600 * 1000;

async function getToken() {
    if (TOKEN && Date.now() - TOKEN_TIME < TOKEN_DURATION) {
        return TOKEN;
    }

    const res = await axiosInstance.post(
        `${config.BASE_URL}/v1.0/account/token`,
        {
            appSecret: config.APP_SECRET,
            email: config.EMAIL,
            password: sha256(config.PASSWORD),
            countryCode: "91"
        },
        {
            params: { appId: config.APP_ID }
        }
    );

    TOKEN = res.data.accessToken;
    TOKEN_TIME = Date.now();

    return TOKEN;
}

async function api(url, data) {
    const token = await getToken();

    try {
        const res = await axiosInstance.post(
            `${config.BASE_URL}${url}`,
            data,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        if (typeof res.data === "string") {
            throw new Error("Invalid Deye API response");
        }

        return res.data;
    } catch (err) {
        if (err.response?.data?.code === 2101017) {
            TOKEN = null;

            const newToken = await getToken();

            const retry = await axiosInstance.post(
                `${config.BASE_URL}${url}`,
                data,
                {
                    headers: {
                        Authorization: `Bearer ${newToken}`
                    }
                }
            );

            return retry.data;
        }

        throw err;
    }
}

function getISTDateTime(timestamp) {
    const date = new Date(Number(timestamp) * 1000);

    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23"
    }).formatToParts(date);

    const values = {};
    for (const part of parts) {
        if (part.type !== "literal") {
            values[part.type] = part.value;
        }
    }

    return {
        date: `${values.year}-${values.month}-${values.day}`,
        time: `${values.hour}:${values.minute}:${values.second}`
    };
}

async function getInverterHistory(stationId, date) {
    // 1. Get devices for selected station
    const deviceResponse = await api(
        "/v1.0/station/device",
        {
            page: 1,
            size: 100,
            stationIds: [Number(stationId)]
        }
    );

    const devices = (deviceResponse.deviceListItems || []).filter(d =>
        d.deviceType === "INVERTER" ||
        d.deviceType === "INV" ||
        d.deviceType === 1
    );

    if (!devices.length) {
        return [];
    }

    // 2. Fetch history for all inverters
    const historyResults = await Promise.all(
        devices.map(async device => {
            const result = await api(
                "/v1.0/device/history",
                {
                    deviceSn: String(device.deviceSn),
                    startAt: date,
                    endAt: date,
                    granularity: 1,
                    measurePoints: [
                        "DailyActiveProduction",
                        "TotalActiveACOutputPower"
                    ]
                }
            );

            return {
                deviceSn: String(device.deviceSn),
                dataList: result.dataList || []
            };
        })
    );

    // 3. Combine inverter values by exact timestamp
    const timeMap = {};

    for (const result of historyResults) {
        for (const item of result.dataList) {
            const ist = getISTDateTime(item.time);

            if (ist.date !== date) continue;

            // Only 10:00 AM to 5:00 PM IST
            if (ist.time < "10:00:00" || ist.time > "17:00:00") {
                continue;
            }

            const energy = Number(
                item.itemList?.find(
                    x => x.key === "DailyActiveProduction"
                )?.value || 0
            );

            const powerW = Number(
                item.itemList?.find(
                    x => x.key === "TotalActiveACOutputPower"
                )?.value || 0
            );

            const key = `${ist.date} ${ist.time}`;

            if (!timeMap[key]) {
                timeMap[key] = {
                    time: key,
                    inverterEnergy: 0,
                    powerW: 0
                };
            }

            timeMap[key].inverterEnergy += energy;
            timeMap[key].powerW += powerW;
        }
    }

    // 4. Return combined values
    return Object.values(timeMap)
        .sort((a, b) => a.time.localeCompare(b.time))
        .map(row => ({
            time: row.time,
            inverterEnergy: Number(row.inverterEnergy.toFixed(2)),
            inverterPowerKw: Number((row.powerW / 1000).toFixed(2))
        }));
}

module.exports = {
    getInverterHistory
};

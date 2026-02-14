const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ================= CACHE =================

let CACHE = null;
let CACHE_TIME = 0;

const CACHE_DURATION = 30000; // 30 sec


// ================= TOKEN CACHE =================

let TOKEN = null;
let TOKEN_TIME = 0;

const TOKEN_DURATION = 3600 * 1000;


// ================= TOKEN =================

async function getToken() {

    if (
        TOKEN &&
        Date.now() - TOKEN_TIME < TOKEN_DURATION
    )
        return TOKEN;

    const res = await axios.post(
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


// ================= API HELPER =================

async function api(url, body) {

    const token = await getToken();

    const res = await axios.post(
        `${config.BASE_URL}${url}`,
        body,
        {
            params: { appId: config.APP_ID },
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    return res.data;
}


// ================= GET STATIONS =================

async function getStations() {

    const data =
        await api(
            "/v1.0/station/list",
            { page: 1, size: 100 }
        );

    return data.stationList || [];
}


// ================= GET DEVICES =================

async function getDevices(stationId) {

    const data =
        await api(
            "/v1.0/station/device",
            {
                page: 1,
                size: 100,
                stationIds: [Number(stationId)]
            }
        );

    return data.deviceListItems || [];
}


// ================= GET LATEST =================

async function getLatest(deviceSn) {

    const data =
        await api(
            "/v1.0/device/latest",
            {
                deviceList: [String(deviceSn)]
            }
        );

    return data.deviceDataList?.[0] || null;
}


// ================= YESTERDAY ENERGY =================

async function getYesterday(stationId) {

    const yesterday = new Date();

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    const date =
        yesterday.toISOString().split("T")[0];

    const data =
        await api(
            "/v1.0/station/history",
            {
                stationId: Number(stationId),
                startAt: date,
                endAt: date,
                granularity: 2
            }
        );

    return Number(
        data?.stationDataItems?.[0]?.generationValue || 0
    );
}


// ================= BUILDING DATA =================

async function getBuilding(station) {

    const devices =
        await getDevices(station.id);

    const inverter =
        devices.find(
            d => d.deviceType === "INVERTER"
        );

    if (!inverter)
        return {
            id: station.id,
            name: station.name,
            today: 0,
            yesterday: 0,
            inverter: 0,
            online: 0,
            offline: 0,
            currentPower: 0
        };


    const latest =
        await getLatest(inverter.deviceSn);


    const today =
        Number(
            latest?.dataList?.find(
                d =>
                d.key === "DailyActiveProduction"
            )?.value || 0
        );


    const powerRaw =
        Number(
            latest?.dataList?.find(
                d =>
                d.key === "TotalActiveACOutputPower"
            )?.value || 0
        );


    const currentPower =
        powerRaw / 1000;


    const yesterday =
        await getYesterday(station.id);


    return {

        id: station.id,

        name: station.name,

        today,

        yesterday,

        inverter: 1,

        online:
            powerRaw > 0 ? 1 : 0,

        offline:
            powerRaw > 0 ? 0 : 1,

        currentPower:
            Number(
                currentPower.toFixed(1)
            )

    };

}


// ================= MAIN BUILDING =================

async function getMainBuildingData() {

    if (
        CACHE &&
        Date.now() - CACHE_TIME < CACHE_DURATION
    )
        return CACHE.main;


    const stations =
        await getStations();


    const buildings =
        await Promise.all(
            stations.map(getBuilding)
        );


    let totalToday = 0;
    let totalYesterday = 0;
    let totalInv = 0;
    let online = 0;
    let offline = 0;


    buildings.forEach(b => {

        totalToday += b.today;

        totalYesterday += b.yesterday;

        totalInv += b.inverter;

        online += b.online;

        offline += b.offline;

    });


    CACHE = {

        main: {

            name: "NLC CAMPUS",

            today:
                Number(
                    totalToday.toFixed(1)
                ),

            yesterday:
                Number(
                    totalYesterday.toFixed(1)
                ),

            inverter: totalInv,

            online,

            offline

        },

        sub: buildings

    };


    CACHE_TIME = Date.now();

    return CACHE.main;
}


// ================= SUB BUILDINGS =================

async function getSubBuildings() {

    if (
        CACHE &&
        Date.now() - CACHE_TIME < CACHE_DURATION
    )
        return CACHE.sub;

    await getMainBuildingData();

    return CACHE.sub;
}

// ================= GRAPH =================

async function getGraph(stationId, type) {

    const devices =
        await getDevices(stationId);

    const inverter =
        devices.find(
            d => d.deviceType === "INVERTER"
        );

    if (!inverter)
        return [];

    const deviceSn =
        inverter.deviceSn;

    const now = new Date();

    let startAt;
    let endAt;
    let granularity;

    function formatDateLocal(date) {

        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");

        return `${y}-${m}-${d}`;
    }

    if (type === "today") {

        startAt = formatDateLocal(now);
        endAt = formatDateLocal(now);
        granularity = 1;

    }

    else if (type === "yesterday") {

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        startAt = formatDateLocal(yesterday);
        endAt = startAt;
        granularity = 1;
    }

    else {

        const firstDay =
            new Date(
                now.getFullYear(),
                now.getMonth(),
                1
            );

        startAt = formatDateLocal(firstDay);
        endAt = formatDateLocal(now);
        granularity = 2;
    }


    const data =
        await api(
            "/v1.0/device/history",
            {
                deviceSn: String(deviceSn),
                startAt,
                endAt,
                granularity,
                measurePoints: [
                    "TotalActiveACOutputPower"
                ]
            }
        );

    const raw =
        data?.dataList || [];

    console.log("GRAPH RAW:", raw.length);


    return raw.map(item => {

    const collectTime =
        item?.collectTime || item?.time;

    if (!collectTime)
        return null;

    const timestamp =
        Number(collectTime);

    const date =
        new Date(timestamp * 1000);

    const powerValue =
        item?.itemList?.find(
            i =>
                i.key ===
                "TotalActiveACOutputPower"
        )?.value;

    return {

        time:
            date.toISOString(),

        power:
            Number(powerValue || 0)

    };

}).filter(Boolean);
}


// ================= LOGIN =================

const SECRET = "mysecret";

function login(email, password) {

    if (
        email === "sun@gmail.com" &&
        password === "123456"
    )
        return jwt.sign(
            { email },
            SECRET,
            { expiresIn: "1d" }
        );

    throw new Error("Invalid credentials");

}


// ================= EXPORT =================

module.exports = {

    getMainBuildingData,

    getSubBuildings,

    getGraph,

    login

};

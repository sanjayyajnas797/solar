const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ================= WEATHER CACHE =================

let WEATHER_CACHE = {};
const WEATHER_CACHE_DURATION = 600000; // 10 minutes


// ================= CAMPUS LOCATION =================

const CAMPUS_LOCATION = {

    // Neyveli
    NLCIL: { lat: 11.7480, lon: 79.7714 },

    // example change later if needed
    BTPS: { lat: 27.4924, lon: 77.6737 },

    NLCIC: { lat: 11.7500, lon: 79.7700 },

    NTPL: { lat: 13.0827, lon: 80.2707 },

    NUPPL: { lat: 11.6000, lon: 79.5000 }

};


// ================= MAIN CACHE =================

let CACHE = null;
let CACHE_TIME = 0;

const CACHE_DURATION = 30000;


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


// ================= WEATHER FUNCTION =================

async function getWeather(campus){

try{

campus = campus.toUpperCase();

if(
WEATHER_CACHE[campus] &&
Date.now() - WEATHER_CACHE[campus].time < WEATHER_CACHE_DURATION
){
return WEATHER_CACHE[campus].data;
}

const location = CAMPUS_LOCATION[campus];

if(!location)
return {
irradiance:0,
ambientTemp:0,
windSpeed:0
};

const res = await axios.get(
`https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,wind_speed_10m,shortwave_radiation`
);

const current = res.data.current;

const weather = {

irradiance:
Math.round(current.shortwave_radiation || 0),

ambientTemp:
current.temperature_2m,

windSpeed:
current.wind_speed_10m

};

// cache save
WEATHER_CACHE[campus] = {
data:weather,
time:Date.now()
};

return weather;

}catch(err){

console.log("Weather error:",err.message);

return {
irradiance:0,
ambientTemp:0,
windSpeed:0
};

}

}


// ================= BUILDING DATA =================

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
            total: 0,
            currentPower: 0
        };


    // CURRENT POWER
    const latest =
        await getLatest(inverter.deviceSn);

    const powerRaw =
        Number(
            latest?.dataList?.find(
                d =>
                d.key ===
                "TotalActiveACOutputPower"
            )?.value || 0
        );

    const currentPower =
        Number((powerRaw / 1000).toFixed(1));


    // ✅ FIXED TODAY PRODUCTION
    const todayDate =
        new Date()
        .toISOString()
        .split("T")[0];

    const todayRes =
        await api(
            "/v1.0/station/history",
            {
                stationId:
                    Number(station.id),

                startAt:
                    todayDate,

                endAt:
                    todayDate,

                granularity: 2
            }
        );

    const today =
        Number(
            todayRes?.stationDataItems?.[0]
            ?.generationValue || 0
        );


    // YESTERDAY
    const yesterday =
        await getYesterday(station.id);


    // TOTAL ENERGY
    const total =
        Number(
            latest?.dataList?.find(
                d =>
                d.key ===
                "TotalActiveProduction"
            )?.value || 0
        );


    return {

        id: station.id,

        name: station.name,

        today,

        yesterday,

        total,

        currentPower

    };

}



// ================= MAIN BUILDING =================

async function getMainBuildingData() {

    try {

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
        let totalLifetime = 0;


        buildings.forEach(b => {

            totalToday += b.today;
            totalYesterday += b.yesterday;
            totalLifetime += b.total;

        });


        CACHE = {

            main: {

                name: "NLC CAMPUS",

                today:
                    Number(totalToday.toFixed(1)),

                yesterday:
                    Number(totalYesterday.toFixed(1)),

                total:
                    Number(totalLifetime.toFixed(1))

            },

            sub: buildings

        };


        CACHE_TIME = Date.now();


        return CACHE.main;

    }
    catch {

        return {
            name: "NLC CAMPUS",
            today: 0,
            yesterday: 0,
            total: 0
        };

    }

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


// ================= LOGIN =================

function login(email, password) {

    if (
        email === "sun@gmail.com" &&
        password === "123456"
    )
        return jwt.sign(
            { email },
            "mysecret",
            { expiresIn: "1d" }
        );

    throw new Error("Invalid credentials");

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


// ================= GET YESTERDAY =================

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

async function getGraph(type, stationId) {

    try {

        const devices =
            await getDevices(stationId);

        const inverter =
            devices.find(
                d => d.deviceType === "INVERTER"
            );

        if (!inverter) return [];

        const now = new Date();

        let startAt;
        let endAt;
        let granularity;


        if (type === "today") {

            startAt =
                now.toISOString().split("T")[0];

            endAt = startAt;

            granularity = 1;

        }
        else if (type === "yesterday") {

            const yesterday = new Date();

            yesterday.setDate(now.getDate() - 1);

            startAt =
                yesterday.toISOString().split("T")[0];

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

            startAt =
                firstDay.toISOString().split("T")[0];

            endAt =
                now.toISOString().split("T")[0];

            granularity = 2;

        }


        const result =
            await api(
                "/v1.0/device/history",
                {
                    deviceSn:
                        String(inverter.deviceSn),

                    startAt,
                    endAt,

                    granularity,

                    measurePoints: [
                        "TotalActiveACOutputPower"
                    ]
                }
            );


        const raw =
            result.dataList || [];


        return raw.map(item => {

            const powerObj =
                item.itemList?.find(
                    i =>
                    i.key ===
                    "TotalActiveACOutputPower"
                );

            return {

                // ✅ FIXED HERE
                time:
                    new Date(
                        Number(item.time) * 1000
                    ).toISOString(),

                power:
                    Number(powerObj?.value || 0)

            };

        });


    }
    catch (err) {

        console.log(
            "Graph error:",
            err.response?.data ||
            err.message
        );

        return [];

    }

}


// ================= EXPORT =================

module.exports = {

    getMainBuildingData,
    getSubBuildings,
    getWeather,
    login,
   getStations,
getDevices,
getLatest,
getYesterday,
getGraph

};

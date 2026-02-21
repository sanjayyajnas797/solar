const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ✅ ADD KEEP ALIVE (SPEED BOOST)
const http = require('http');
const https = require("https");

const axiosInstance = axios.create({
    httpAgent: new http.Agent({ keepAlive: true }),
    httpsAgent: new https.Agent({ keepAlive: true }),
    timeout: 15000
});

// ================= YESTERDAY CACHE =================

let YESTERDAY_CACHE = {};
const YESTERDAY_CACHE_DURATION = 86400000; // 24 hrs


// ================= DEVICE CACHE =================

let DEVICE_CACHE = {};
const DEVICE_CACHE_DURATION = 300000; // 5 mins
// ================= WEATHER CACHE =================

let WEATHER_CACHE = {};
const WEATHER_CACHE_DURATION = 600000; // 10 minutes


// ================= CAMPUS LOCATION =================

const CAMPUS_LOCATION = {

  // ✅ NLCIL – Neyveli (CORRECT)
  NLCIL: { lat: 11.5485, lon: 79.4766 },

  // ✅ BTPS – Barsingsar, Rajasthan (CORRECT)
  BTPS: { lat: 28.0983, lon: 73.4278 },

  // ✅ NTPL – Tuticorin (Thoothukudi) (CORRECT)
  NTPL: { lat: 8.7642, lon: 78.1348 },

  // ✅ NUPPL – Neyveli (same region ok)
  NUPPL: { lat: 11.5485, lon: 79.4766 },

  // ✅ NLCIC – Neyveli (same)
  NLCIC: { lat: 11.5485, lon: 79.4766 }

};



// ================= MAIN CACHE =================

let CACHE = null;
let CACHE_TIME = 0;
const CACHE_DURATION = 60000;

// ✅ ADD CACHE LOCK
let CACHE_PROMISE = null;


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

    console.log("Fetching new token...");

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


// ================= API HELPER =================

async function api(url, body) {

    const token = await getToken();

    const res = await axiosInstance.post(
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


// ================= WEATHER =================

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

const res = await axiosInstance.get(
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

    if (
        DEVICE_CACHE[stationId] &&
        Date.now() - DEVICE_CACHE[stationId].time < DEVICE_CACHE_DURATION
    ) {
        return DEVICE_CACHE[stationId].data;
    }

    const data = await api(
        "/v1.0/station/device",
        {
            page: 1,
            size: 100,
            stationIds: [Number(stationId)]
        }
    );

    const devices = data.deviceListItems || [];

    DEVICE_CACHE[stationId] = {
        data: devices,
        time: Date.now()
    };

    return devices;
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
            console.log("FULL DEVICE RESPONSE:", JSON.stringify(data, null, 2));
    return data.deviceDataList?.[0] || null;
}


// ================= GET YESTERDAY =================

async function getYesterday(stationId) {

    // ✅ CACHE
    if (
        YESTERDAY_CACHE[stationId] &&
        Date.now() - YESTERDAY_CACHE[stationId].time < YESTERDAY_CACHE_DURATION
    ) {
        return YESTERDAY_CACHE[stationId].value;
    }

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const date = yesterday.toISOString().split("T")[0];

    const data = await api(
        "/v1.0/station/history",
        {
            stationId: Number(stationId),
            startAt: date,
            endAt: date,
            granularity: 2
        }
    );

    const value = Number(
        data?.stationDataItems?.[0]?.generationValue || 0
    );

    // ✅ SAVE CACHE
    YESTERDAY_CACHE[stationId] = {
        value,
        time: Date.now()
    };

    return value;
}

// ================= BUILDING =================

async function getBuilding(station) {

try{

// ⚡ PARALLEL FETCH
const [devices, yesterday] = await Promise.all([
    getDevices(station.id),
    getYesterday(station.id)
]);

const inverter =
devices.find(d=>d.deviceType==="INVERTER");

if (!inverter)
return {
id: station.id,
name: station.name,
today: 0,
yesterday: 0,
total: 0,
currentPower: 0
};

// ⚡ ONLY ONE API CALL
const latest = await getLatest(inverter.deviceSn);

const today =
Number(
latest?.dataList?.find(
d=>d.key==="DailyActiveProduction"
)?.value || 0
);

const powerRaw =
Number(
latest?.dataList?.find(
d=>d.key==="TotalActiveACOutputPower"
)?.value || 0
);

const currentPower =
Number((powerRaw / 1000).toFixed(1));

const total =
Number(
latest?.dataList?.find(
d=>d.key==="TotalActiveProduction"
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

}catch(err){

console.log("Building error:", err.message);

return {
id: station.id,
name: station.name,
today: 0,
yesterday: 0,
total: 0,
currentPower: 0
};

}

}

// ================= MAIN BUILDING =================

async function getMainBuildingData() {

try{

if(
CACHE &&
Date.now() - CACHE_TIME < CACHE_DURATION
)
return CACHE.main;


// ✅ ADD CACHE LOCK
if(CACHE_PROMISE)
return CACHE_PROMISE;


CACHE_PROMISE = (async()=>{

console.log("Refreshing main cache...");

const stations =
await getStations();

const buildings =
await Promise.all(
stations.map(getBuilding)
);

let totalToday=0;
let totalYesterday=0;
let totalLifetime=0;

buildings.forEach(b=>{

totalToday+=b.today;
totalYesterday+=b.yesterday;
totalLifetime+=b.total;

});

CACHE={
main:{
name:"NLC CAMPUS",
today:Number(totalToday.toFixed(1)),
yesterday:Number(totalYesterday.toFixed(1)),
total:Number(totalLifetime.toFixed(1))
},
sub:buildings
};

CACHE_TIME=Date.now();

// ✅ RELEASE LOCK
CACHE_PROMISE=null;

return CACHE.main;

})();

return CACHE_PROMISE;

}catch(err){

console.log("Main building error:", err.message);

CACHE_PROMISE=null;

return {
name:"NLC CAMPUS",
today:0,
yesterday:0,
total:0
};

}

}


// ================= SUB BUILDINGS =================

async function getSubBuildings(){

if(
CACHE &&
Date.now() - CACHE_TIME < CACHE_DURATION
)
return CACHE.sub;

await getMainBuildingData();

return CACHE.sub;

}


// ================= GRAPH =================

async function getGraph(type, stationId){

try{

const devices =
await getDevices(stationId);

const inverter =
devices.find(
d=>d.deviceType==="INVERTER"
);

if(!inverter) return [];

const now=new Date();

let startAt,endAt,granularity;

if(type==="today"){

startAt=now.toISOString().split("T")[0];
endAt=startAt;
granularity=1;

}
else if(type==="yesterday"){

const y=new Date();
y.setDate(now.getDate()-1);

startAt=y.toISOString().split("T")[0];
endAt=startAt;
granularity=1;

}
else{

const firstDay=new Date(
now.getFullYear(),
now.getMonth(),
1
);

startAt=firstDay.toISOString().split("T")[0];
endAt=now.toISOString().split("T")[0];
granularity=2;

}

const result=
await api(
"/v1.0/device/history",
{
deviceSn:String(inverter.deviceSn),
startAt,
endAt,
granularity,
measurePoints:[
"TotalActiveACOutputPower"
]
}
);

const raw=result.dataList||[];

return raw.map(item=>{

const powerObj=
item.itemList?.find(
i=>i.key==="TotalActiveACOutputPower"
);

return{
time:new Date(Number(item.time)*1000).toISOString(),
power:Number(powerObj?.value||0)
};

});

}catch(err){

console.log("Graph error:",err.message);
return [];

}

}


// ================= LOGIN =================

function login(email,password){

if(
email==="sun@gmail.com" &&
password==="123456"
)
return jwt.sign(
{email},
"mysecret",
{expiresIn:"1d"}
);

throw new Error("Invalid credentials");

}


// ================= BACKGROUND CACHE REFRESH =================

setInterval(async ()=>{

try{

await getMainBuildingData();

console.log("Background cache refreshed");

}catch(err){

console.log("Background refresh error:", err.message);

}

},60000);


// ================= EXPORT =================

module.exports={

getMainBuildingData,
getSubBuildings,
getWeather,
login,
getGraph

};

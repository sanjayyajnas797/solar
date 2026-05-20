const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ✅ ADD KEEP ALIVE (SPEED BOOST)
const http = require('http');
const https = require("https");

const { getMQTTWeather } = require('./mqtt');

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
  try {
    const token = await getToken();

    const res = await axiosInstance.post(
      `${config.BASE_URL}${url}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // 🔥 SAFETY CHECK
    if (typeof res.data === "string") {
      throw new Error("Invalid API response");
    }

    return res.data;

  } catch (err) {

    if (
      err.response &&
      err.response.data &&
      err.response.data.code === 2101017
    ) {
      console.log("🔄 Token expired, refreshing...");

      TOKEN = null;

      const newToken = await getToken();

      const res = await axiosInstance.post(
        `${config.BASE_URL}${url}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${newToken}`
          }
        }
      );

      return res.data;
    }

    console.log("API ERROR:", err.message);
    throw err;
  }
}
   
async function getWeather(campus){
  return getMQTTWeather(campus);
}


// ================= GET STATIONS =================

async function getStations() {
  try {

    const data = await api(
      "/v1.0/station/list",
      { page: 1, size: 100 }
    );

    return data.stationList || [];

  } catch (err) {

    console.log("Stations failed, using cache");

    return CACHE?.sub || []; // 🔥 fallback

  }
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

    const latest =
        data.deviceDataList?.[0] || null;

   

    return latest;
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

  try {

    const [devices, yesterday] = await Promise.all([
      getDevices(station.id),
      getYesterday(station.id)
    ]);

   const inverters = devices.filter(d =>
  d.deviceType === "INVERTER" ||
  d.deviceType === "INV" ||
  d.deviceType === 1
);


    let mpptData = {};
   let today = 0;
let total = 0;
let currentPower = 0;

let deviceStatus = "OFFLINE";
    let totalMPPTPower = 0; 

    for (let i = 0; i < inverters.length; i++) {

  const latest =
    await getLatest(
      inverters[i].deviceSn
    );

  

  // ✅ REAL CLOUD STATUS
 // ✅ PRIORITY STATUS LOGIC

     if (latest?.deviceState === 3) {

  deviceStatus = "ALERT";

}
else if (latest?.deviceState === 1) {

  deviceStatus = "ONLINE";

}
else {

  deviceStatus = "OFFLINE";

}

      // ================= MPPT (PV1 → PV8) =================
      for (let pv = 1; pv <= 8; pv++) {

        const voltage =
          Number(
            latest?.dataList?.find(d => d.key === `DCVoltagePV${pv}`)?.value || 0
          );

        const current =
          Number(
            latest?.dataList?.find(d => d.key === `DCCurrentPV${pv}`)?.value || 0
          );

        const power = voltage * current; // 🔥 MAIN CALCULATION

        if (voltage > 0 || current > 0) {

          mpptData[`inv${i + 1}_pv${pv}`] = {
            voltage,
            current,
            power: Number(power.toFixed(1))
          };

          totalMPPTPower += power; // 🔥 sum
        }
      }

      // ================= PRODUCTION =================
      today += Number(
        latest?.dataList?.find(d => d.key === "DailyActiveProduction")?.value || 0
      );

      total += Number(
        latest?.dataList?.find(d => d.key === "TotalActiveProduction")?.value || 0
      );

      const powerRaw =
        Number(
          latest?.dataList?.find(d => d.key === "TotalActiveACOutputPower")?.value || 0
        );

      currentPower += (powerRaw / 1000);
    }

    // 🔥 FINAL MPPT kW
    const totalMPPTkW = totalMPPTPower / 1000;

  

    return {
       id: station.id,
  name: station.name,

    status: deviceStatus,
      today: Number(today.toFixed(1)),
      yesterday,
      total: Number(total.toFixed(1)),
      currentPower: Number(currentPower.toFixed(1)),

      // 🔥 THIS IS WHAT MANAGER WANTS
      mpptTotalPower: Number(totalMPPTkW.toFixed(1)),

      mppt: mpptData
    };

  } catch (err) {

    console.log("Building error:", err.message);

    return {
      id: station.id,
      name: station.name,
      today: 0,
      yesterday: 0,
      total: 0,
      currentPower: 0,
      mpptTotalPower: 0,
      mppt: {}
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
async function getGraph(type, stationId, date) {

  try {

    const devices = await getDevices(stationId);

    // ✅ INCLUDE ALL POSSIBLE INVERTERS
    const inverters = devices.filter(d =>
      d.deviceType === "INVERTER" ||
      d.deviceType === "INV" ||
      d.deviceType === 1
    );

    

    if (!inverters.length) return [];

    const now = new Date();

    let startAt, endAt, granularity;
    let measurePoint;

    // ================= TODAY =================
    if (type === "today") {
      startAt = now.toISOString().split("T")[0];
      endAt = startAt;
      granularity = 1;
      measurePoint = "TotalActiveACOutputPower";
    }

    // ================= YESTERDAY =================
    else if (type === "yesterday") {
      const y = new Date();
      y.setDate(now.getDate() - 1);

      startAt = y.toISOString().split("T")[0];
      endAt = startAt;
      granularity = 1;
      measurePoint = "TotalActiveACOutputPower";
    }

    // ================= CUSTOM =================
    else if (type === "custom") {
      startAt = date;
      endAt = date;
      granularity = 1;
      measurePoint = "TotalActiveACOutputPower";
    }

    // ================= MONTH =================
    else {
      const firstDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        1
      );

      startAt = firstDay.toISOString().split("T")[0];
      endAt = now.toISOString().split("T")[0];
      granularity = 2;
      measurePoint = "DailyActiveProduction";
    }

    // 🔥 TIME BASED SUM (VERY IMPORTANT)
    let timeMap = {};

    // ================= LOOP ALL INVERTERS =================
    for (const inv of inverters) {

     

      const result = await api(
        "/v1.0/device/history",
        {
          deviceSn: String(inv.deviceSn),
          startAt,
          endAt,
          granularity,
          measurePoints: [measurePoint]
        }
      );

      const raw = result.dataList || [];

      raw.forEach(item => {

        const time =
          new Date(Number(item.time) * 1000).toISOString();

        const obj =
          item.itemList?.find(i => i.key === measurePoint);

        const power = Number(obj?.value || 0);

        // 🔥 SAME TIME → ADD ALL INVERTERS
        if (!timeMap[time]) {
          timeMap[time] = 0;
        }

        timeMap[time] += power;
      });
    }

    // 🔥 FINAL DATA
    const allData = Object.keys(timeMap).map(time => ({
      time,
      power: timeMap[time]
    }));

    // 🔥 REAL PEAK (ALL INVERTERS COMBINED)
    const maxPower = Math.max(...Object.values(timeMap));

    

    return allData;

  } catch (err) {
    console.log("Graph error:", err.message);
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



}catch(err){

console.log("Background refresh error:", err.message);

}

},60000);




// ================= LAST 10 DAYS =================
async function getLast10DaysData(stationId) {
  try {

    const today = new Date();
    const dates = [];

    for (let i = 9; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);

      dates.push(d.toISOString().split("T")[0]);
    }

    const result = await api(
      "/v1.0/station/history",
      {
        stationId: Number(stationId),
        startAt: dates[0],
        endAt: dates[dates.length - 1],
        granularity: 2
      }
    );

    const raw = result.stationDataItems || [];

    return raw.map(item => ({
      date: item.time,
      value: Number(item.generationValue || 0)
    }));

  } catch (err) {
    console.log("Last10 error:", err.message);
    return [];
  }
}



// ================= EXPORT =================

module.exports={

getMainBuildingData,
getSubBuildings,
getWeather,
login,
getGraph,
 getLast10DaysData

 

};
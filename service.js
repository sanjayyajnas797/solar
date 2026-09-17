const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ✅ ADD KEEP ALIVE (SPEED BOOST)
const http = require('http');
const https = require("https");

const { getMQTTWeather } = require('./mqtt');

const db = require("./db");

const {
    checkInverter
} = require("./alertService");

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

  // ================= FETCH ALL INVERTER LATEST DATA IN PARALLEL =================
const latestResults = await Promise.all(
  inverters.map(inv => getLatest(inv.deviceSn))
);

      for (let i = 0; i < inverters.length; i++) {

  const latest = latestResults[i];

  // =====================================================
// INVERTER ALERT CHECK
// =====================================================

checkInverter({

    stationId: station.id,

    buildingName:
        station.name,

   campus:
    String(station.name).toUpperCase().includes("NLCIL")
        ? "NLCIL"
        : String(station.name).toUpperCase().includes("NLCIC")
            ? "NLCIC"
            : String(station.name).toUpperCase().includes("NTPL")
                ? "NTPL"
                : (
    String(station.name).toUpperCase().includes("NUPPL") ||
    String(station.name).toUpperCase().includes("NUPL")
  )
                    ? "NUPPL"
                    : String(station.name).toUpperCase().includes("BTPS")
                        ? "BTPS"
                        : "OTHERS",

    inverterName:
        `INV-${i + 1}`,

    deviceSn:
        String(inverters[i].deviceSn),

    latest

});

  // =====================================================
  // CHECK LATEST INVERTER DATA FRESHNESS
  // Deye collectionTime is Unix timestamp in seconds
  // =====================================================

  const collectionTime =
    Number(latest?.collectionTime || 0);

  const nowSeconds =
    Math.floor(Date.now() / 1000);

  const dataAge =
    nowSeconds - collectionTime;

  // 2 minutes tolerance
  const isStale =
    collectionTime === 0 ||
    dataAge > 480;




  // =====================================================
  // IF DATA IS STALE
  // DON'T USE OLD INVERTER VALUES
  // =====================================================

  if (isStale) {



    // Do NOT calculate:
    // today
    // currentPower
    // MPPT

    continue;
  }


  // =====================================================
  // DATA IS FRESH → REAL STATUS
  // =====================================================

  if (latest?.deviceState === 3) {

    deviceStatus = "ALERT";

  }
  else if (latest?.deviceState === 1) {

    deviceStatus = "ONLINE";

  }
  else {

    deviceStatus = "OFFLINE";

  }


  // =====================================================
  // MPPT
  // =====================================================

  for (let pv = 1; pv <= 8; pv++) {

    const voltage = Number(
      latest?.dataList?.find(
        d => d.key === `DCVoltagePV${pv}`
      )?.value || 0
    );

    const current = Number(
      latest?.dataList?.find(
        d => d.key === `DCCurrentPV${pv}`
      )?.value || 0
    );

    const power = voltage * current;

    if (voltage > 0 || current > 0) {

      mpptData[`inv${i + 1}_pv${pv}`] = {
        voltage,
        current,
        power: Number(power.toFixed(1))
      };

      totalMPPTPower += power;
    }
  }


  // =====================================================
  // TODAY PRODUCTION
  // =====================================================

  today += Number(
    latest?.dataList?.find(
      d => d.key === "DailyActiveProduction"
    )?.value || 0
  );


  // =====================================================
  // CUMULATIVE
  // =====================================================

  total += Number(
    latest?.dataList?.find(
      d => d.key === "TotalActiveProduction"
    )?.value || 0
  );


  // =====================================================
  // LIVE POWER
  // =====================================================

  const powerRaw = Number(
    latest?.dataList?.find(
      d => d.key === "TotalActiveACOutputPower"
    )?.value || 0
  );

  currentPower += powerRaw / 1000;

}

    

    // ================= CAMPUS FIND =================

    let campus = "OTHERS";

    const upperName = station.name.toUpperCase();

    if (upperName.includes("NLCIL")) {

      campus = "NLCIL";

    }
    else if (upperName.includes("NLCIC")) {

      campus = "NLCIC";

    }
    else if (upperName.includes("NTPL")) {

      campus = "NTPL";

    }
   else if (
    upperName.includes("NUPPL") ||
    upperName.includes("NUPL")
) {

    campus = "NUPPL";

}
    else if (upperName.includes("BTPS")) {

      campus = "BTPS";

    }

    return {

      id: station.id,

      stationId: station.id,   // 👈 NEW

      campus,                  // 👈 NEW

      name: station.name,

      status: deviceStatus,

      today: Number(today.toFixed(1)),

      yesterday,

      total: Number(total.toFixed(1)),

      currentPower: Number(currentPower.toFixed(1)),

     mpptTotalPower: Number(totalMPPTPower.toFixed(1)),

      mppt: mpptData

    };

  }
  catch (err) {

    console.log("Building error:", err.message);

    return {

      id: station.id,

      stationId: station.id,

      campus: "OTHERS",

      name: station.name,

      status: "OFFLINE",

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

    // ================= FETCH ALL INVERTER HISTORY IN PARALLEL =================
const historyResults = await Promise.all(
  inverters.map(inv =>
    api(
      "/v1.0/device/history",
      {
        deviceSn: String(inv.deviceSn),
        startAt,
        endAt,
        granularity,
        measurePoints: [measurePoint]
      }
    )
  )
);

// ================= PROCESS ALL INVERTER RESULTS =================
for (const result of historyResults) {

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

// ================= REPORT DATE RANGE =================

async function getReportData(stationId, fromDate, toDate) {

    try {

        

        let allItems = [];

        let currentStart = new Date(fromDate);
        const finalEnd = new Date(toDate);

        while (currentStart <= finalEnd) {

            let currentEnd = new Date(currentStart);

            // Maximum 31 days
            currentEnd.setDate(currentEnd.getDate() + 30);

            if (currentEnd > finalEnd) {
                currentEnd = new Date(finalEnd);
            }

            const startStr = currentStart.toISOString().split("T")[0];
            const endStr = currentEnd.toISOString().split("T")[0];

         
            const result = await api(
                "/v1.0/station/history",
                {
                    stationId: Number(stationId),
                    startAt: startStr,
                    endAt: endStr,
                    granularity: 2
                }
            );

         

            if (Array.isArray(result.stationDataItems)) {
                allItems.push(...result.stationDataItems);
            }

            currentStart = new Date(currentEnd);
            currentStart.setDate(currentStart.getDate() + 1);

        }

      

        // ================= CREATE LOOKUP =================

        const reportMap = {};

        allItems.forEach(item => {

            const dateKey =
                `${item.year}-${String(item.month).padStart(2, "0")}-${String(item.day).padStart(2, "0")}`;

            reportMap[dateKey] = {

                generation: Number(item.generationValue || 0),

                consumption: Number(item.consumptionValue || 0),

                revenue: Number(item.revenue || 0),

                co2: Number(item.co2Reduction || 0)

            };

        });

        // ================= FINAL REPORT =================

        const report = [];

        let current = new Date(fromDate);
        const end = new Date(toDate);

        while (current <= end) {

            const dateKey = current.toISOString().split("T")[0];

            report.push({

                date: dateKey,

                generation: reportMap[dateKey]?.generation ?? 0,

                consumption: reportMap[dateKey]?.consumption ?? 0,

                revenue: reportMap[dateKey]?.revenue ?? 0,

                co2: reportMap[dateKey]?.co2 ?? 0

            });

            current.setDate(current.getDate() + 1);

        }

       

        return report;

    }
    catch (err) {

        console.log("Report API Error :", err);

        return [];

    }

}

// ================= CAMPUS CONSOLIDATED REPORT =================

async function getCampusReport(campus, fromDate, toDate) {

    try {

        const buildings = await getSubBuildings();

        const campusBuildings = buildings.filter(
            b => b.campus === campus
        );

        // ================= LOAD ALL BUILDINGS PARALLEL =================

        const reports = await Promise.all(

            campusBuildings.map(async (building) => {

                console.log("Loading :", building.name);

                const report = await getReportData(
                    building.stationId,
                    fromDate,
                    toDate
                );

                return {

                    building,
                    report

                };

            })

        );

        // ================= CONSOLIDATE REPORT =================

        const reportMap = {};

        reports.forEach(({ building, report }) => {

            report.forEach(item => {

                if (!reportMap[item.date]) {

                    reportMap[item.date] = {

                        date: item.date,

                        totalGeneration: 0,

                        buildings: {}

                    };

                }

                // Building Wise Generation

                reportMap[item.date].buildings[building.name] =
                    Number(item.generation);

                // Campus Total Generation

                reportMap[item.date].totalGeneration +=
                    Number(item.generation);

            });

        });

        // ================= RETURN SORTED =================

        return Object.values(reportMap).sort(

            (a, b) => new Date(a.date) - new Date(b.date)

        );

    }

    catch (err) {

        console.log("Campus Report Error :", err.message);

        return [];

    }

}

// ================= PGT INVERTER ENERGY =================

async function getPgtInverterEnergy(stationId, date) {

    try {

        // 1. Get devices for this building
        const devices = await getDevices(stationId);

        // 2. Get inverter devices
        const inverters = devices.filter(d =>
            d.deviceType === "INVERTER" ||
            d.deviceType === "INV" ||
            d.deviceType === 1
        );

        if (!inverters.length) {

            console.log(
                "No inverter found for station:",
                stationId
            );

            return [];
        }

        // 3. Get DailyActiveProduction history
        const historyResults = await Promise.all(

            inverters.map(inv =>

                api(
                    "/v1.0/device/history",
                    {
                        deviceSn: String(inv.deviceSn),

                        startAt: date,
                        endAt: date,

                        granularity: 1,

                        measurePoints: [
                            "DailyActiveProduction"
                        ]
                    }
                )

            )
        );

        // 4. Combine inverter data
        const timeMap = {};

        for (const result of historyResults) {

            const raw = result.dataList || [];

            raw.forEach(item => {

                const utcDate =
                    new Date(
                        Number(item.time) * 1000
                    );

                // Convert UTC → IST
                const istDate =
                    new Date(
                        utcDate.getTime() +
                        (5.5 * 60 * 60 * 1000)
                    );

                const datePart =
                    istDate.toISOString()
                        .split("T")[0];

                const hours =
                    String(
                        istDate.getUTCHours()
                    ).padStart(2, "0");

                const minutes =
                    String(
                        istDate.getUTCMinutes()
                    ).padStart(2, "0");

                const time =
                    `${hours}:${minutes}:00`;

                const fullTime =
                    `${datePart} ${time}`;

                const energy =
                    Number(
                        item.itemList?.find(
                            i =>
                                i.key ===
                                "DailyActiveProduction"
                        )?.value || 0
                    );

                if (!timeMap[fullTime]) {
                    timeMap[fullTime] = 0;
                }

                timeMap[fullTime] += energy;

            });

        }

        // 5. Convert to array
       // 5. Convert raw data to array
const rawData =
    Object.keys(timeMap)
        .sort()
        .map(time => ({

            time,

            inverterEnergy:
                Number(
                    timeMap[time]
                        .toFixed(2)
                )

        }));


// 6. Create 15-minute PGT slots
const pgtData = [];


// Start from first available time
if (rawData.length > 0) {

    const firstDate =
        new Date(
            rawData[0].time
                .replace(" ", "T")
        );

    // Round first time down to 15 minutes
    firstDate.setMinutes(
        Math.floor(
            firstDate.getMinutes() / 15
        ) * 15
    );

    firstDate.setSeconds(0);
    firstDate.setMilliseconds(0);


    // Create slots until last available time
    const lastDate =
        new Date(
            rawData[rawData.length - 1].time
                .replace(" ", "T")
        );


    for (
        let slot = new Date(firstDate);
        slot <= lastDate;
        slot.setMinutes(
            slot.getMinutes() + 15
        )
    ) {

        const slotTime =
            new Date(slot);


        // Find nearest Cloud reading
        let nearest = null;
        let minDifference = Infinity;


        for (const row of rawData) {

            const rowTime =
                new Date(
                    row.time.replace(" ", "T")
                );


            const difference =
                Math.abs(
                    rowTime.getTime() -
                    slotTime.getTime()
                );


            if (difference < minDifference) {

                minDifference = difference;
                nearest = row;

            }

        }


        // Accept only if within 5 minutes
        if (
            nearest &&
            minDifference <= 5 * 60 * 1000
        ) {

            const hours =
                String(
                    slotTime.getHours()
                ).padStart(2, "0");


            const minutes =
                String(
                    slotTime.getMinutes()
                ).padStart(2, "0");


            pgtData.push({

                time:
                    `${hours}:${minutes}:00`,

                inverterEnergy:
                    nearest.inverterEnergy

            });

        }

    }

}





return pgtData;

    }
    catch (err) {

        console.log(
            "PGT Inverter History Error:",
            err.message
        );

        return [];

    }
}

// =====================================================
// NLCIL PGT CAPACITY MAP
// =====================================================

function normalizeBuildingName(name = "") {
    return String(name)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");
}


const capacityMap = {

    "NLCILLIBRARY50KWONGRID": 50.85,

    "NLCILEDUCATIONOFFICE": 23.73,

    "NLCILLDCMAINBUILDINGINV225KW": 145.77,

    "NLCILLDCMAINBULIDINGINV1": 145.77,

    "NLCILGIRLSHIGHSCHOOLINV1": 250.86,

    "NLCILGIRLSHIGHSCHOOLINV2": 250.86,

    "NLCILBOYSHIGHSCHOOLINV1": 250.86,

    "NLCILBOYSHIGHSCHOOLINV2": 250.86,

    "NLCILTPS2EXPSWITCHYARD40KW": 36.13,

    "NLCILTPS2SWITCHYARDBUILDINGINV1": 142.38,

    "NLCILTPS2SWITCHYARDBUILDINGINV2": 142.38,

    "NLCILPSTCBUILDING": 123.17,

    "NLCILTPS1EXPCANTEEN": 33.90,

    "NLCILTPS2EXPSCREENHOUSEA": 98.31,

    "NLCILTPS2EXPSCREENHOUSEB": 73.45,

    "NLCILTPS2EXPASHHANDLING": 40,

    "NLCILNNTPSSOFTENINGPLANT": 109.61
};


// =====================================================
// GET CAPACITY
// =====================================================

function getInstalledDcCapacity(buildingName) {

    const key =
        normalizeBuildingName(buildingName);

    const capacity =
        capacityMap[key];

    if (
        capacity === undefined ||
        capacity === null
    ) {

        console.warn(
            "⚠️ PGT CAPACITY NOT FOUND",
            {
                buildingName,
                normalizedKey: key
            }
        );

        return null;
    }

    return Number(capacity);
}


// =====================================================
// GET NLCIL BUILDING FROM DEYE STATION LIST
// =====================================================

async function getNLCILBuildingByStationId(stationId) {

    const stations =
        await getStations();

    const station =
        stations.find(
            s =>
                Number(s.id) ===
                Number(stationId)
        );

    if (!station) {

        throw new Error(
            `Station not found: ${stationId}`
        );
    }

    const buildingName =
        String(
            station.name || ""
        ).trim();

    if (
        !buildingName
            .toUpperCase()
            .includes("NLCIL")
    ) {

        throw new Error(
            `PGT currently allowed only for NLCIL. Station: ${stationId}`
        );
    }

    return {

        stationId:
            station.id,

        name:
            buildingName,

        campus:
            "NLCIL"
    };
}

// =====================================================
// PGT COMBINED REPORT
// =====================================================
async function getPgtReport(
    stationId,
    date,
    fromTime,
    toTime
) {

    try {

        // =================================================
        // 0. GET SELECTED NLCIL BUILDING
        // =================================================

        const station =
            await getNLCILBuildingByStationId(
                stationId
            );

        const buildingName =
            station.name;

        const installedDcCapacity =
            getInstalledDcCapacity(
                buildingName
            );


        if (
            installedDcCapacity === null ||
            installedDcCapacity <= 0
        ) {

            throw new Error(
                `Installed DC capacity not configured for ${buildingName}`
            );
        }


        console.log(
            "PGT SELECTED BUILDING:",
            {
                stationId,
                buildingName,
                installedDcCapacity
            }
        );


        // =================================================
        // 1. GET SELECTED BUILDING INVERTER DATA
        // =================================================

        const inverterData =
            await getPgtInverterEnergy(
                stationId,
                date
            );


        const filteredInverterData =
            inverterData.filter(row => {

                const time =
                    String(
                        row.time || ""
                    ).substring(0, 5);

                return (
                    time >= fromTime &&
                    time <= toTime
                );

            });


        // =================================================
        // 2. GET COMMON GHI / GII / WEATHER DATA
        //
        // SAME WEATHER DATA FOR ALL NLCIL BUILDINGS
        // =================================================

        const { rows } =
            await db.query(
                `
                SELECT

                    to_char(
                        created_at
                            AT TIME ZONE 'Asia/Kolkata',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS time,

                    horizontal_irradiance,

                    inclined_irradiance,

                    temperature,

                    inclined_cumulative

                FROM gii_weather_logs

                WHERE DATE(
                    created_at
                        AT TIME ZONE 'Asia/Kolkata'
                ) = $1::date

                ORDER BY created_at ASC;
                `,
                [date]
            );


        // =================================================
        // 3. CONVERT WEATHER DATA
        // =================================================

        const weatherData =
            rows.map(row => ({

                time:
                    row.time,

                ghi:
                    row.horizontal_irradiance !== null &&
                    row.horizontal_irradiance !== undefined
                        ? Number(
                            row.horizontal_irradiance
                        )
                        : null,

                gii:
                    row.inclined_irradiance !== null &&
                    row.inclined_irradiance !== undefined
                        ? Number(
                            row.inclined_irradiance
                        )
                        : null,

                moduleTemp:
                    row.temperature !== null &&
                    row.temperature !== undefined
                        ? Number(
                            row.temperature
                        )
                        : null,

                inclinedCumulative:
                    row.inclined_cumulative !== null &&
                    row.inclined_cumulative !== undefined
                        ? Number(
                            row.inclined_cumulative
                        )
                        : null

            }));


        // =================================================
        // 4. COMBINE WEATHER + SELECTED INVERTER
        // =================================================

        let previousInverterEnergy =
            null;

        const report = [];


        for (
            const inverterRow
            of filteredInverterData
        ) {

            const targetTime =
                String(
                    inverterRow.time || ""
                ).substring(0, 5);


            // =================================================
            // INVERTER ENERGY INTERVAL
            // =================================================

            let inverterEnergyInterval =
                null;


            if (
                previousInverterEnergy !== null &&
                inverterRow.inverterEnergy !== null &&
                inverterRow.inverterEnergy !== undefined
            ) {

                inverterEnergyInterval =
                    Number(
                        (
                            Number(
                                inverterRow.inverterEnergy
                            ) -
                            Number(
                                previousInverterEnergy
                            )
                        ).toFixed(2)
                    );


                if (
                    inverterEnergyInterval < 0
                ) {

                    inverterEnergyInterval =
                        0;
                }
            }


            previousInverterEnergy =
                inverterRow.inverterEnergy;


            // =================================================
            // FIND NEAREST WEATHER
            // =================================================

            let nearestWeather =
                null;

            let minDifference =
                Infinity;


            const targetParts =
                targetTime.split(":");


            const targetMinutes =
                (
                    Number(targetParts[0]) * 60
                ) +
                Number(targetParts[1]);


            for (
                const weatherRow
                of weatherData
            ) {

                if (!weatherRow.time) {
                    continue;
                }


                const weatherTime =
                    weatherRow.time
                        .split(" ")[1]
                        .substring(0, 5);


                const weatherParts =
                    weatherTime.split(":");


                const weatherMinutes =
                    (
                        Number(
                            weatherParts[0]
                        ) * 60
                    ) +
                    Number(
                        weatherParts[1]
                    );


                const difference =
                    Math.abs(
                        targetMinutes -
                        weatherMinutes
                    );


                if (
                    difference <
                    minDifference
                ) {

                    minDifference =
                        difference;

                    nearestWeather =
                        weatherRow;
                }
            }


            // =================================================
            // WEATHER WITHIN 10 MINUTES
            // =================================================

            if (
                nearestWeather &&
                minDifference <= 10
            ) {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi:
                        nearestWeather.ghi,

                    gii:
                        nearestWeather.gii,

                    moduleTemp:
                        nearestWeather.moduleTemp,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        inverterEnergyInterval,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null
                });

            } else {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi:
                        null,

                    gii:
                        null,

                    moduleTemp:
                        null,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        inverterEnergyInterval,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null
                });
            }
        }

         // =================================================
    // PGT START INDEX
    //
    // FIRST GHI > 750
    // =================================================

    const pgtStartIndex =
        report.findIndex(
            row =>
                row.ghi !== null &&
                row.ghi !== undefined &&
                Number(row.ghi) > 750
        );

 


        // =================================================
        // 5. IRRADIATION INTERVAL
        //
        // ((CURRENT + NEXT) / 2) * 0.25
        // =================================================

        for (
            let i = 0;
            i < report.length - 1;
            i++
        ) {

            const current =
                report[i];

            const next =
                report[i + 1];


            // GHI
       if (
    current.ghi !== null &&
    current.ghi !== undefined &&
    next.ghi !== null &&
    next.ghi !== undefined
) {

                current.ghiIrradiationInterval =
                    Number(
                        (
                            (
                                (
                                    Number(
                                        current.ghi
                                    ) +
                                    Number(
                                        next.ghi
                                    )
                                ) / 2
                            ) * 0.25
                        ).toFixed(2)
                    );
            }


         if (
    current.gii !== null &&
    current.gii !== undefined &&
    next.gii !== null &&
    next.gii !== undefined
) {

                current.giiIrradiationInterval =
                    Number(
                        (
                            (
                                (
                                    Number(
                                        current.gii
                                    ) +
                                    Number(
                                        next.gii
                                    )
                                ) / 2
                            ) * 0.25
                        ).toFixed(2)
                    );
            }
        }


        // =================================================
        // LAST ROW INTERVAL = NULL
        // =================================================

        if (
            report.length > 0
        ) {

            report[
                report.length - 1
            ].ghiIrradiationInterval =
                null;

            report[
                report.length - 1
            ].giiIrradiationInterval =
                null;
        }


        // =================================================
        // 6. TOTAL INVERTER ENERGY INTERVAL
        // =================================================

        const totalInverterEnergyInterval =
            Number(
                report
                    .reduce(
                        (sum, row) =>
                            sum +
                            Number(
                                row.inverterEnergyInterval ||
                                0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 7. PGT START
        //
        // FIRST GHI > 750
        // =================================================



        const pgtStartRow =
            pgtStartIndex >= 0
                ? report[
                    pgtStartIndex
                ]
                : null;


   // =====================================================
// 8. PGT END
//
// FINAL RULE:
//
// 1. Start from PGT START
// 2. Continue checking until selected TO TIME
// 3. If GHI/GII values are missing in between,
//    DO NOT STOP the PGT
// 4. Continue searching for the next actual GHI/GII values
// 5. Low irradiance values like 40, 20, 10 are VALID
// 6. If cumulative GII reaches 5000 Wh/m²:
//       -> CURRENT VALID ROW = PGT END
// 7. If 5000 is NOT reached:
//       -> LAST ACTUAL VALID GHI/GII ROW
//          within selected time range = PGT END
//
// IMPORTANT:
// Missing irradiance in the middle must NOT become PGT END.
// Example:
// 10:00 valid
// 10:15 valid
// 12:00 missing
// 12:15 valid
// 17:45 valid
// 18:00 missing
//
// If 5000 is not reached:
// PGT END = 17:45
//
// =====================================================

let pgtEndIndex = -1;

let pgtCumulativeGii = 0;

let pgtReached5000 = false;


// =====================================================
// START PGT END SEARCH
// =====================================================

if (pgtStartIndex >= 0) {

    for (
        let i = pgtStartIndex;
        i < report.length;
        i++
    ) {

        const row =
            report[i];


        // =================================================
        // CHECK GHI VALID
        // =================================================

        const ghiValid =
            row.ghi !== null &&
            row.ghi !== undefined &&
            row.ghi !== "" &&
            !isNaN(
                Number(row.ghi)
            );


        // =================================================
        // CHECK GII VALID
        // =================================================

        const giiValid =
            row.gii !== null &&
            row.gii !== undefined &&
            row.gii !== "" &&
            !isNaN(
                Number(row.gii)
            );


        // =================================================
        // INVALID / MISSING IRRADIANCE
        //
        // DO NOT STOP
        //
        // Simply skip this row and continue searching
        // for the next actual GHI/GII values.
        // =================================================

        if (
            !ghiValid ||
            !giiValid
        ) {

            continue;
        }


        // =================================================
        // VALID GHI + GII ROW
        //
        // This is the latest actual irradiance row.
        // Therefore keep it as possible PGT END.
        // =================================================

        pgtEndIndex =
            i;


        // =================================================
        // ADD GII IRRADIATION
        // =================================================

        const interval =
            Number(
                row.giiIrradiationInterval || 0
            );


        pgtCumulativeGii +=
            interval;


        // =================================================
        // 5000 Wh/m² REACHED
        //
        // FIRST CONDITION WINS
        // CURRENT ROW = PGT END
        // =================================================

        if (
            pgtCumulativeGii >= 5000
        ) {

            pgtEndIndex =
                i;

            pgtReached5000 =
                true;

            break;
        }
    }
}


// =====================================================
// FINAL PGT END ROW
//
// If 5000 was reached:
//     -> row where 5000 was reached
//
// Otherwise:
//     -> last actual valid GHI/GII row
//        before selected TO TIME
// =====================================================

const pgtEndRow =
    pgtEndIndex >= 0
        ? report[pgtEndIndex]
        : null;



        // =================================================
        // 9. TOTAL GII IRRADIATION
        // =================================================

        const totalPoaIrradiation =
            (
                pgtStartIndex >= 0 &&
                pgtEndIndex >=
                    pgtStartIndex
            )
                ? Number(
                    report
                        .slice(
                            pgtStartIndex,
                            pgtEndIndex + 1
                        )
                        .reduce(
                            (sum, row) =>
                                sum +
                                Number(
                                    row.giiIrradiationInterval ||
                                    0
                                ),
                            0
                        )
                        .toFixed(2)
                )
                : null;


        // =================================================
        // 10. INITIAL INVERTER ENERGY
        // =================================================

        const initialInverterEnergy =
            pgtStartRow &&
            pgtStartRow.inverterEnergy !== null &&
            pgtStartRow.inverterEnergy !== undefined

                ? Number(
                    Number(
                        pgtStartRow.inverterEnergy
                    ).toFixed(2)
                )

                : null;


        // =================================================
        // 11. FINAL INVERTER ENERGY
        //
        // LAST VALID GHI/GII ROW
        // =================================================

        const finalInverterEnergy =
            pgtEndRow &&
            pgtEndRow.inverterEnergy !== null &&
            pgtEndRow.inverterEnergy !== undefined

                ? Number(
                    Number(
                        pgtEndRow.inverterEnergy
                    ).toFixed(2)
                )

                : null;


        // =================================================
        // 12. START / END DATETIME
        // =================================================

        const testStartDateTime =
            pgtStartRow
                ? `${date} ${pgtStartRow.time}`
                : null;


        const testEndDateTime =
            pgtEndRow
                ? `${date} ${pgtEndRow.time}`
                : null;


        // =================================================
        // 13. REFERENCE YIELD
        //
        // TOTAL GII / 1000
        // =================================================

        const referenceYield =
            totalPoaIrradiation !== null

                ? Number(
                    (
                        totalPoaIrradiation /
                        1000
                    ).toFixed(5)
                )

                : null;


        // =================================================
        // 14. TOTAL AC ENERGY GENERATED
        //
        // FINAL - INITIAL
        // =================================================

        const totalAcEnergyGenerated =
            initialInverterEnergy !== null &&
            finalInverterEnergy !== null

                ? Number(
                    (
                        finalInverterEnergy -
                        initialInverterEnergy
                    ).toFixed(2)
                )

                : null;


        // =================================================
        // 15. DIFFERENTIAL ENERGY
        //
        // MANUAL NET METER DIFFERENCE
        // DEFAULT = 0
        // =================================================

        const differentialEnergy =
            0;


        // =================================================
        // 16. FINAL YIELD
        //
        // (TOTAL AC - DIFFERENTIAL)
        // /
        // SELECTED BUILDING CAPACITY
        // =================================================

        const finalYield =
            totalAcEnergyGenerated !== null

                ? Number(
                    (
                        (
                            totalAcEnergyGenerated -
                            differentialEnergy
                        ) /
                        installedDcCapacity
                    ).toFixed(3)
                )

                : null;


        // =================================================
        // 17. PERFORMANCE RATIO
        //
        // FINAL YIELD / REFERENCE YIELD * 100
        // =================================================

        const performanceRatio =
            finalYield !== null &&
            referenceYield !== null &&
            referenceYield !== 0

                ? Number(
                    (
                        (
                            finalYield /
                            referenceYield
                        ) * 100
                    ).toFixed(2)
                )

                : null;


        // =================================================
        // 18. GUARANTEED PR
        // =================================================

        const guaranteedPr =
            75;


        // =================================================
        // 19. PASS / FAIL
        // =================================================

        const pgtResult =
            performanceRatio !== null

                ? (
                    performanceRatio >=
                    guaranteedPr

                        ? "PASS"

                        : "FAIL"
                )

                : "PENDING";


        // =================================================
        // 20. TOTAL POA kWh/m²
        // =================================================

        const totalPoaKwh =
            totalPoaIrradiation !== null

                ? Number(
                    (
                        totalPoaIrradiation /
                        1000
                    ).toFixed(5)
                )

                : null;


        // =================================================
        // LOG
        // =================================================

        console.log(
            "PGT CALCULATION:",
            {
                stationId,
                buildingName,
                installedDcCapacity,
                pgtStartIndex,
                pgtEndIndex,
                testStartDateTime,
                testEndDateTime,
                totalPoaIrradiation,
                totalPoaKwh,
                initialInverterEnergy,
                finalInverterEnergy,
                totalAcEnergyGenerated,
                differentialEnergy,
                referenceYield,
                finalYield,
                performanceRatio,
                guaranteedPr,
                pgtResult
            }
        );


        // =================================================
        // FINAL RESPONSE
        // =================================================

        return {

            station: {

                stationId:
                    Number(stationId),

                buildingName:
                    buildingName,

                campus:
                    "NLCIL",

                installedDcCapacity:
                    installedDcCapacity
            },


            rows:
                report,


            totals: {

                inverterEnergyInterval:
                    totalInverterEnergyInterval,

                netExportEnergyInterval:
                    null,

                poaIrradiationInterval:
                    totalPoaIrradiation
            },


            pgtCalculation: {

                buildingName:
                    buildingName,

                stationId:
                    Number(stationId),

                installedDcCapacity:
                    installedDcCapacity,

                testStartDateTime:
                    testStartDateTime,

                testEndDateTime:
                    testEndDateTime,

                totalPoaIrradiation:
                    totalPoaKwh,

                initialInverterEnergy:
                    initialInverterEnergy,

                finalInverterEnergy:
                    finalInverterEnergy,

                totalAcEnergyGenerated:
                    totalAcEnergyGenerated,

                differentialEnergy:
                    differentialEnergy,

                referenceYield:
                    referenceYield,

                finalYield:
                    finalYield,

                performanceRatio:
                    performanceRatio,

                guaranteedPr:
                    guaranteedPr,

                pgtResult:
                    pgtResult
            }

        };

    }

    catch (err) {

        console.error(
            "PGT Report Error:",
            err
        );

        throw err;
    }
}


// =====================================================
// GET ALL NLCIL BUILDINGS FOR PGT
// =====================================================

async function getNLCILPgtStations() {

    try {

        const stations = await getStations();

        const result = stations
            .filter(station => {

                const name =
                    String(station.name || "").trim();

                return name
                    .toUpperCase()
                    .includes("NLCIL");
            })
            .map(station => ({

                stationId:
                    Number(station.id),

                buildingName:
                    String(station.name || "").trim(),

                campus:
                    "NLCIL",

                installedDcCapacity:
                    getInstalledDcCapacity(
                        String(station.name || "").trim()
                    )
            }))
            .filter(station =>
                station.installedDcCapacity !== null &&
                station.installedDcCapacity > 0
            );

     
        return result;

    }
    catch (err) {

        console.error(
            "PGT NLCIL STATIONS ERROR:",
            err.message
        );

        throw err;
    }
}

// =====================================================
// NUPPL PGT CAPACITY MAP
// =====================================================

function normalizeBuildingName(name = "") {

    return String(name)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "");

}


const nupplCapacityMap = {

    // ================================================
    // STATE OFFICE / STORE / OTHER BUILDINGS
    // ================================================

    "NUPPLESTATEOFFICE": 30.51,

    "NUPPLESTATESTORE": 10.17,

    "NUPPLSCHOOL40KW": 40,

    "NUPPLSCHOOL100KW": 100,

    "NUPPLGENERALHOSPITAL": 122.04,

    "NUPPLTRAININGCENTER": 80.23,


    // ================================================
    // TYPE 3 BLOCKS
    // ================================================

    "NUPPLTYPE3BLOCK1": 25,

    "NUPPLTYPE3BLOCK2": 25,

    "NUPPLTYPE3BLOCK3": 25,

    "NUPPLTYPE3BLOCK4": 25,

    "NUPPLTYPE3BLOCK5": 25,


    // ================================================
    // TYPE 4 BLOCKS
    // ================================================

    "NUPPLTYPE4BLOCK825KW": 26.54,

    "NUPPLTYPE4BLOCK925KW": 26.54,

    "NUPPLTYPE4BLOCK1125KW": 26.54,

    "NUPPLTYPE4BLOCK10": 26.54,

    "NUPPLTYPE4BLOCK7": 26.54,

    "NUPPLTYPE4BLOCK225KW": 26.54,

    "NUPPLTYPE4BLOCK125KW": 26.54,

    "NUPPLTYPE4BLOCK325KW": 26.54,

    "NUPPLTYPE4BLOCK4": 26.54,

    "NUPPLTYPE4BLOCK6": 26.54,

   "NUPLTYPE4BLOCK5": 25.99,
"NUPPLTYPE4BLOCK5": 25.99

};

function getNUPPLInstalledDcCapacity(buildingName) {

    const key = normalizeBuildingName(buildingName);

    // ================================
    // NUPPL TYPE-4 BLOCKS
    // ================================
    if (key.includes("NUPPLTYPE4BLOCK") || key.includes("NUPLTYPE4BLOCK")) {

        // BLOCK 5
        if (key.includes("BLOCK5")) {
            return 25.99;
        }

        // BLOCK 1 to 11 - except BLOCK 5
        const match = key.match(/TYPE4BLOCK(\d+)/);

        if (match) {
            const blockNo = Number(match[1]);

            if (blockNo >= 1 && blockNo <= 11) {
                return 26.54;
            }
        }
    }

    // ================================
    // EXISTING CAPACITY MAP
    // ================================
    const capacity = nupplCapacityMap[key];

    if (
        capacity === undefined ||
        capacity === null
    ) {
        console.warn(
            "⚠️ NUPPL PGT CAPACITY NOT FOUND",
            {
                buildingName,
                normalizedKey: key
            }
        );

        return null;
    }

    return Number(capacity);
}

// =====================================================
// GET ALL NUPPL STATIONS
// =====================================================

async function getNUPPLStations() {

    const buildings = await getSubBuildings();

    const nupplStations =
        buildings.filter(
            building =>
                String(building.campus || "")
                    .toUpperCase() === "NUPPL"
        );

    if (!nupplStations.length) {

        throw new Error(
            "No NUPPL stations found"
        );

    }

  

    return nupplStations;
}


// =====================================================
// NUPPL PGT COMBINED REPORT
// =====================================================
async function getNUPPLPgtReport(
    date,
    fromTime,
    toTime,
    selectedStationId = null
) {

    try {

        console.log(
            "========================================"
        );

        console.log(
            "NUPPL PGT REPORT START"
        );

      

    


        // =================================================
        // 1. GET ALL NUPPL STATIONS
        // =================================================

        const nupplStations =
            await getNUPPLStations();

            // =====================================================
// SELECTED BUILDING
// If stationId is provided, process ONLY that building.
// If stationId is null, keep existing consolidated logic.
// =====================================================

let reportStations =
    nupplStations;

if (selectedStationId) {

    reportStations =
        nupplStations.filter(
            building =>
                Number(
                    building.stationId ||
                    building.id
                ) ===
                Number(selectedStationId)
        );

    if (!reportStations.length) {

        throw new Error(
            `NUPPL station not found: ${selectedStationId}`
        );

    }

}

            // =====================================================
// GET CAPACITY FOR EACH NUPPL STATION
// =====================================================

const nupplStationDetails =
    reportStations.map(
        building => {

            const stationId =
                Number(
                    building.stationId ||
                    building.id
                );


            const buildingName =
                String(
                    building.name || ""
                ).trim();


            const installedDcCapacity =
                getNUPPLInstalledDcCapacity(
                    buildingName
                );


            if (
                installedDcCapacity === null ||
                installedDcCapacity <= 0
            ) {

                throw new Error(
                    `NUPPL Installed DC capacity not configured for ${buildingName}`
                );

            }


            return {

                stationId,

                buildingName,

                campus:
                    "NUPPL",

                installedDcCapacity

            };

        }
    );


// =====================================================
// TOTAL NUPPL INSTALLED CAPACITY
// =====================================================

const totalNUPPLInstalledDcCapacity =
    Number(
        nupplStationDetails
            .reduce(
                (
                    sum,
                    station
                ) =>
                    sum +
                    station.installedDcCapacity,
                0
            )
            .toFixed(2)
    );





        // =================================================
        // 2. GET INVERTER DATA FOR ALL NUPPL STATIONS
        // =================================================

      const stationReports =
    await Promise.all(
        reportStations.map(
                    async building => {

                        const stationId =
                            Number(
                                building.stationId ||
                                building.id
                            );

                      

                        const data =
                            await getPgtInverterEnergy(
                                stationId,
                                date
                            );

                        return {
                            stationId,
                            buildingName:
                                building.name,
                            data
                        };

                    }
                )

            );


        // =================================================
        // 3. COMBINE ALL NUPPL INVERTERS
        // =================================================
        //
        // Same timestamp from all NUPPL buildings
        // will be summed.
        //
        // Example:
        //
        // Block-1   10.25 kWh
        // Block-2   11.10 kWh
        // Block-3    9.80 kWh
        // ...
        //
        // NUPPL TOTAL = sum
        //
        // =================================================

        const combinedTimeMap = {};


        for (
            const stationReport
            of stationReports
        ) {

            for (
                const row
                of stationReport.data
            ) {

                if (
                    !row ||
                    !row.time
                ) {
                    continue;
                }


                const time =
                    String(row.time)
                        .substring(0, 5);


                // Only selected time range
                if (
                    time < fromTime ||
                    time > toTime
                ) {
                    continue;
                }


                const energy =
                    Number(
                        row.inverterEnergy
                    );


                if (
                    !Number.isFinite(
                        energy
                    )
                ) {
                    continue;
                }


                if (
                    !combinedTimeMap[time]
                ) {
                    combinedTimeMap[time] = 0;
                }


                combinedTimeMap[time] +=
                    energy;

            }

        }


        // =================================================
        // 4. SORT COMBINED INVERTER DATA
        // =================================================

        const combinedInverterData =
            Object.keys(
                combinedTimeMap
            )
                .sort()
                .map(time => ({

                    time:
                        `${date} ${time}:00`,

                    inverterEnergy:
                        Number(
                            combinedTimeMap[time]
                        .toFixed(2)
                        )

                }));


      

        // =================================================
        // 5. GET NUPPL WEATHER DATA
        // =================================================
        //
        // IMPORTANT:
        // NUPPL uses NUPPL weather_logs.
        //
        // NOT gii_weather_logs.
        //
        // Param_1 -> GHI
        // Param_3 -> GII
        //
        // =================================================

        const weatherResult =
            await db.query(
                `
                SELECT

                    to_char(
                        created_at
                            AT TIME ZONE 'Asia/Kolkata',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS time,

                    irradiance,

                    temperature,

                    inclined_irradiance,

                    cumulative_irradiance,

                    inclined_cumulative

                FROM weather_logs

                WHERE campus = 'NUPPL'

                AND DATE(
                    created_at
                        AT TIME ZONE 'Asia/Kolkata'
                ) = $1::date

                ORDER BY created_at ASC
                `,
                [date]
            );


        const weatherData =
            weatherResult.rows.map(
                row => ({

                    time:
                        row.time,

                    ghi:
                        row.irradiance !== null &&
                        row.irradiance !== undefined
                            ? Number(
                                row.irradiance
                            )
                            : null,

                    gii:
                        row.inclined_irradiance !== null &&
                        row.inclined_irradiance !== undefined
                            ? Number(
                                row.inclined_irradiance
                            )
                            : null,

                    moduleTemp:
                        row.temperature !== null &&
                        row.temperature !== undefined
                            ? Number(
                                row.temperature
                            )
                            : null,

                    cumulative:
                        row.cumulative_irradiance !== null &&
                        row.cumulative_irradiance !== undefined
                            ? Number(
                                row.cumulative_irradiance
                            )
                            : null,

                    inclinedCumulative:
                        row.inclined_cumulative !== null &&
                        row.inclined_cumulative !== undefined
                            ? Number(
                                row.inclined_cumulative
                            )
                            : null

                })
            );


      


        // =================================================
        // 6. COMBINE INVERTER + WEATHER
        // =================================================

        const report = [];


        for (
            const inverterRow
            of combinedInverterData
        ) {

            const targetTime =
                String(
                    inverterRow.time
                ).substring(11, 16);


            const targetMinutes =
                (
                    Number(
                        targetTime
                            .split(":")[0]
                    ) * 60
                )
                +
                Number(
                    targetTime
                        .split(":")[1]
                );


            let nearestWeather =
                null;

            let minDifference =
                Infinity;


            // =================================================
            // FIND NEAREST NUPPL WEATHER
            // =================================================

            for (
                const weatherRow
                of weatherData
            ) {

                if (
                    !weatherRow.time
                ) {
                    continue;
                }


                const weatherTime =
                    weatherRow.time
                        .split(" ")[1]
                        .substring(0, 5);


                const weatherParts =
                    weatherTime.split(":");


                const weatherMinutes =
                    (
                        Number(
                            weatherParts[0]
                        ) * 60
                    )
                    +
                    Number(
                        weatherParts[1]
                    );


                const difference =
                    Math.abs(
                        targetMinutes -
                        weatherMinutes
                    );


                if (
                    difference <
                    minDifference
                ) {

                    minDifference =
                        difference;

                    nearestWeather =
                        weatherRow;

                }

            }


            // =================================================
            // WEATHER WITHIN 10 MINUTES
            // =================================================

            if (
                nearestWeather &&
                minDifference <= 10
            ) {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi:
                        nearestWeather.ghi,

                    gii:
                        nearestWeather.gii,

                    moduleTemp:
                        nearestWeather.moduleTemp,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        null,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null

                });

            }
            else {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi:
                        null,

                    gii:
                        null,

                    moduleTemp:
                        null,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        null,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null

                });

            }

        }


        // =================================================
        // 7. INVERTER ENERGY INTERVAL
        // =================================================

        let previousInverterEnergy =
            null;


        for (
            const row
            of report
        ) {

            if (
                previousInverterEnergy !== null &&
                row.inverterEnergy !== null &&
                row.inverterEnergy !== undefined
            ) {

                row.inverterEnergyInterval =
                    Number(
                        (
                            Number(
                                row.inverterEnergy
                            )
                            -
                            Number(
                                previousInverterEnergy
                            )
                        ).toFixed(2)
                    );


                // Meter reset protection
                if (
                    row.inverterEnergyInterval < 0
                ) {

                    row.inverterEnergyInterval =
                        0;

                }

            }


            previousInverterEnergy =
                row.inverterEnergy;

        }


        // =================================================
        // 8. IRRADIATION INTERVAL
        //
        // ((CURRENT + NEXT) / 2) * 0.25
        //
        // SAME FORMULA AS EXISTING PGT
        // =================================================

        for (
            let i = 0;
            i < report.length - 1;
            i++
        ) {

            const current =
                report[i];

            const next =
                report[i + 1];


            // =================================================
            // GHI INTERVAL
            // =================================================

            if (
                current.ghi !== null &&
                current.ghi !== undefined &&
                next.ghi !== null &&
                next.ghi !== undefined
            ) {

                current.ghiIrradiationInterval =
                    Number(
                        (
                            (
                                Number(
                                    current.ghi
                                )
                                +
                                Number(
                                    next.ghi
                                )
                            ) / 2
                            * 0.25
                        ).toFixed(2)
                    );

            }


            // =================================================
            // GII INTERVAL
            // =================================================

            if (
                current.gii !== null &&
                current.gii !== undefined &&
                next.gii !== null &&
                next.gii !== undefined
            ) {

                current.giiIrradiationInterval =
                    Number(
                        (
                            (
                                Number(
                                    current.gii
                                )
                                +
                                Number(
                                    next.gii
                                )
                            ) / 2
                            * 0.25
                        ).toFixed(2)
                    );

            }

        }


        // =================================================
        // LAST ROW INTERVAL = NULL
        // =================================================

        if (
            report.length > 0
        ) {

            report[
                report.length - 1
            ].ghiIrradiationInterval =
                null;


            report[
                report.length - 1
            ].giiIrradiationInterval =
                null;

        }


        // =================================================
        // 9. TOTAL INVERTER ENERGY INTERVAL
        // =================================================

        const totalInverterEnergyInterval =
            Number(
                report
                    .reduce(
                        (
                            sum,
                            row
                        ) =>
                            sum +
                            Number(
                                row.inverterEnergyInterval ||
                                0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 10. PGT START
        //
        // FIRST GHI > 750
        // =================================================

        const pgtStartIndex =
            report.findIndex(
                row =>
                    row.ghi !== null &&
                    row.ghi !== undefined &&
                    Number(row.ghi) > 750
            );


        const pgtStartRow =
            pgtStartIndex >= 0
                ? report[
                    pgtStartIndex
                ]
                : null;

// =====================================================
// 11. PGT END
//
// FINAL NUPPL PGT END RULE:
//
// 1. Start from PGT START
// 2. Continue until selected TO TIME
// 3. Missing GHI/GII in the middle
//    must NOT stop the PGT
// 4. Continue searching for next valid GHI/GII row
// 5. Low irradiance values like 40, 20, 10
//    are VALID
// 6. If cumulative GII reaches 5000 Wh/m²:
//       -> CURRENT VALID ROW = PGT END
// 7. If 5000 is NOT reached:
//       -> LAST VALID GHI/GII ROW = PGT END
//
// Example:
//
// 11:30  valid
// 11:45  valid
// 12:00  missing
// 12:15  valid
// 12:30  valid
// ...
// 17:45  valid
// 18:00  missing
//
// If 5000 is not reached:
//
// PGT END = 17:45
//
// =====================================================

let pgtEndIndex =
    -1;

let pgtCumulativeGii =
    0;

let pgtReached5000 =
    false;


// =====================================================
// START PGT END SEARCH
// =====================================================

if (
    pgtStartIndex >= 0
) {

    for (
        let i =
            pgtStartIndex;

        i < report.length;

        i++
    ) {

        const row =
            report[i];


        // =================================================
        // CHECK GHI VALID
        // =================================================

        const ghiValid =
            row.ghi !== null &&
            row.ghi !== undefined &&
            row.ghi !== "" &&
            !isNaN(
                Number(
                    row.ghi
                )
            );


        // =================================================
        // CHECK GII VALID
        // =================================================

        const giiValid =
            row.gii !== null &&
            row.gii !== undefined &&
            row.gii !== "" &&
            !isNaN(
                Number(
                    row.gii
                )
            );


        // =================================================
        // MISSING GHI / GII
        //
        // DO NOT STOP
        //
        // Just skip this row and continue.
        // =================================================

        if (
            !ghiValid ||
            !giiValid
        ) {

            continue;

        }


        // =================================================
        // VALID GHI + GII
        //
        // Keep this as latest possible PGT END.
        // =================================================

        pgtEndIndex =
            i;


        // =================================================
        // ADD GII IRRADIATION
        // =================================================

        const interval =
            Number(
                row.giiIrradiationInterval || 0
            );


        pgtCumulativeGii +=
            interval;


        // =================================================
        // 5000 Wh/m² REACHED
        //
        // CURRENT VALID ROW = PGT END
        // =================================================

        if (
            pgtCumulativeGii >= 5000
        ) {

            pgtEndIndex =
                i;

            pgtReached5000 =
                true;

            break;
        }

    }

}


// =====================================================
// FINAL PGT END ROW
//
// 5000 reached:
//     -> row where cumulative GII reaches 5000
//
// 5000 NOT reached:
//     -> last actual valid GHI/GII row
//        within selected TO TIME
// =====================================================

const pgtEndRow =
    pgtEndIndex >= 0
        ? report[
            pgtEndIndex
        ]
        : null;
        // =================================================
        // 12. LIMIT REPORT CALCULATION TO PGT RANGE
        // =================================================

        let pgtReport =
            report;


        if (
            pgtStartIndex >= 0 &&
            pgtEndIndex >= pgtStartIndex
        ) {

            pgtReport =
                report.slice(
                    pgtStartIndex,
                    pgtEndIndex + 1
                );

        }


        // =================================================
        // 13. TOTAL GII IRRADIATION
        //
        // SUM OF GII INTERVAL
        // =================================================

        const totalPoaIrradiation =
            Number(
                pgtReport
                    .reduce(
                        (
                            sum,
                            row
                        ) =>
                            sum +
                            Number(
                                row.giiIrradiationInterval ||
                                0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 14. INITIAL INVERTER ENERGY
        // =================================================

        const initialInverterEnergy =
            pgtStartRow &&
            pgtStartRow.inverterEnergy !== null &&
            pgtStartRow.inverterEnergy !== undefined
                ? Number(
                    Number(
                        pgtStartRow.inverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 15. FINAL INVERTER ENERGY
        // =================================================

        const finalInverterEnergy =
            pgtEndRow &&
            pgtEndRow.inverterEnergy !== null &&
            pgtEndRow.inverterEnergy !== undefined
                ? Number(
                    Number(
                        pgtEndRow.inverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 16. TEST START / END
        // =================================================

        const testStartDateTime =
            pgtStartRow
                ? `${date} ${pgtStartRow.time}`
                : null;


        const testEndDateTime =
            pgtEndRow
                ? `${date} ${pgtEndRow.time}`
                : null;


        // =================================================
        // 17. TOTAL AC ENERGY
        //
        // FINAL - INITIAL
        // =================================================

        const totalAcEnergyGenerated =
            initialInverterEnergy !== null &&
            finalInverterEnergy !== null
                ? Number(
                    (
                        finalInverterEnergy -
                        initialInverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 18. DIFFERENTIAL ENERGY
        //
        // Net meter not currently available
        // DEFAULT = 0
        // =================================================

        const differentialEnergy =
            0;


        // =================================================
        // 19. REFERENCE YIELD
        //
        // TOTAL GII / 1000
        // =================================================

        const referenceYield =
            Number(
                (
                    totalPoaIrradiation /
                    1000
                ).toFixed(5)
            );


     // =====================================================
// FINAL YIELD
//
// (TOTAL AC ENERGY - DIFFERENTIAL ENERGY)
// / TOTAL NUPPL INSTALLED DC CAPACITY
// =====================================================

const finalYield =
    totalAcEnergyGenerated !== null &&
    totalNUPPLInstalledDcCapacity > 0

        ? Number(
            (
                (
                    totalAcEnergyGenerated -
                    differentialEnergy
                )
                /
                totalNUPPLInstalledDcCapacity
            ).toFixed(3)
        )

        : null;


        // =================================================
        // 21. PERFORMANCE RATIO
        //
        // FINAL YIELD / REFERENCE YIELD * 100
        // =================================================

        const performanceRatio =
            finalYield !== null &&
            referenceYield !== null &&
            referenceYield !== 0
                ? Number(
                    (
                        (
                            finalYield /
                            referenceYield
                        )
                        * 100
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 22. GUARANTEED PR
        // =================================================

        const guaranteedPr =
            75;


        // =================================================
        // 23. PASS / FAIL
        // =================================================

        const pgtResult =
            performanceRatio !== null
                ? (
                    performanceRatio >=
                    guaranteedPr
                        ? "PASS"
                        : "FAIL"
                )
                : "PENDING";


        // =================================================
        // 24. TOTAL POA kWh/m²
        // =================================================

        const totalPoaKwh =
            Number(
                (
                    totalPoaIrradiation /
                    1000
                ).toFixed(5)
            );


            const selectedStationDetails =
    nupplStationDetails[0];

const responseStationId =
    selectedStationId
        ? Number(selectedStationId)
        : "NUPPL";

const responseBuildingName =
    selectedStationId
        ? selectedStationDetails.buildingName
        : "NUPPL RTS";

        // =================================================
        // LOG
        // =================================================

       

        // =================================================
        // FINAL RESPONSE
        // =================================================

        return {

        station: {
    stationId:
        responseStationId,

    buildingName:
        responseBuildingName,

    campus:
        "NUPPL",

    installedDcCapacity:
        totalNUPPLInstalledDcCapacity
},

// =====================================================
// EACH NUPPL STATION CAPACITY
// =====================================================



            // =================================================
            // ALL REPORT ROWS
            // =================================================

            rows:
                report,


            // =================================================
            // PGT ONLY ROWS
            // =================================================

           


            // =================================================
            // TOTALS
            // =================================================

            totals: {

                inverterEnergyInterval:
                    totalInverterEnergyInterval,

                netExportEnergyInterval:
                    null,

                poaIrradiationInterval:
                    totalPoaIrradiation

            },


            // =================================================
            // PGT CALCULATION
            // =================================================

           pgtCalculation: {

    buildingName:
        responseBuildingName,

    stationId:
        responseStationId,

    installedDcCapacity:
        totalNUPPLInstalledDcCapacity,

                testStartDateTime,

                testEndDateTime,

                totalPoaIrradiation:
                    totalPoaKwh,

                initialInverterEnergy,

                finalInverterEnergy,

                totalAcEnergyGenerated,

                differentialEnergy,

                referenceYield,

                finalYield,

                performanceRatio,

                guaranteedPr,

                pgtResult

            }

        };

    }
    catch (err) {

        console.error(
            "NUPPL PGT Report Error:",
            err
        );

        throw err;

    }

}

// =====================================================
// GET ALL NUPPL BUILDINGS FOR PGT DROPDOWN
// =====================================================

async function getNUPPLPgtStations() {

    try {

        const stations =
            await getNUPPLStations();
            

        const result =
            stations.map(building => {

                const stationId =
                    Number(
                        building.stationId ||
                        building.id
                    );

                const buildingName =
                    String(
                        building.name || ""
                    ).trim();

                const installedDcCapacity =
                    getNUPPLInstalledDcCapacity(
                        buildingName
                    );

                return {
                    stationId,
                    buildingName,
                    campus: "NUPPL",
                    installedDcCapacity
                };

            })
            .filter(station =>
                station.installedDcCapacity !== null &&
                station.installedDcCapacity > 0
            );

        return result;

    }
    catch (err) {

        console.error(
            "PGT NUPPL STATIONS ERROR:",
            err.message
        );

        throw err;

    }

}

// =====================================================
// NLCIL PGT SUMMARY REPORT
// =====================================================
// Returns all NLCIL buildings with Performance Ratio
// =====================================================

async function getNLCILPgtSummary(
    date,
    fromTime,
    toTime
) {
    try {

        console.log(
            "========================================"
        );

        console.log(
            "NLCIL PGT SUMMARY REPORT START"
        );

        // =================================================
        // 1. GET ALL NLCIL BUILDINGS
        // =================================================

        const stations =
            await getNLCILPgtStations();


        // =================================================
        // 2. CALCULATE PGT FOR ALL BUILDINGS
        // =================================================

        const results =
            await Promise.allSettled(

                stations.map(
                    async (station) => {

                        try {

                            const report =
                                await getPgtReport(
                                    station.stationId,
                                    date,
                                    fromTime,
                                    toTime
                                );


                            const calculation =
                                report?.pgtCalculation;


                          return {
    buildingName:
        station.buildingName,

    performanceRatio:
        calculation?.performanceRatio
        ?? null
};

                        }
                        catch (err) {

                            console.error(
                                "NLCIL SUMMARY BUILDING ERROR:",
                                station.buildingName,
                                err.message
                            );


                           return {
    buildingName:
        station.buildingName,

    performanceRatio:
        null
};

                        }

                    }
                )

            );


        // =================================================
        // 3. CONVERT RESULTS
        // =================================================

        const summary =
            results.map(
                result => {

                    if (
                        result.status ===
                        "fulfilled"
                    ) {

                        return result.value;

                    }


                    return {
    buildingName:
        "Unknown",

    performanceRatio:
        null
};

                }
            );


        // =================================================
        // 4. SORT BY BUILDING NAME
        // =================================================

        summary.sort(
            (a, b) =>
                String(
                    a.buildingName
                ).localeCompare(
                    String(
                        b.buildingName
                    )
                )
        );


        // =================================================
        // 5. FINAL RESPONSE
        // =================================================

        return {

            campus:
                "NLCIL",

            date,

            fromTime,

            toTime,

            guaranteedPr:
                75,

            totalBuildings:
                summary.length,

            buildings:
                summary

        };

    }
    catch (err) {

        console.error(
            "NLCIL PGT SUMMARY ERROR:",
            err
        );

        throw err;

    }
}


// =====================================================
// NUPPL PGT SUMMARY REPORT
// =====================================================
// Returns ALL NUPPL buildings with Performance Ratio
// =====================================================

async function getNUPPLPgtSummary(
    date,
    fromTime,
    toTime
) {
    try {

        console.log(
            "========================================"
        );

        console.log(
            "NUPPL PGT SUMMARY REPORT START"
        );


        // =================================================
        // 1. GET ALL NUPPL BUILDINGS
        // =================================================

        const stations =
            await getNUPPLPgtStations();


        // =================================================
        // 2. CALCULATE PGT FOR EACH BUILDING
        // =================================================

        const results =
            await Promise.allSettled(

                stations.map(
                    async (station) => {

                        try {

                            const report =
                                await getNUPPLPgtReport(
                                    date,
                                    fromTime,
                                    toTime,
                                    station.stationId
                                );


                            const calculation =
                                report?.pgtCalculation;


                            return {

                                stationId:
                                    station.stationId,

                                buildingName:
                                    station.buildingName,

                                performanceRatio:
                                    calculation?.performanceRatio
                                    ?? null

                            };

                        }
                        catch (err) {

                            console.error(
                                "NUPPL SUMMARY BUILDING ERROR:",
                                station.buildingName,
                                err.message
                            );


                            return {

                                stationId:
                                    station.stationId,

                                buildingName:
                                    station.buildingName,

                                performanceRatio:
                                    null

                            };

                        }

                    }
                )

            );


        // =================================================
        // 3. CONVERT RESULTS
        // =================================================

        const summary =
            results.map(
                result => {

                    if (
                        result.status ===
                        "fulfilled"
                    ) {

                        return result.value;

                    }


                    return {

                        stationId:
                            null,

                        buildingName:
                            "Unknown",

                        performanceRatio:
                            null

                    };

                }
            );


        // =================================================
        // 4. SORT BY BUILDING NAME
        // =================================================

        summary.sort(
            (a, b) =>
                String(
                    a.buildingName
                ).localeCompare(
                    String(
                        b.buildingName
                    )
                )
        );


        // =================================================
        // 5. FINAL RESPONSE
        // =================================================

        return {

            campus:
                "NUPPL",

            date,

            fromTime,

            toTime,

            guaranteedPr:
                75,

            totalBuildings:
                summary.length,

            buildings:
                summary

        };

    }
    catch (err) {

        console.error(
            "NUPPL PGT SUMMARY ERROR:",
            err
        );

        throw err;

    }
}

// =====================================================
// BTPS PGT CAPACITY MAP
// =====================================================

const btpsCapacityMap = {

    "NLCBTPSOHCBUILDING25KW": 23.73,

    "NLCBTPSOFFICERSCLUB": 27.12,

    "NLCBTPSTAOFFICE25KW": 23.73,

    "NLCBTPSNEWSCHOOLBUILDINGINV2": 149.16,

    "NLCBTPSNEWSCHOOLBUILDINGINV1": 149.16,

    "NLCBTPSEMPLOYEESCLUB": 28.82,

    "NLCBTPSNEWCISFBARRACKS": 80.23,

    "NLCBTPSTHERMALCANTEEN": 67.24

};


// =====================================================
// GET BTPS INSTALLED DC CAPACITY
// =====================================================

function getBTPSInstalledDcCapacity(buildingName) {

    const key =
        normalizeBuildingName(buildingName);

    const capacity =
        btpsCapacityMap[key];

    if (
        capacity === undefined ||
        capacity === null
    ) {

        console.warn(
            "⚠️ BTPS PGT CAPACITY NOT FOUND",
            {
                buildingName,
                normalizedKey: key
            }
        );

        return null;
    }

    return Number(capacity);
}


// =====================================================
// GET ALL BTPS STATIONS
// =====================================================

async function getBTPSStations() {

    const buildings =
        await getSubBuildings();

    const btpsStations =
        buildings.filter(
            building =>
                String(
                    building.campus || ""
                )
                .toUpperCase() === "BTPS"
        );

    if (!btpsStations.length) {

        throw new Error(
            "No BTPS stations found"
        );
    }

    return btpsStations;
}


// =====================================================
// BTPS PGT COMBINED REPORT
// =====================================================

async function getBTPSPgtReport(
    date,
    fromTime,
    toTime,
    selectedStationId = null
) {

    try {

        console.log(
            "========================================"
        );

        console.log(
            "BTPS PGT REPORT START"
        );


        // =================================================
        // 1. GET ALL BTPS STATIONS
        // =================================================

        const btpsStations =
            await getBTPSStations();


        // =================================================
        // SELECTED BUILDING
        // =================================================

        let reportStations =
            btpsStations;

        if (selectedStationId) {

            reportStations =
                btpsStations.filter(
                    building =>
                        Number(
                            building.stationId ||
                            building.id
                        ) ===
                        Number(
                            selectedStationId
                        )
                );

            if (!reportStations.length) {

                throw new Error(
                    `BTPS station not found: ${selectedStationId}`
                );
            }
        }


        // =================================================
        // GET CAPACITY
        // =================================================

        const btpsStationDetails =
            reportStations.map(
                building => {

                    const stationId =
                        Number(
                            building.stationId ||
                            building.id
                        );

                    const buildingName =
                        String(
                            building.name || ""
                        ).trim();

                    const installedDcCapacity =
                        getBTPSInstalledDcCapacity(
                            buildingName
                        );

                    if (
                        installedDcCapacity === null ||
                        installedDcCapacity <= 0
                    ) {

                        throw new Error(
                            `BTPS Installed DC capacity not configured for ${buildingName}`
                        );
                    }

                    return {

                        stationId,

                        buildingName,

                        campus: "BTPS",

                        installedDcCapacity

                    };

                }
            );


        // =================================================
        // TOTAL BTPS INSTALLED CAPACITY
        // =================================================

        const totalBTPSInstalledDcCapacity =
            Number(
                btpsStationDetails
                    .reduce(
                        (
                            sum,
                            station
                        ) =>
                            sum +
                            station.installedDcCapacity,
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 2. GET INVERTER DATA
        // =================================================

        const stationReports =
            await Promise.all(
                reportStations.map(
                    async building => {

                        const stationId =
                            Number(
                                building.stationId ||
                                building.id
                            );

                        const data =
                            await getPgtInverterEnergy(
                                stationId,
                                date
                            );

                        return {

                            stationId,

                            buildingName:
                                building.name,

                            data

                        };

                    }
                )
            );


        // =================================================
        // 3. COMBINE INVERTER DATA
        // =================================================

        const combinedTimeMap = {};


        for (
            const stationReport
            of stationReports
        ) {

            for (
                const row
                of stationReport.data
            ) {

                if (
                    !row ||
                    !row.time
                ) {
                    continue;
                }


                const time =
                    String(row.time)
                        .substring(0, 5);


                // Selected time range
                if (
                    time < fromTime ||
                    time > toTime
                ) {
                    continue;
                }


                const energy =
                    Number(
                        row.inverterEnergy
                    );


                if (
                    !Number.isFinite(
                        energy
                    )
                ) {
                    continue;
                }


                if (
                    !combinedTimeMap[time]
                ) {

                    combinedTimeMap[time] =
                        0;

                }


                combinedTimeMap[time] +=
                    energy;

            }

        }


        // =================================================
        // 4. SORT COMBINED INVERTER DATA
        // =================================================

        const combinedInverterData =
            Object.keys(
                combinedTimeMap
            )
            .sort()
            .map(time => ({

                time:
                    `${date} ${time}:00`,

                inverterEnergy:
                    Number(
                        combinedTimeMap[time]
                            .toFixed(2)
                    )

            }));


        // =================================================
        // 5. GET BTPS WEATHER DATA
        //
        // weather_logs
        // campus = BTPS
        //
        // irradiance -> GHI
        // inclined_irradiance -> GII
        // =================================================

        const weatherResult =
            await db.query(
                `
                SELECT

                    to_char(
                        created_at
                            AT TIME ZONE 'Asia/Kolkata',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS time,

                    irradiance,

                    temperature,

                    inclined_irradiance,

                    cumulative_irradiance,

                    inclined_cumulative

                FROM weather_logs

                WHERE campus = 'BTPS'

                AND DATE(
                    created_at
                        AT TIME ZONE 'Asia/Kolkata'
                ) = $1::date

                ORDER BY created_at ASC
                `,
                [date]
            );


        const weatherData =
            weatherResult.rows.map(
                row => ({

                    time:
                        row.time,

                    ghi:
                        row.irradiance !== null &&
                        row.irradiance !== undefined
                            ? Number(
                                row.irradiance
                            )
                            : null,

                    gii:
                        row.inclined_irradiance !== null &&
                        row.inclined_irradiance !== undefined
                            ? Number(
                                row.inclined_irradiance
                            )
                            : null,

                    moduleTemp:
                        row.temperature !== null &&
                        row.temperature !== undefined
                            ? Number(
                                row.temperature
                            )
                            : null,

                    cumulative:
                        row.cumulative_irradiance !== null &&
                        row.cumulative_irradiance !== undefined
                            ? Number(
                                row.cumulative_irradiance
                            )
                            : null,

                    inclinedCumulative:
                        row.inclined_cumulative !== null &&
                        row.inclined_cumulative !== undefined
                            ? Number(
                                row.inclined_cumulative
                            )
                            : null

                })
            );


        // =================================================
        // 6. COMBINE INVERTER + WEATHER
        // =================================================

        const report = [];


        for (
            const inverterRow
            of combinedInverterData
        ) {

            const targetTime =
                String(
                    inverterRow.time
                )
                .substring(11, 16);


            const targetParts =
                targetTime.split(":");


            const targetMinutes =
                (
                    Number(
                        targetParts[0]
                    ) * 60
                )
                +
                Number(
                    targetParts[1]
                );


            let nearestWeather =
                null;

            let minDifference =
                Infinity;


            // =================================================
            // FIND NEAREST WEATHER
            // =================================================

            for (
                const weatherRow
                of weatherData
            ) {

                if (
                    !weatherRow.time
                ) {
                    continue;
                }


                const weatherTime =
                    weatherRow.time
                        .split(" ")[1]
                        .substring(0, 5);


                const weatherParts =
                    weatherTime.split(":");


                const weatherMinutes =
                    (
                        Number(
                            weatherParts[0]
                        ) * 60
                    )
                    +
                    Number(
                        weatherParts[1]
                    );


                const difference =
                    Math.abs(
                        targetMinutes -
                        weatherMinutes
                    );


                if (
                    difference <
                    minDifference
                ) {

                    minDifference =
                        difference;

                    nearestWeather =
                        weatherRow;

                }

            }


            // =================================================
            // WEATHER WITHIN 10 MINUTES
            // =================================================

            if (
                nearestWeather &&
                minDifference <= 10
            ) {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi:
                        nearestWeather.ghi,

                    gii:
                        nearestWeather.gii,

                    moduleTemp:
                        nearestWeather.moduleTemp,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        null,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null

                });

            }
            else {

                report.push({

                    date,

                    time:
                        targetTime,

                    ghi: null,

                    gii: null,

                    moduleTemp: null,

                    inverterEnergy:
                        inverterRow.inverterEnergy,

                    inverterEnergyInterval:
                        null,

                    netMeterReading:
                        null,

                    netExportEnergyInterval:
                        null,

                    ghiIrradiationInterval:
                        null,

                    giiIrradiationInterval:
                        null

                });

            }

        }


        // =================================================
        // 7. INVERTER ENERGY INTERVAL
        // =================================================

        let previousInverterEnergy =
            null;


        for (
            const row
            of report
        ) {

            if (
                previousInverterEnergy !== null &&
                row.inverterEnergy !== null &&
                row.inverterEnergy !== undefined
            ) {

                row.inverterEnergyInterval =
                    Number(
                        (
                            Number(
                                row.inverterEnergy
                            )
                            -
                            Number(
                                previousInverterEnergy
                            )
                        ).toFixed(2)
                    );


                // Meter reset protection
                if (
                    row.inverterEnergyInterval < 0
                ) {

                    row.inverterEnergyInterval =
                        0;

                }

            }


            previousInverterEnergy =
                row.inverterEnergy;

        }


        // =================================================
        // 8. IRRADIATION INTERVAL
        //
        // ((CURRENT + NEXT) / 2) * 0.25
        //
        // IMPORTANT:
        // Calculation starts from selected FROM TIME.
        // PGT START does NOT control this calculation.
        // =================================================

        for (
            let i = 0;
            i < report.length - 1;
            i++
        ) {

            const current =
                report[i];

            const next =
                report[i + 1];


            // =================================================
            // GHI INTERVAL
            // =================================================

            if (
                current.ghi !== null &&
                current.ghi !== undefined &&
                next.ghi !== null &&
                next.ghi !== undefined
            ) {

                current.ghiIrradiationInterval =
                    Number(
                        (
                            (
                                Number(
                                    current.ghi
                                )
                                +
                                Number(
                                    next.ghi
                                )
                            ) / 2
                            * 0.25
                        ).toFixed(2)
                    );

            }


            // =================================================
            // GII INTERVAL
            // =================================================

            if (
                current.gii !== null &&
                current.gii !== undefined &&
                next.gii !== null &&
                next.gii !== undefined
            ) {

                current.giiIrradiationInterval =
                    Number(
                        (
                            (
                                Number(
                                    current.gii
                                )
                                +
                                Number(
                                    next.gii
                                )
                            ) / 2
                            * 0.25
                        ).toFixed(2)
                    );

            }

        }


        // =================================================
        // LAST ROW INTERVAL = NULL
        // =================================================

        if (
            report.length > 0
        ) {

            report[
                report.length - 1
            ].ghiIrradiationInterval =
                null;

            report[
                report.length - 1
            ].giiIrradiationInterval =
                null;

        }


        // =================================================
        // 9. TOTAL INVERTER ENERGY INTERVAL
        // =================================================

        const totalInverterEnergyInterval =
            Number(
                report
                    .reduce(
                        (
                            sum,
                            row
                        ) =>
                            sum +
                            Number(
                                row.inverterEnergyInterval ||
                                0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 10. PGT START
        //
        // FIRST GHI > 750
        // =================================================

        const pgtStartIndex =
            report.findIndex(
                row =>
                    row.ghi !== null &&
                    row.ghi !== undefined &&
                    Number(row.ghi) > 750
            );


        const pgtStartRow =
            pgtStartIndex >= 0
                ? report[
                    pgtStartIndex
                ]
                : null;


        // =================================================
        // 11. PGT END
        //
        // FIRST:
        // GII cumulative >= 5000
        //
        // OTHERWISE:
        // LAST VALID GHI + GII ROW
        //
        // Missing middle row does NOT stop PGT.
        // =================================================

        let pgtEndIndex =
            -1;

        let pgtCumulativeGii =
            0;

        let pgtReached5000 =
            false;


        if (
            pgtStartIndex >= 0
        ) {

            for (
                let i =
                    pgtStartIndex;

                i < report.length;

                i++
            ) {

                const row =
                    report[i];


                const ghiValid =
                    row.ghi !== null &&
                    row.ghi !== undefined &&
                    row.ghi !== "" &&
                    !isNaN(
                        Number(
                            row.ghi
                        )
                    );


                const giiValid =
                    row.gii !== null &&
                    row.gii !== undefined &&
                    row.gii !== "" &&
                    !isNaN(
                        Number(
                            row.gii
                        )
                    );


                // Missing row -> continue
                if (
                    !ghiValid ||
                    !giiValid
                ) {

                    continue;

                }


                // Latest valid row
                pgtEndIndex =
                    i;


                const interval =
                    Number(
                        row.giiIrradiationInterval ||
                        0
                    );


                pgtCumulativeGii +=
                    interval;


                // 5000 reached -> stop
                if (
                    pgtCumulativeGii >= 5000
                ) {

                    pgtEndIndex =
                        i;

                    pgtReached5000 =
                        true;

                    break;

                }

            }

        }


        const pgtEndRow =
            pgtEndIndex >= 0
                ? report[
                    pgtEndIndex
                ]
                : null;


        // =================================================
        // 12. PGT REPORT RANGE
        // =================================================

        let pgtReport =
            report;


        if (
            pgtStartIndex >= 0 &&
            pgtEndIndex >= pgtStartIndex
        ) {

            pgtReport =
                report.slice(
                    pgtStartIndex,
                    pgtEndIndex + 1
                );

        }


        // =================================================
        // 13. TOTAL GII IRRADIATION
        // =================================================

        const totalPoaIrradiation =
            Number(
                pgtReport
                    .reduce(
                        (
                            sum,
                            row
                        ) =>
                            sum +
                            Number(
                                row.giiIrradiationInterval ||
                                0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        // =================================================
        // 14. INITIAL INVERTER ENERGY
        // =================================================

        const initialInverterEnergy =
            pgtStartRow &&
            pgtStartRow.inverterEnergy !== null &&
            pgtStartRow.inverterEnergy !== undefined
                ? Number(
                    Number(
                        pgtStartRow.inverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 15. FINAL INVERTER ENERGY
        // =================================================

        const finalInverterEnergy =
            pgtEndRow &&
            pgtEndRow.inverterEnergy !== null &&
            pgtEndRow.inverterEnergy !== undefined
                ? Number(
                    Number(
                        pgtEndRow.inverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 16. TEST START / END
        // =================================================

        const testStartDateTime =
            pgtStartRow
                ? `${date} ${pgtStartRow.time}`
                : null;


        const testEndDateTime =
            pgtEndRow
                ? `${date} ${pgtEndRow.time}`
                : null;


        // =================================================
        // 17. TOTAL AC ENERGY
        // =================================================

        const totalAcEnergyGenerated =
            initialInverterEnergy !== null &&
            finalInverterEnergy !== null
                ? Number(
                    (
                        finalInverterEnergy -
                        initialInverterEnergy
                    ).toFixed(2)
                )
                : null;


        // =================================================
        // 18. DIFFERENTIAL ENERGY
        // =================================================

        const differentialEnergy =
            0;


        // =================================================
        // 19. REFERENCE YIELD
        // =================================================

        const referenceYield =
            Number(
                (
                    totalPoaIrradiation /
                    1000
                ).toFixed(5)
            );


        // =================================================
        // 20. FINAL YIELD
        //
        // Selected building:
        // selected building capacity
        //
        // Consolidated:
        // total BTPS capacity
        // =================================================

        const calculationCapacity =
            selectedStationId
                ? (
                    btpsStationDetails[0]
                        ?.installedDcCapacity
                    ?? null
                )
                : totalBTPSInstalledDcCapacity;


        const finalYield =
            totalAcEnergyGenerated !== null &&
            calculationCapacity !== null &&
            calculationCapacity > 0
                ? Number(
                    (
                        (
                            totalAcEnergyGenerated -
                            differentialEnergy
                        )
                        /
                        calculationCapacity
                    ).toFixed(3)
                )
                : null;


        // =================================================
        // 21. PERFORMANCE RATIO
        // =================================================

        const performanceRatio =
            finalYield !== null &&
            referenceYield !== null &&
            referenceYield !== 0
                ? Number(
                    (
                        (
                            finalYield /
                            referenceYield
                        )
                        * 100
                    ).toFixed(2)
                )
                : null;

               

        // =================================================
        // 22. GUARANTEED PR
        // =================================================

        const guaranteedPr =
            75;


        // =================================================
        // 23. PASS / FAIL
        //
        // Kept for individual PGT report compatibility.
        // Summary will NOT display this.
        // =================================================

        const pgtResult =
            performanceRatio !== null
                ? (
                    performanceRatio >=
                    guaranteedPr
                        ? "PASS"
                        : "FAIL"
                )
                : "PENDING";


        // =================================================
        // 24. TOTAL POA kWh/m²
        // =================================================

        const totalPoaKwh =
            Number(
                (
                    totalPoaIrradiation /
                    1000
                ).toFixed(5)
            );


        // =================================================
        // RESPONSE DETAILS
        // =================================================

        const selectedStationDetails =
            btpsStationDetails[0];


        const responseStationId =
            selectedStationId
                ? Number(
                    selectedStationId
                )
                : "BTPS";


        const responseBuildingName =
            selectedStationId
                ? selectedStationDetails
                    .buildingName
                : "BTPS RTS";


        // =================================================
        // FINAL RESPONSE
        // =================================================

        return {

            station: {

                stationId:
                    responseStationId,

                buildingName:
                    responseBuildingName,

                campus:
                    "BTPS",

                installedDcCapacity:
                    calculationCapacity

            },


            rows:
                report,


            totals: {

                inverterEnergyInterval:
                    totalInverterEnergyInterval,

                netExportEnergyInterval:
                    null,

                poaIrradiationInterval:
                    totalPoaIrradiation

            },


            pgtCalculation: {

                buildingName:
                    responseBuildingName,

                stationId:
                    responseStationId,

                installedDcCapacity:
                    calculationCapacity,

                testStartDateTime,

                testEndDateTime,

                totalPoaIrradiation:
                    totalPoaKwh,

                initialInverterEnergy,

                finalInverterEnergy,

                totalAcEnergyGenerated,

                differentialEnergy,

                referenceYield,

                finalYield,

                performanceRatio,

                guaranteedPr,

                pgtResult

            }

        };

    }
    catch (err) {

        console.error(
            "BTPS PGT Report Error:",
            err
        );

        throw err;

    }

}


// =====================================================
// GET ALL BTPS BUILDINGS FOR PGT
// =====================================================

async function getBTPSPgtStations() {

    try {

        const stations =
            await getBTPSStations();


        const result =
            stations.map(
                building => {

                    const stationId =
                        Number(
                            building.stationId ||
                            building.id
                        );


                    const buildingName =
                        String(
                            building.name || ""
                        ).trim();


                    const installedDcCapacity =
                        getBTPSInstalledDcCapacity(
                            buildingName
                        );


                    return {

                        stationId,

                        buildingName,

                        campus:
                            "BTPS",

                        installedDcCapacity

                    };

                }
            )
            .filter(
                station =>
                    station.installedDcCapacity !== null &&
                    station.installedDcCapacity > 0
            );


        return result;

    }
    catch (err) {

        console.error(
            "PGT BTPS STATIONS ERROR:",
            err.message
        );

        throw err;

    }

}


// =====================================================
// BTPS PGT SUMMARY REPORT
//
// Building Name + Performance Ratio ONLY
// =====================================================

async function getBTPSPgtSummary(
    date,
    fromTime,
    toTime
) {

    try {

        console.log(
            "========================================"
        );

        console.log(
            "BTPS PGT SUMMARY REPORT START"
        );


        // =================================================
        // 1. GET ALL BTPS BUILDINGS
        // =================================================

        const stations =
            await getBTPSPgtStations();


        // =================================================
        // 2. CALCULATE PGT FOR EACH BUILDING
        // =================================================

        const results =
            await Promise.allSettled(

                stations.map(
                    async station => {

                        try {

                            const report =
                                await getBTPSPgtReport(
                                    date,
                                    fromTime,
                                    toTime,
                                    station.stationId
                                );


                            const calculation =
                                report?.pgtCalculation;


                            return {

                                stationId:
                                    station.stationId,

                                buildingName:
                                    station.buildingName,

                                performanceRatio:
                                    calculation
                                        ?.performanceRatio
                                    ?? null

                            };

                        }
                        catch (err) {

                            console.error(
                                "BTPS SUMMARY BUILDING ERROR:",
                                station.buildingName,
                                err.message
                            );


                            return {

                                stationId:
                                    station.stationId,

                                buildingName:
                                    station.buildingName,

                                performanceRatio:
                                    null

                            };

                        }

                    }
                )

            );


        // =================================================
        // 3. CONVERT RESULTS
        // =================================================

        const summary =
            results.map(
                result => {

                    if (
                        result.status ===
                        "fulfilled"
                    ) {

                        return result.value;

                    }


                    return {

                        stationId:
                            null,

                        buildingName:
                            "Unknown",

                        performanceRatio:
                            null

                    };

                }
            );


        // =================================================
        // 4. SORT BY BUILDING NAME
        // =================================================

        summary.sort(
            (a, b) =>
                String(
                    a.buildingName
                ).localeCompare(
                    String(
                        b.buildingName
                    )
                )
        );


        // =================================================
        // 5. FINAL RESPONSE
        // =================================================

        return {

            campus:
                "BTPS",

            date,

            fromTime,

            toTime,

            guaranteedPr:
                75,

            totalBuildings:
                summary.length,

            buildings:
                summary

        };

    }
    catch (err) {

        console.error(
            "BTPS PGT SUMMARY ERROR:",
            err
        );

        throw err;

    }

}
// ================= EXPORT =================

module.exports={

getMainBuildingData,
getSubBuildings,
getWeather,
login,
getGraph,
 getLast10DaysData,
 getReportData,
 getCampusReport,
 getPgtInverterEnergy,

 getPgtReport,
 getNLCILPgtStations,
 getNUPPLPgtReport,
 getNUPPLPgtStations,
 getNLCILPgtSummary,
  getNUPPLPgtSummary,
  getBTPSPgtReport,
getBTPSPgtStations,
getBTPSPgtSummary

};
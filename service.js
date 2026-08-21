const axios = require("axios");
const config = require("./device");
const sha256 = require("./hash");
const jwt = require("jsonwebtoken");


// ✅ ADD KEEP ALIVE (SPEED BOOST)
const http = require('http');
const https = require("https");

const { getMQTTWeather } = require('./mqtt');

const db = require("./db");

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

  // ================= STATUS =================

      // ================= STATUS =================

      if (latest?.deviceState === 3) {

        deviceStatus = "ALERT";

      }
      else if (latest?.deviceState === 1) {

        deviceStatus = "ONLINE";

      }
      else {

        deviceStatus = "OFFLINE";

      }

      // ================= MPPT =================

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

      // ================= PRODUCTION =================

      today += Number(
        latest?.dataList?.find(
          d => d.key === "DailyActiveProduction"
        )?.value || 0
      );

      total += Number(
        latest?.dataList?.find(
          d => d.key === "TotalActiveProduction"
        )?.value || 0
      );

      const powerRaw = Number(
        latest?.dataList?.find(
          d => d.key === "TotalActiveACOutputPower"
        )?.value || 0
      );

      currentPower += powerRaw / 1000;

    }

    const totalMPPTkW = totalMPPTPower / 1000;

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
    else if (upperName.includes("NUPPL")) {

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

      mpptTotalPower: Number(totalMPPTkW.toFixed(1)),

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


console.log(
    "PGT 15 MINUTE INVERTER DATA:",
    pgtData
);


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
// ================= PGT COMBINED REPORT =================

// ================= PGT COMBINED REPORT =================

async function getPgtReport(stationId, date, fromTime, toTime) {

    try {

        // =================================================
        // 1. GET INVERTER DATA
        // =================================================

        const inverterData =
            await getPgtInverterEnergy(
                stationId,
                date
            );

             const filteredInverterData = inverterData.filter(row => {

    const time = row.time.substring(0, 5);

    return time >= fromTime && time <= toTime;

});

        // =================================================
        // 2. GET GII / WEATHER DATA FROM DATABASE
        // =================================================

        const { rows } = await db.query(`

            SELECT

                to_char(
                    created_at AT TIME ZONE 'Asia/Kolkata',
                    'YYYY-MM-DD HH24:MI:SS'
                ) AS time,

                horizontal_irradiance,

                inclined_irradiance,

                temperature

            FROM gii_weather_logs

            WHERE DATE(
                created_at AT TIME ZONE 'Asia/Kolkata'
            ) = $1::date

            ORDER BY created_at ASC;

        `, [
            date
        ]);


        // =================================================
        // 3. CONVERT WEATHER DATA
        // =================================================

        const weatherData =
            rows.map(row => ({

                time: row.time,

                ghi:
                    Number(
                        row.horizontal_irradiance || 0
                    ),

                gii:
                    Number(
                        row.inclined_irradiance || 0
                    ),

                moduleTemp:
                    Number(
                        row.temperature || 0
                    )

            }));


        // =================================================
        // 4. COMBINE WEATHER + INVERTER
        // =================================================

        let previousInverterEnergy = null;

        let previousGII = null;

        const report = [];


      for (const inverterRow of filteredInverterData) {

            const targetTime =
                inverterRow.time;


            // =================================================
            // 4A. CALCULATE INVERTER ENERGY INTERVAL
            // =================================================

            let inverterEnergyInterval = null;


            if (
                previousInverterEnergy !== null
            ) {

                inverterEnergyInterval =
                    Number(
                        (
                            inverterRow.inverterEnergy -
                            previousInverterEnergy
                        ).toFixed(2)
                    );


                // Prevent negative value
                // if inverter energy resets

                if (
                    inverterEnergyInterval < 0
                ) {

                    inverterEnergyInterval = 0;

                }

            }


            previousInverterEnergy =
                inverterRow.inverterEnergy;


            // =================================================
            // 4B. FIND NEAREST WEATHER READING
            // =================================================

            let nearestWeather = null;

            let minDifference =
                Infinity;


            for (
                const weatherRow
                of weatherData
            ) {

                const weatherTime =
                    weatherRow.time
                        .split(" ")[1]
                        .substring(0, 5);


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


                const weatherMinutes =
                    (
                        Number(
                            weatherTime
                                .split(":")[0]
                        ) * 60
                    )
                    +
                    Number(
                        weatherTime
                            .split(":")[1]
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
            // 4C. CALCULATE POA IRRADIATION FOR INTERVAL
            // =================================================

            let poaIrradiationInterval = null;


            if (
                nearestWeather &&
                previousGII !== null
            ) {

                poaIrradiationInterval =
                    Number(
                        (
                            (
                                previousGII +
                                nearestWeather.gii
                            ) / 2 * 0.25
                        ).toFixed(2)
                    );

            }


            // =================================================
            // 5. ACCEPT WEATHER READING
            // WITHIN 10 MINUTES
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

                    // Net Meter not available from Cloud
                    netMeterReading:
                        null,

                    // Net Export not available from Cloud
                    netExportEnergyInterval:
                        null,

                    poaIrradiationInterval:
                        poaIrradiationInterval

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
                        inverterEnergyInterval,

                    // Net Meter not available from Cloud
                    netMeterReading:
                        null,

                    // Net Export not available from Cloud
                    netExportEnergyInterval:
                        null,

                    poaIrradiationInterval:
                        null

                });

            }


            // =================================================
            // 6. UPDATE PREVIOUS GII
            // =================================================

            if (
                nearestWeather &&
                minDifference <= 10
            ) {

                previousGII =
                    nearestWeather.gii;

            }

        }


        // =================================================
        // 7. CALCULATE PGT TOTALS
        // =================================================

        const totalInverterEnergyInterval =
            Number(
                report
                    .reduce(
                        (sum, row) =>
                            sum +
                            Number(
                                row.inverterEnergyInterval || 0
                            ),
                        0
                    )
                    .toFixed(2)
            );


        const totalPoaIrradiation =
            Number(
                report
                    .reduce(
                        (sum, row) =>
                            sum +
                            Number(
                                row.poaIrradiationInterval || 0
                            ),
                        0
                    )
                    .toFixed(2)
            );
            

            // =================================================
// 7A. FIND ACTUAL TEST START / END TIME
// =================================================

// First actual generation point
const firstGenerationRow =
    report.find(row =>
        row.inverterEnergyInterval !== null &&
        Number(row.inverterEnergyInterval) > 0
    );

// Last actual generation point
const generationRows =
    report.filter(row =>
        row.inverterEnergyInterval !== null &&
        Number(row.inverterEnergyInterval) > 0
    );

const lastGenerationRow =
    generationRows.length > 0
        ? generationRows[generationRows.length - 1]
        : null;


// Actual Test Start Date & Time
const testStartDateTime =
    firstGenerationRow
        ? `${date} ${firstGenerationRow.time}`
        : null;


// Actual Test End Date & Time
const testEndDateTime =
    lastGenerationRow
        ? `${date} ${lastGenerationRow.time}`
        : null;

        // =================================================
        // 8. PGT CALCULATION
        // =================================================

        // Installed DC Capacity from Library Building
        const installedDcCapacity = 50.85;


        // POA Irradiation:
        // Wh/m² -> kWh/m²

        const totalPoaKwh =
            Number(
                (
                    totalPoaIrradiation / 1000
                ).toFixed(2)
            );


        // Net Meter is not available from Deye Cloud
        const initialNetMeterEnergy = null;

        const finalNetMeterEnergy = null;


        // AC Energy cannot be calculated
        // until Net Meter data is available

        const totalAcEnergyGenerated = null;


        // Reference Yield can be calculated
        // from POA Irradiation

        const referenceYield =
            totalPoaKwh;


        // Final Yield requires AC Energy

        const finalYield = null;


        // Performance Ratio requires Final Yield

        const performanceRatio = null;


        // Guaranteed PR from PGT Excel

        const guaranteedPr = 75;


        // Result cannot be determined
        // without Net Meter / AC Energy

        const pgtResult = "PENDING";


        // =================================================
        // 9. LOG RESULT
        // =================================================

        console.log(
            "PGT COMBINED REPORT:",
            report
        );


        console.log(
            "PGT TOTALS:",
            {
                totalInverterEnergyInterval,
                totalPoaIrradiation
            }
        );


        console.log(
            "PGT CALCULATION:",
            {
                installedDcCapacity,
                totalPoaKwh,
                initialNetMeterEnergy,
                finalNetMeterEnergy,
                totalAcEnergyGenerated,
                referenceYield,
                finalYield,
                performanceRatio,
                guaranteedPr,
                pgtResult
            }
        );


        // =================================================
        // 10. FINAL RESPONSE
        // =================================================

        return {

            rows:
                report,


            // =================================================
            // TOTALS
            // =================================================

            totals: {

                inverterEnergyInterval:
                    totalInverterEnergyInterval,

                // Net Export not available from Cloud
                netExportEnergyInterval:
                    null,

                poaIrradiationInterval:
                    totalPoaIrradiation

            },


            // =================================================
            // PGT CALCULATION
            // =================================================

            pgtCalculation: {

                installedDcCapacity:
                    installedDcCapacity,

              testStartDateTime:
    testStartDateTime,

testEndDateTime:
    testEndDateTime,

                totalPoaIrradiation:
                    totalPoaKwh,

                initialNetMeterEnergy:
                    initialNetMeterEnergy,

                finalNetMeterEnergy:
                    finalNetMeterEnergy,

                totalAcEnergyGenerated:
                    totalAcEnergyGenerated,

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
            err.message
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

 getPgtReport

};
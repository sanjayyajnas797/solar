
const axios = require("axios");
const crypto = require("crypto");

const BASE_URL = "https://globalapi.solarmanpv.com";

// Token cache
let cachedToken = null;
let tokenExpiresAt = 0;
let tokenRequestPromise = null;

// Refresh 5 minutes before expiry
const EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function getSolarmanToken() {
  // Reuse token while it is valid
  if (
    cachedToken &&
    Date.now() < tokenExpiresAt - EXPIRY_BUFFER_MS
  ) {
    return cachedToken;
  }

  // Prevent duplicate token requests
  if (tokenRequestPromise) {
    return tokenRequestPromise;
  }

  tokenRequestPromise = (async () => {
    const appId = process.env.SOLARMAN_APP_ID?.trim();
    const appSecret = process.env.SOLARMAN_APP_SECRET?.trim();
    const email = process.env.SOLARMAN_EMAIL?.trim();
    const password = process.env.SOLARMAN_PASSWORD;

    if (!appId || !appSecret || !email || !password) {
      throw new Error("SOLARMAN environment variables are missing");
    }

    const passwordHash = crypto
      .createHash("sha256")
      .update(password, "utf8")
      .digest("hex");

    const response = await axios.post(
      `${BASE_URL}/account/v1.0/token`,
      {
        appSecret,
        email,
        password: passwordHash,
      },
      {
        params: {
          appId,
          language: "en",
        },
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const data = response.data;

    if (!data?.success || !data?.access_token) {
      throw new Error(
        `SOLARMAN token failed: ${data?.code || ""} ${data?.msg || ""}`
      );
    }

    const expiresIn = Number(data.expires_in);

    if (!Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw new Error("Invalid SOLARMAN token expiry");
    }

    cachedToken = data.access_token;
    tokenExpiresAt = Date.now() + expiresIn * 1000;

    console.log(
      `SOLARMAN token obtained; expires in ${expiresIn} seconds`
    );

    return cachedToken;
  })();

  try {
    return await tokenRequestPromise;
  } finally {
    tokenRequestPromise = null;
  }
}

async function getSolarmanBuildings() {
  const token = await getSolarmanToken();

  const response = await axios.post(
    `${BASE_URL}/station/v1.0/list`,
    {
      page: 1,
      size: 50,
    },
    {
      params: {
        language: "en",
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  return response.data;
}


const Devicelist = async (req, res) => {
  try {
    const token = await getSolarmanToken();
    const { stationId } = req.params;

    const response = await axios.post(
      `${BASE_URL}/station/v1.0/device`,
      {
        stationId: Number(stationId),
        deviceType: "INVERTER",
        page: 1,
        size: 10,
      },
      {
        params: {
          language: "en",
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "SOLARMAN Device Error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      message: "Unable to fetch device list",
    });
  }
};

const RealTimePower = async (req, res) => {
  try {
    const token = await getSolarmanToken();
    const { stationId } = req.params;

    const response = await axios.post(
      `${BASE_URL}/station/v1.0/realTime`,
      {
        stationId: Number(stationId),
      },
      {
        params: { language: "en" },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    console.log("SOLARMAN Real-Time Response:", response.data);

    return res.status(200).json(response.data);
  } catch (error) {
    console.error(
      "SOLARMAN Real-Time Error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      message: "Unable to fetch real-time station data",
    });
  }
};
        


const HistoryPower = async (req, res) => {
  try {
    const token = await getSolarmanToken();
    const { stationId } = req.params;

    // Current date - India timezone
    const now = new Date();

    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(now);

    const yesterdayDate = new Date(
      now.getTime() - 24 * 60 * 60 * 1000
    );

    const yesterday = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
    }).format(yesterdayDate);

    // ------------------------------------------------
    // 1. HISTORY API - Today + Yesterday
    // ------------------------------------------------

    const historyResponse = await axios.post(
      `${BASE_URL}/station/v1.0/history`,
      {
        stationId: Number(stationId),
        timeType: 2,
        startTime: yesterday,
        endTime: today,
      },
      {
        params: {
          language: "en",
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const historyData = historyResponse.data;

    const stationDataItems =
      historyData?.stationDataItems || [];

    // ------------------------------------------------
    // 2. FIND TODAY / YESTERDAY
    // ------------------------------------------------

    const todayDate = new Date(
      new Date().toLocaleString("en-US", {
        timeZone: "Asia/Kolkata",
      })
    );

    const todayDay = todayDate.getDate();
    const todayMonth = todayDate.getMonth() + 1;
    const todayYear = todayDate.getFullYear();

    const yesterdayDateObj = new Date(todayDate);
    yesterdayDateObj.setDate(todayDate.getDate() - 1);

    const yesterdayDay = yesterdayDateObj.getDate();
    const yesterdayMonth = yesterdayDateObj.getMonth() + 1;
    const yesterdayYear = yesterdayDateObj.getFullYear();

    const todayData = stationDataItems.find(
      (item) =>
        item.day === todayDay &&
        item.month === todayMonth &&
        item.year === todayYear
    );

    const yesterdayData = stationDataItems.find(
      (item) =>
        item.day === yesterdayDay &&
        item.month === yesterdayMonth &&
        item.year === yesterdayYear
    );

    const todayGeneration =
      Number(todayData?.generationValue) || 0;

    const yesterdayGeneration =
      Number(yesterdayData?.generationValue) || 0;

    // ------------------------------------------------
    // 3. REALTIME API - LIVE POWER + CUMULATIVE
    // ------------------------------------------------

    const realtimeResponse = await axios.post(
      `${BASE_URL}/station/v1.0/realTime`,
      {
        stationId: Number(stationId),
      },
      {
        params: {
          language: "en",
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    const realtimeData = realtimeResponse.data;

    const livePower =
      Number(realtimeData?.generationPower) || 0;

    const cumulative =
      Number(realtimeData?.generationTotal) || 0;

    // ------------------------------------------------
    // 4. FINAL RESPONSE
    // ------------------------------------------------

    return res.status(200).json({
      success: true,
      stationId: Number(stationId),

      today: todayGeneration,
      yesterday: yesterdayGeneration,
      cumulative: cumulative,

      livePower: livePower,

      todayDate: today,
      yesterdayDate: yesterday,

      lastUpdateTime: realtimeData?.lastUpdateTime || null,
    });

  } catch (error) {
    console.error(
      "SOLARMAN History Error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      message: "Unable to fetch station energy data",
    });
  }
};

const SolarmanGraph = async (req, res) => {
  try {
      console.log("🔥 SOLARMAN GRAPH HIT");
    console.log("stationId:", req.params.stationId);
    console.log("date:", req.query.date);
    const token = await getSolarmanToken();

    const { stationId } = req.params;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: "date is required"
      });
    }

    const response = await axios.post(
      `${BASE_URL}/station/v1.0/history`,
      {
        stationId: Number(stationId),

        // Frame-level data
        timeType: 1,

        startTime: date,
        endTime: date
      },
      {
        params: {
          language: "en"
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );

    const items = response.data?.stationDataItems || [];

    const graphData = items
      .filter(item => item?.dateTime && item?.generationPower != null)
      .map(item => ({
        time: item.dateTime,
        power: Number(item.generationPower)
      }));

    return res.status(200).json(graphData);

  } catch (error) {
    console.error(
      "SOLARMAN Graph Error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      message: "Unable to fetch Solarman graph data"
    });
  }
};

// =====================================================
// GET SOLARMAN DEVICES FOR PGT
// =====================================================

async function getSolarmanDevices(stationId) {
  const token = await getSolarmanToken();

  const response = await axios.post(
    `${BASE_URL}/station/v1.0/device`,
    {
      stationId: Number(stationId),
      deviceType: "INVERTER",
      page: 1,
      size: 100
    },
    {
      params: {
        language: "en"
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );

  const data = response.data;

  console.log("SOLARMAN PGT DEVICE RESPONSE:", {
    stationId,
    success: data?.success,
    total: data?.total,
    deviceCount: data?.deviceListItems?.length || 0
  });

  return data?.deviceListItems || [];
}


// =====================================================
// GET SOLARMAN DEVICE HISTORY FOR PGT
// =====================================================

async function getSolarmanDeviceHistory(deviceSn, date) {
  const token = await getSolarmanToken();

  const response = await axios.post(
    `${BASE_URL}/v1.0/device/history`,
    {
      deviceSn: String(deviceSn),
      startAt: date,
      endAt: date,
      granularity: 1,
      measurePoints: [
        "DailyActiveProduction"
      ]
    },
    {
      params: {
        language: "en"
      },
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      timeout: 15000
    }
  );

  return response.data;
}

// =====================================================
// SOLARMAN PGT - FRAME HISTORY
// DO NOT CHANGE EXISTING HISTORY API
// =====================================================

async function getSolarmanPgtFrameHistory(stationId, date) {

  const token = await getSolarmanToken();

  const response = await axios.post(
    `${BASE_URL}/station/v1.0/history`,
    {
      stationId: Number(stationId),

      // Frame-level historical data
      timeType: 1,

      startTime: date,
      endTime: date
    },
    {
      params: {
        language: "en"
      },

      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },

      timeout: 15000
    }
  );

  const data = response.data;

  console.log(
    "SOLARMAN PGT FRAME HISTORY:",
    {
      stationId,
      success: data?.success,
      total: data?.total,
      count: data?.stationDataItems?.length || 0
    }
  );

  return data?.stationDataItems || [];
}

// =====================================================
// SOLARMAN - GET INVERTER HISTORICAL ENERGY
// TEST FUNCTION ONLY
// =====================================================

const getSolarmanInverterHistoricalEnergy = async (
  stationId,
  date
) => {
  try {

    console.log("\n========================================");
    console.log("SOLARMAN INVERTER ENERGY TEST");
    console.log("========================================");

    console.log("Station ID:", stationId);
    console.log("Date:", date);


    // -------------------------------------------------
    // 1. GET SOLARMAN TOKEN
    // -------------------------------------------------

    const token = await getSolarmanToken();

    if (!token) {
      throw new Error("Solarman access token not available");
    }


    // -------------------------------------------------
    // 2. GET INVERTER DEVICES FOR SELECTED STATION
    // -------------------------------------------------

    const deviceResponse = await axios.post(
      `${BASE_URL}/station/v1.0/device`,
      {
        deviceType: "INVERTER",
        page: 1,
        size: 50,
        stationId: Number(stationId)
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        timeout: 15000
      }
    );


    console.log(
      "SOLARMAN DEVICE RESPONSE:",
      JSON.stringify(deviceResponse.data, null, 2)
    );


    const devices =
      deviceResponse.data?.deviceListItems ||
      deviceResponse.data?.deviceList ||
      [];


    if (!devices.length) {

      console.log(
        "❌ NO INVERTER FOUND FOR STATION:",
        stationId
      );

      return [];
    }


    console.log(
      `✅ INVERTERS FOUND: ${devices.length}`
    );


    console.log(
      "INVERTER DEVICES:",
      devices.map(d => ({
        deviceId: d.deviceId,
        deviceSn: d.deviceSn,
        deviceType: d.deviceType,
        connectStatus: d.connectStatus
      }))
    );


    // -------------------------------------------------
    // 3. GET HISTORICAL DATA FOR EACH INVERTER
    // -------------------------------------------------

    const finalData = [];


    for (const inverter of devices) {

      if (!inverter.deviceSn) {
        console.log(
          "⚠️ deviceSn missing:",
          inverter
        );

        continue;
      }


      console.log("\n----------------------------------------");
      console.log("READING INVERTER");
      console.log("Device ID:", inverter.deviceId);
      console.log("Device SN:", inverter.deviceSn);
      console.log("----------------------------------------");


      const historyResponse = await axios.post(
        `${BASE_URL}/device/v1.0/historical`,
        {
          deviceId: Number(inverter.deviceId),
          deviceSn: inverter.deviceSn,

          startTime: date,
          endTime: date,

          // 1 = Frame data
          timeType: 1
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          timeout: 15000
        }
      );


      const history = historyResponse.data;


      console.log(
        "HISTORY SUCCESS:",
        history?.success
      );

      console.log(
        "HISTORY COUNT:",
        history?.paramDataList?.length || 0
      );


      const paramDataList =
        history?.paramDataList || [];


      // -------------------------------------------------
      // 4. PRINT ALL PARAMETERS
      // -------------------------------------------------

      console.log(
        "\n========== ALL SOLARMAN PARAMETERS =========="
      );


      const parameterSet = new Map();


      for (const frame of paramDataList) {

        const dataList =
          frame?.dataList || [];


        for (const item of dataList) {

          const key = item?.key;
          const name = item?.name;
          const unit = item?.unit;


          if (!parameterSet.has(key)) {

            parameterSet.set(
              key,
              {
                key,
                name,
                unit
              }
            );
          }
        }
      }


      console.table(
        Array.from(parameterSet.values())
      );


      // -------------------------------------------------
      // 5. FIND PRODUCTION / ENERGY PARAMETERS
      // -------------------------------------------------

      const productionKeys = [
        "generation",
        "Et_ge0",
        "Etdy_ge1"
      ];


      const productionNames = [
        "Production",
        "Cumulative Production (Active)",
        "Daily Production (Active)",
        "Total Production",
        "Daily Production",
        "Energy"
      ];


      const productionParameters =
        Array.from(parameterSet.values()).filter(
          item =>
            productionKeys.includes(item.key) ||
            productionNames.some(name =>
              String(item.name || "")
                .toLowerCase()
                .includes(name.toLowerCase())
            )
        );


      console.log(
        "\n========== PRODUCTION PARAMETERS =========="
      );


      console.table(productionParameters);


      // -------------------------------------------------
      // 6. EXTRACT PRODUCTION VALUES
      // -------------------------------------------------

      const inverterFrames = [];


      for (const frame of paramDataList) {

        const dataList =
          frame?.dataList || [];


        let productionItem = null;


        // Priority 1:
        // Cumulative Production
        productionItem =
          dataList.find(
            item =>
              item.key === "Et_ge0"
          );


        // Priority 2:
        // generation
        if (!productionItem) {

          productionItem =
            dataList.find(
              item =>
                item.key === "generation"
            );
        }


        // Priority 3:
        // Daily Production
        if (!productionItem) {

          productionItem =
            dataList.find(
              item =>
                item.key === "Etdy_ge1"
            );
        }


        // Priority 4:
        // Search by name
        if (!productionItem) {

          productionItem =
            dataList.find(item => {

              const name =
                String(item.name || "")
                  .toLowerCase();

              return (
                name.includes("production") ||
                name.includes("generation") ||
                name.includes("energy")
              );
            });
        }


        if (productionItem) {

          inverterFrames.push({

            collectTime:
              frame.collectTime,

            key:
              productionItem.key,

            name:
              productionItem.name,

            unit:
              productionItem.unit,

            value:
              Number(productionItem.value)

          });
        }
      }


      // -------------------------------------------------
      // 7. PRINT FINAL ENERGY DATA
      // -------------------------------------------------

      console.log(
        "\n========== SOLARMAN INVERTER ENERGY DATA =========="
      );


      console.log(
        JSON.stringify(
          inverterFrames.slice(0, 20),
          null,
          2
        )
      );


      console.log(
        "TOTAL ENERGY FRAMES:",
        inverterFrames.length
      );


      if (!inverterFrames.length) {

        console.log(
          "❌ NO PRODUCTION / ENERGY PARAMETER FOUND"
        );

      } else {

        console.log(
          "✅ INVERTER ENERGY DATA FOUND"
        );

        console.log(
          "FIRST:",
          inverterFrames[0]
        );

        console.log(
          "LAST:",
          inverterFrames[inverterFrames.length - 1]
        );
      }


      finalData.push({

        deviceId:
          inverter.deviceId,

        deviceSn:
          inverter.deviceSn,

        data:
          inverterFrames

      });
    }


    return finalData;


  } catch (error) {

    console.error(
      "❌ SOLARMAN INVERTER ENERGY ERROR:",
      error.response?.data ||
      error.message
    );

    throw error;
  }
};

module.exports = {
  getSolarmanToken,
  getSolarmanBuildings,
  getSolarmanDevices,
  getSolarmanDeviceHistory,
  getSolarmanPgtFrameHistory,
  Devicelist,
  RealTimePower,
  HistoryPower,
  SolarmanGraph,
  getSolarmanInverterHistoricalEnergy
};
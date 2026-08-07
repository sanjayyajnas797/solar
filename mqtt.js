// mqttWeather.js

const mqtt = require("mqtt");
const db=require('./db')

latestWeather = {

    NLCIL:{
        irradiance:0,
        temperature:0,
        lastUpdate:0
    },

    NLCIC:{
        irradiance:0,
        temperature:0,
        lastUpdate:0
    },

    NTPL:{
        irradiance:0,
        temperature:0,
        lastUpdate:0
    },

    NUPPL:{
        irradiance:0,
        temperature:0,
        lastUpdate:0
    },

    BTPS:{
        irradiance:0,
        temperature:0,
        lastUpdate:0
    },

   LIBRARY:{
    irradiance:0,
    temperature:0,
     lastUpdate:0
  }

}

// ================= GII Buffer =================

let giiBuffer = {

  horizontal: null,

  inclined: null,

  temperature: null,

  mqttTimestamp: null

};

let giiStatus = {

    online: false,

    lastUpdate: 0

};

const client = mqtt.connect("mqtt://13.202.201.160", {

  username: "solar_mqtt",
  password: "Test1234",

  keepalive: 60,
  reconnectPeriod: 5000,
  clean: true

});

client.on("connect", () => {

  console.log("MQTT Connected ✅");

  client.subscribe("test/rx");

  client.subscribe("rajashthan/rx");

   client.subscribe("nuppl/rx"); 

   client.subscribe("library/rx");

  console.log("Subscribed All Topics ✅");

});

async function saveWeather(campus, irradiance, temperature,  mqttTimestamp) {

  


  if (irradiance <= 0) {
    return;
  }

  try {
const result = await db.query(`
INSERT INTO weather_logs
(
    campus,
    irradiance,
    temperature,
    mqtt_timestamp
)
VALUES
(
    $1,
    $2,
    $3,
    $4
)
RETURNING
id,
to_char(
    created_at AT TIME ZONE 'Asia/Kolkata',
    'YYYY-MM-DD HH24:MI:SS'
) AS created_at;
`,
[
    campus,
    irradiance,
    temperature,
    mqttTimestamp
]);


  
  } catch (err) {
    console.log("DB Insert Error ❌", err.message);
  }
}

// ================= Save GII =================

async function saveGII(
  horizontal,
  inclined,
  temperature,
  mqttTimestamp
) {

  if (
    horizontal <= 0 ||
    inclined <= 0
  ) {
    return;
  }

  try {

    await db.query(
      `INSERT INTO gii_weather_logs
      (
        horizontal_irradiance,
        inclined_irradiance,
        temperature,
        mqtt_timestamp
      )
      VALUES ($1,$2,$3,$4)`,
      [
        horizontal,
        inclined,
        temperature,
        mqttTimestamp
      ]
    );

    console.log(
      `✅ GII Saved -> H:${horizontal} I:${inclined} T:${temperature}`
    );

  } catch (err) {

    console.log(
      "GII Insert Error ❌",
      err.message
    );

  }

}

client.on("message", (topic, message) => {

  try {

    const data = JSON.parse(message.toString());

    const status = data.payload?.[0]?.status;

    const mqttTimestamp = status.timestamp || data.time || null;

    if (!status) return;

    // ================= NLC =================

    if (topic === "test/rx") {

    const weather = {

    irradiance: status.Pyranometer || 0,

    temperature:
        (status.Module_temperature ||
         status.Module_temp ||
         0) / 10,

    lastUpdate: Date.now()

};

// same weather for all NLC campuses
latestWeather.NLCIL = { ...weather };
latestWeather.NLCIC = { ...weather };
latestWeather.NTPL  = { ...weather };
     
saveWeather(
  "NLC",
  weather.irradiance,
  weather.temperature,
  mqttTimestamp
);
      

    }
if (topic === "nuppl/rx") {

 latestWeather.NUPPL = {

    irradiance: status.Param_1 || 0,

    temperature: (status.Param_2 || 0) / 10,

    lastUpdate: Date.now()

};

  saveWeather(
  "NUPPL",
  latestWeather.NUPPL.irradiance,
  latestWeather.NUPPL.temperature,
  mqttTimestamp
);
}


// ================= GII =================

if (topic === "library/rx") {

    giiStatus.lastUpdate = Date.now();

    giiStatus.online = true;

    const subDeviceId = data.payload?.[0]?.subDeviceId;

   if (subDeviceId === "ttyCOM1_1") {

    giiBuffer.horizontal =
        status.Param_1 || 0;

    giiBuffer.temperature =
        (status.Param_2 || 0) / 10;

    giiBuffer.mqttTimestamp =
        mqttTimestamp;
}

    // ttyCOM1_2
    if (subDeviceId === "ttyCOM1_2") {

        giiBuffer.inclined =
            status.Param_3 || 0;

    }

    // Both messages received -> Save one row

if (
    giiBuffer.horizontal !== null &&
    giiBuffer.inclined !== null &&
    giiBuffer.temperature !== null
) {

    saveGII(
        giiBuffer.horizontal,
        giiBuffer.inclined,
        giiBuffer.temperature,
        giiBuffer.mqttTimestamp
    );

    // Clear buffer for next MQTT cycle

    giiBuffer.horizontal = null;
    giiBuffer.inclined = null;
    giiBuffer.temperature = null;
    giiBuffer.mqttTimestamp = null;

}

}

    // ================= BTPS =================

    if (topic === "rajashthan/rx") {

 latestWeather.BTPS = {

    irradiance: status.Pyranometer || 0,

    temperature:
        (status.Module_temperature ||
         status.Module_temp ||
         0) / 10,

    lastUpdate: Date.now()

};

 saveWeather(
  "BTPS",
  latestWeather.BTPS.irradiance,
  latestWeather.BTPS.temperature,
  mqttTimestamp
);
}

  }

  
  catch (err) {

    console.log("MQTT Parse Error ❌", err.message);

  }

});

function getMQTTWeather(campus) {

    const data = latestWeather[campus];

    if (!data) {

        return {

            irradiance: 0,

            temperature: 0,

            online: false

        };

    }

    // MQTT last update age
    const age = Date.now() - data.lastUpdate;

    // 30 seconds data வரலனா OFFLINE
    if (age > 30000) {

        return {

            irradiance: 0,

            temperature: 0,

            online: false

        };

    }

    return {

        irradiance: data.irradiance,

        temperature: data.temperature,

        online: true

    };

}

module.exports = {

    getMQTTWeather,

    getGIIStatus: () => {

        if (Date.now() - giiStatus.lastUpdate > 30000) {

            return {

                online: false

            };

        }

        return {

            online: true

        };

    }

};
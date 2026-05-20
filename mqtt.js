// mqttWeather.js

const mqtt = require("mqtt");

let latestWeather = {

  NLCIL: {
    irradiance: 0,
    temperature: 0
  },

  NLCIC: {
    irradiance: 0,
    temperature: 0
  },

  NTPL: {
    irradiance: 0,
    temperature: 0
  },

  NUPPL: {
    irradiance: 0,
    temperature: 0
  },

  BTPS: {
    irradiance: 0,
    temperature: 0
  }

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

  console.log("Subscribed All Topics ✅");

});

client.on("message", (topic, message) => {

  try {

    const data = JSON.parse(message.toString());

    const status = data.payload?.[0]?.status;

    if (!status) return;

    // ================= NLC =================

    if (topic === "test/rx") {

      const weather = {

        irradiance: status.Pyranometer || 0,

        temperature:
          (status.Module_temperature ||
           status.Module_temp ||
           0) / 10

      };

      // same weather for all NLC campuses
      latestWeather.NLCIL = weather;
      latestWeather.NLCIC = weather;
      latestWeather.NTPL = weather;
      latestWeather.NUPPL = weather;

      

    }

    // ================= BTPS =================

    if (topic === "rajashthan/rx") {

      latestWeather.BTPS = {

        irradiance: status.Pyranometer || 0,

        temperature:
          (status.Module_temperature ||
           status.Module_temp ||
           0) / 10

      };

    

    }

  }
  catch (err) {

    console.log("MQTT Parse Error ❌", err.message);

  }

});

function getMQTTWeather(campus) {

  return latestWeather[campus] || {

    irradiance: 0,
    temperature: 0

  };

}

module.exports = {
  getMQTTWeather
};
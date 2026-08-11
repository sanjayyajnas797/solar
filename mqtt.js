const mqtt = require("mqtt");
const db = require("./db");

// =====================================================
// LIVE WEATHER
// =====================================================

const latestWeather = {
    NLCIL: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    },

    NLCIC: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    },

    NTPL: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    },

    NUPPL: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    },

    BTPS: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    },

    LIBRARY: {
        irradiance: 0,
        temperature: 0,
        lastUpdate: 0
    }
};

// =====================================================
// GII SENSOR BUFFER
// =====================================================

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

// =====================================================
// GII 10-SECOND CALCULATION MEMORY
// =====================================================

let giiCalculation = {

    previousHorizontal: null,
    previousInclined: null,
    previousTimestamp: null,

    horizontalEnergy: 0,
    inclinedEnergy: 0,

    intervalStart: null,

    latestHorizontal: 0,
    latestInclined: 0,
    latestTemperature: 0,
    latestTimestamp: null
};

// =====================================================
// 15 MINUTE
// =====================================================

const FIFTEEN_MINUTES = 15 * 60 * 1000;


// =====================================================
// MQTT CONNECTION
// =====================================================

const client = mqtt.connect("mqtt://13.202.201.160", {

    username: "solar_mqtt",
    password: "Test1234",

    keepalive: 60,
    reconnectPeriod: 5000,
    clean: true
});


// =====================================================
// CONNECT
// =====================================================

client.on("connect", () => {

    console.log("MQTT Connected ✅");

    client.subscribe("test/rx");
    client.subscribe("rajashthan/rx");
    client.subscribe("nuppl/rx");
    client.subscribe("library/rx");

    console.log("Subscribed All Topics ✅");
});


// =====================================================
// TIMESTAMP
// =====================================================

function getDate(timestamp) {

    if (!timestamp) {
        return new Date();
    }

    const d = new Date(timestamp);

    if (isNaN(d.getTime())) {
        return new Date();
    }

    return d;
}


// =====================================================
// SAVE WEATHER
// 15 MIN ONLY
// =====================================================

async function saveWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp
) {

    // IMPORTANT
    // Only save if irradiance > 15

    if (irradiance <= 15) {
        return;
    }

    try {

        await db.query(
            `
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
            `,
            [
                campus,
                irradiance,
                temperature,
                mqttTimestamp
            ]
        );

        console.log(
            `✅ WEATHER SAVED | ${campus} | ${irradiance}`
        );

    }
    catch (err) {

        console.log(
            "Weather DB Insert Error ❌",
            err.message
        );
    }
}


// =====================================================
// GII 15 MIN SAVE
// =====================================================

async function saveGII(
    horizontal,
    inclined,
    temperature,
    mqttTimestamp
) {

    // IMPORTANT
    // Don't store low/noise readings

    if (
        horizontal <= 15 ||
        inclined <= 15
    ) {

        console.log(
            `⏭️ GII Skip | H:${horizontal} I:${inclined}`
        );

        return;
    }

    try {

        await db.query(
            `
            INSERT INTO gii_weather_logs
            (
                horizontal_irradiance,
                inclined_irradiance,
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
            `,
            [
                horizontal,
                inclined,
                temperature,
                mqttTimestamp
            ]
        );

        console.log(
            `✅ GII 15-MIN SAVED | ` +
            `H:${horizontal} | ` +
            `I:${inclined} | ` +
            `T:${temperature}`
        );

    }
    catch (err) {

        console.log(
            "GII DB Insert Error ❌",
            err.message
        );
    }
}


// =====================================================
// PROCESS GII
// MQTT 10 SEC DATA
// =====================================================

async function processGII(
    horizontal,
    inclined,
    temperature,
    mqttTimestamp
) {

    const now = getDate(mqttTimestamp);

    // =================================================
    // FIRST READING
    // =================================================

    if (
        giiCalculation.previousTimestamp === null
    ) {

        giiCalculation.previousHorizontal =
            horizontal;

        giiCalculation.previousInclined =
            inclined;

        giiCalculation.previousTimestamp =
            now;

        giiCalculation.intervalStart =
            now;

        giiCalculation.latestHorizontal =
            horizontal;

        giiCalculation.latestInclined =
            inclined;

        giiCalculation.latestTemperature =
            temperature;

        giiCalculation.latestTimestamp =
            now;

        return;
    }


    // =================================================
    // TIME DIFFERENCE
    // =================================================

    let seconds =
        (
            now.getTime() -
            giiCalculation.previousTimestamp.getTime()
        ) / 1000;


    // MQTT normally 10 sec
    if (seconds <= 0) {
        seconds = 10;
    }


    // Don't allow huge gap
    if (seconds > 60) {

        console.log(
            `⚠️ MQTT gap detected: ${seconds}s`
        );

        seconds = 10;
    }


    // =================================================
    // HORIZONTAL ENERGY
    // =================================================

    const horizontalAverage =
        (
            giiCalculation.previousHorizontal +
            horizontal
        ) / 2;


    const horizontalEnergy =
        horizontalAverage *
        seconds /
        3600;


    // =================================================
    // INCLINED ENERGY
    // =================================================

    const inclinedAverage =
        (
            giiCalculation.previousInclined +
            inclined
        ) / 2;


    const inclinedEnergy =
        inclinedAverage *
        seconds /
        3600;


    // =================================================
    // ACCUMULATE
    // =================================================

    giiCalculation.horizontalEnergy +=
        horizontalEnergy;

    giiCalculation.inclinedEnergy +=
        inclinedEnergy;


    // =================================================
    // UPDATE LATEST
    // =================================================

    giiCalculation.previousHorizontal =
        horizontal;

    giiCalculation.previousInclined =
        inclined;

    giiCalculation.previousTimestamp =
        now;

    giiCalculation.latestHorizontal =
        horizontal;

    giiCalculation.latestInclined =
        inclined;

    giiCalculation.latestTemperature =
        temperature;

    giiCalculation.latestTimestamp =
        now;


    // =================================================
    // CHECK 15 MINUTES
    // =================================================

    const elapsed =
        now.getTime() -
        giiCalculation.intervalStart.getTime();

        console.log(
    `⏱️ GII PROCESS | H:${horizontal} I:${inclined} | Elapsed:${Math.floor(elapsed / 1000)} sec`
);



    if (elapsed >= FIFTEEN_MINUTES) {

        console.log(
            "⏱️ 15 MIN COMPLETED"
        );

        console.log(
            `H Energy: ${
                giiCalculation.horizontalEnergy.toFixed(3)
            }`
        );

        console.log(
            `I Energy: ${
                giiCalculation.inclinedEnergy.toFixed(3)
            }`
        );


        // =================================================
        // SAVE ONLY IF CURRENT IRRADIANCE > 15
        // =================================================

        if (
            giiCalculation.latestHorizontal > 15 &&
            giiCalculation.latestInclined > 15
        ) {

            await saveGII(
                giiCalculation.latestHorizontal,
                giiCalculation.latestInclined,
                giiCalculation.latestTemperature,
                giiCalculation.latestTimestamp
            );

        }
        else {

            console.log(
                `⏭️ 15-MIN DB SKIPPED | ` +
                `H:${giiCalculation.latestHorizontal} ` +
                `I:${giiCalculation.latestInclined}`
            );
        }


        // =================================================
        // RESET 15 MIN INTERVAL
        // =================================================

        giiCalculation.horizontalEnergy = 0;

        giiCalculation.inclinedEnergy = 0;

        giiCalculation.intervalStart =
            now;
    }
}


// =====================================================
// MQTT MESSAGE
// =====================================================

client.on("message", async (topic, message) => {

    try {

        const data =
            JSON.parse(message.toString());

        const status =
            data.payload?.[0]?.status;

        if (!status) {
            return;
        }


        const mqttTimestamp =
            status.timestamp ||
            data.time ||
            new Date();


        // =================================================
        // NLC
        // =================================================

        if (topic === "test/rx") {

            const weather = {

                irradiance:
                    status.Pyranometer || 0,

                temperature:
                    (
                        status.Module_temperature ||
                        status.Module_temp ||
                        0
                    ) / 10,

                lastUpdate:
                    Date.now()
            };


            latestWeather.NLCIL =
                { ...weather };

            latestWeather.NLCIC =
                { ...weather };

            latestWeather.NTPL =
                { ...weather };


            // NOTE:
            // If NLC also needs 15-min logging,
            // use a separate 15-min buffer.
        }


        // =================================================
        // NUPPL
        // =================================================

        if (topic === "nuppl/rx") {

            latestWeather.NUPPL = {

                irradiance:
                    status.Param_1 || 0,

                temperature:
                    (status.Param_2 || 0) / 10,

                lastUpdate:
                    Date.now()
            };
        }


        // =================================================
        // GII
        // =================================================

        if (topic === "library/rx") {

            giiStatus.lastUpdate =
                Date.now();

            giiStatus.online =
                true;


            const subDeviceId =
                data.payload?.[0]?.subDeviceId;


            // ---------------------------------------------
            // HORIZONTAL
            // ---------------------------------------------

            if (
                subDeviceId ===
                "ttyCOM1_1"
            ) {

                giiBuffer.horizontal =
                    status.Param_1 || 0;

                giiBuffer.temperature =
                    (
                        status.Param_2 ||
                        0
                    ) / 10;

                giiBuffer.mqttTimestamp =
                    mqttTimestamp;
            }


            // ---------------------------------------------
            // INCLINED
            // ---------------------------------------------

            if (
                subDeviceId ===
                "ttyCOM1_2"
            ) {

                giiBuffer.inclined =
                    status.Param_3 || 0;
            }


            // ---------------------------------------------
            // BOTH AVAILABLE
            // ---------------------------------------------

      

            if (
                giiBuffer.horizontal !== null &&
                giiBuffer.inclined !== null &&
                giiBuffer.temperature !== null
            ) {

                await processGII(
                    giiBuffer.horizontal,
                    giiBuffer.inclined,
                    giiBuffer.temperature,
                    giiBuffer.mqttTimestamp
                );


                // Clear pair buffer
                giiBuffer.horizontal =
                    null;

                giiBuffer.inclined =
                    null;

                giiBuffer.temperature =
                    null;

                giiBuffer.mqttTimestamp =
                    null;
            }
        }


        // =================================================
        // BTPS
        // =================================================

        if (topic === "rajashthan/rx") {

            const weather = {

                irradiance:
                    status.Pyranometer || 0,

                temperature:
                    (
                        status.Module_temperature ||
                        status.Module_temp ||
                        0
                    ) / 10,

                lastUpdate:
                    Date.now()
            };


            latestWeather.BTPS =
                { ...weather };
        }

    }
    catch (err) {

        console.log(
            "MQTT Parse Error ❌",
            err.message
        );
    }
});


// =====================================================
// LIVE WEATHER
// =====================================================

function getMQTTWeather(campus) {

    const data =
        latestWeather[campus];


    if (!data) {

        return {

            irradiance: 0,
            temperature: 0,
            online: false
        };
    }


    const age =
        Date.now() -
        data.lastUpdate;


    if (age > 30000) {

        return {

            irradiance: 0,
            temperature: 0,
            online: false
        };
    }


    return {

        irradiance:
            data.irradiance,

        temperature:
            data.temperature,

        online: true
    };
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getMQTTWeather,

    getGIIStatus: () => {

        if (
            Date.now() -
            giiStatus.lastUpdate >
            30000
        ) {

            return {
                online: false
            };
        }


        return {
            online: true
        };
    }
};
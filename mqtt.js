const mqtt = require("mqtt");
const db = require("./db");

// =====================================================
// LIVE WEATHER
// =====================================================
const latestWeather = {

    NLCIL: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
        lastUpdate: 0
    },

    NLCIC: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
        lastUpdate: 0
    },

    NTPL: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
        lastUpdate: 0
    },

    NUPPL: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
        lastUpdate: 0
    },

    BTPS: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
        lastUpdate: 0
    },

    LIBRARY: {
        irradiance: 0,
        temperature: 0,
        mqttTimestamp: null,
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
    horizontal_irradiance: 0,
    inclined_irradiance: 0,
    temperature: 0,
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

    horizontalCumulative: 0,
inclinedCumulative: 0,

calculationDate: null,

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

let giiDbSaveTimer = null;
let giiHasData = false;

// =====================================================
// WEATHER 10-SECOND CALCULATION MEMORY
// =====================================================

const weatherCalculation = {

    NLCIL: {
        previousIrradiance: null,
        previousTimestamp: null,
        cumulativeEnergy: 0,
        intervalEnergy: 0,
        latestIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,
        hasData: false,
         calculationDate: null
    },

    NLCIC: {
        previousIrradiance: null,
        previousTimestamp: null,
        cumulativeEnergy: 0,
        intervalEnergy: 0,
        latestIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,
        hasData: false,
         calculationDate: null
    },

    NTPL: {
        previousIrradiance: null,
        previousTimestamp: null,
        cumulativeEnergy: 0,
        intervalEnergy: 0,
        latestIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,
        hasData: false,
         calculationDate: null
    },

    NUPPL: {
        previousIrradiance: null,
        previousTimestamp: null,
        cumulativeEnergy: 0,
        intervalEnergy: 0,
        latestIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,
        hasData: false,
         calculationDate: null
    },

    BTPS: {
        previousIrradiance: null,
        previousTimestamp: null,
        cumulativeEnergy: 0,
        intervalEnergy: 0,
        latestIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,
        hasData: false,
         calculationDate: null
    }
};


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
// ALL MQTT DATA - 15 MINUTE DATABASE TIMER
// =====================================================

giiDbSaveTimer = setInterval(
    async () => {

        console.log(
            "⏱️ 15-MIN DATABASE TIMER TRIGGERED"
        );

        // =========================================
        // GII
        // =========================================

        await saveGII15Minute();


        // =========================================
        // WEATHER
        // =========================================

        await saveWeather15Minute("NLCIL");

        await saveWeather15Minute("NLCIC");

        await saveWeather15Minute("NTPL");

        await saveWeather15Minute("NUPPL");

        await saveWeather15Minute("BTPS");

    },
    FIFTEEN_MINUTES
);



// =====================================================
// TIMESTAMP
// =====================================================

function getDate(timestamp) {

    if (!timestamp) {
        return new Date();
    }

    const value = Number(timestamp);

    // MQTT timestamp in seconds
    if (!isNaN(value)) {

        // seconds → milliseconds
        if (value < 100000000000) {
            return new Date(value * 1000);
        }

        // already milliseconds
        return new Date(value);
    }

    // String / ISO timestamp
    const d = new Date(timestamp);

    if (isNaN(d.getTime())) {
        return new Date();
    }

    return d;
}


// =====================================================
// IST DATE KEY
// Used to detect new day
// =====================================================

function getISTDateKey(date) {

    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(date);

}


// =====================================================
// SAVE WEATHER
// 15 MIN ONLY
// =====================================================

async function saveWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp,
    cumulativeEnergy
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
    mqtt_timestamp,
    cumulative_irradiance
)
VALUES
(
    $1,
    $2,
    $3,
    $4,
    $5
)
            `,
       [
    campus,
    irradiance,
    temperature,
    mqttTimestamp instanceof Date
        ? mqttTimestamp.getTime()
        : getDate(mqttTimestamp).getTime(),
    cumulativeEnergy
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
// PROCESS WEATHER
// MQTT 10 SEC DATA
// MEMORY CALCULATION ONLY
// =====================================================

function processWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp
) {

    const memory =
        weatherCalculation[campus];

    if (!memory) {
        return;
    }


    const now =
        getDate(mqttTimestamp);

        // =========================================
// NEW DAY CHECK
// =========================================

const currentDate =
    getISTDateKey(now);

if (
    memory.calculationDate !== null &&
    memory.calculationDate !== currentDate
) {

    console.log(
        `🌅 NEW DAY | ${campus} | ` +
        `Previous: ${memory.calculationDate} | ` +
        `New: ${currentDate}`
    );

    // Reset daily cumulative
    memory.cumulativeEnergy = 0;

    // Reset 15-min interval
    memory.intervalEnergy = 0;

    // Start fresh from today's first reading
    memory.previousIrradiance = null;
    memory.previousTimestamp = null;

    memory.latestIrradiance = 0;
    memory.latestTemperature = 0;
    memory.latestTimestamp = null;

    memory.hasData = false;
}

// Always keep current calculation date
memory.calculationDate = currentDate;


    // =========================================
    // FIRST READING
    // =========================================

    if (
        memory.previousTimestamp === null
    ) {

        memory.previousIrradiance =
            irradiance;

        memory.previousTimestamp =
            now;

        memory.latestIrradiance =
            irradiance;

        memory.latestTemperature =
            temperature;

        memory.latestTimestamp =
            now;

        memory.hasData = true;

        console.log(
            `🟢 ${campus} MEMORY START | ` +
            `I:${irradiance} | T:${temperature}`
        );

        return;
    }


    // =========================================
    // TIME DIFFERENCE
    // =========================================

    let seconds =
        (
            now.getTime() -
            memory.previousTimestamp.getTime()
        ) / 1000;


    // MQTT normally 10 sec
    if (
        seconds <= 0 ||
        seconds > 60
    ) {
        seconds = 10;
    }


    // =========================================
    // IRRADIANCE CALCULATION
    // =========================================

    const averageIrradiance =
        (
            memory.previousIrradiance +
            irradiance
        ) / 2;


    const energy =
        averageIrradiance *
        seconds /
        3600;


   memory.cumulativeEnergy += energy;
memory.intervalEnergy += energy;


    // =========================================
    // UPDATE PREVIOUS
    // =========================================

    memory.previousIrradiance =
        irradiance;

    memory.previousTimestamp =
        now;


    // =========================================
    // LATEST VALUE
    // =========================================

    memory.latestIrradiance =
        irradiance;

    memory.latestTemperature =
        temperature;

    memory.latestTimestamp =
        now;

    memory.hasData = true;


    console.log(
        `📊 ${campus} MEMORY | ` +
        `I:${irradiance} | ` +
        `Cumulative:${memory.cumulativeEnergy.toFixed(3)}`
    );
}


// =====================================================
// GII 15 MIN SAVE
// =====================================================

async function saveGII(
    horizontal,
    inclined,
    temperature,
    mqttTimestamp,
       horizontalCumulative,
    inclinedCumulative
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
    mqtt_timestamp,
    horizontal_cumulative,
    inclined_cumulative
)
VALUES
(
    $1,
    $2,
    $3,
    $4,
    $5,
    $6
)
            `,
        [
    horizontal,
    inclined,
    temperature,
    mqttTimestamp instanceof Date
        ? mqttTimestamp.getTime()
        : getDate(mqttTimestamp).getTime(),
    horizontalCumulative,
    inclinedCumulative
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
// MEMORY ONLY
// =====================================================

async function processGII(
    horizontal,
    inclined,
    temperature,
    mqttTimestamp
) {

    const now = getDate(mqttTimestamp);
    // =========================================
// NEW DAY CHECK
// =========================================

const currentDate =
    getISTDateKey(now);

if (
    giiCalculation.calculationDate !== null &&
    giiCalculation.calculationDate !== currentDate
) {

    console.log(
        `🌅 NEW DAY | GII | ` +
        `Previous: ${giiCalculation.calculationDate} | ` +
        `New: ${currentDate}`
    );

    // Reset daily cumulative
    giiCalculation.horizontalCumulative = 0;
    giiCalculation.inclinedCumulative = 0;

    // Reset 15-min interval
    giiCalculation.horizontalEnergy = 0;
    giiCalculation.inclinedEnergy = 0;

    // Start fresh from today's first reading
    giiCalculation.previousHorizontal = null;
    giiCalculation.previousInclined = null;
    giiCalculation.previousTimestamp = null;

    giiCalculation.intervalStart = null;

    giiCalculation.latestHorizontal = 0;
    giiCalculation.latestInclined = 0;
    giiCalculation.latestTemperature = 0;
    giiCalculation.latestTimestamp = null;

    giiHasData = false;
}

giiCalculation.calculationDate =
    currentDate;

    // =========================================
    // FIRST READING
    // =========================================

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

        giiHasData = true;

        console.log(
            `🟢 GII MEMORY START | H:${horizontal} | I:${inclined}`
        );

        return;
    }


    // =========================================
    // TIME DIFFERENCE
    // =========================================

    let seconds =
        (
            now.getTime() -
            giiCalculation.previousTimestamp.getTime()
        ) / 1000;


    // MQTT normally 10 sec

    if (
        seconds <= 0 ||
        seconds > 60
    ) {

        seconds = 10;

    }


    // =========================================
    // HORIZONTAL ENERGY
    // =========================================

    const horizontalAverage =
        (
            giiCalculation.previousHorizontal +
            horizontal
        ) / 2;


    const horizontalEnergy =
        horizontalAverage *
        seconds /
        3600;


    // =========================================
    // INCLINED ENERGY
    // =========================================

    const inclinedAverage =
        (
            giiCalculation.previousInclined +
            inclined
        ) / 2;


    const inclinedEnergy =
        inclinedAverage *
        seconds /
        3600;


    // =========================================
    // MEMORY ACCUMULATION
    // =========================================

    giiCalculation.horizontalEnergy +=
        horizontalEnergy;

    giiCalculation.inclinedEnergy +=
        inclinedEnergy;

        giiCalculation.horizontalCumulative +=
    horizontalEnergy;

giiCalculation.inclinedCumulative +=
    inclinedEnergy;


    // =========================================
    // UPDATE PREVIOUS
    // =========================================

    giiCalculation.previousHorizontal =
        horizontal;

    giiCalculation.previousInclined =
        inclined;

    giiCalculation.previousTimestamp =
        now;


    // =========================================
    // LATEST LIVE VALUE
    // =========================================

    giiCalculation.latestHorizontal =
        horizontal;

    giiCalculation.latestInclined =
        inclined;

    giiCalculation.latestTemperature =
        temperature;

    giiCalculation.latestTimestamp =
        now;

    giiHasData = true;


    console.log(
        `📊 GII MEMORY | H:${horizontal} | I:${inclined} | ` +
        `H Energy:${giiCalculation.horizontalEnergy.toFixed(3)} | ` +
        `I Energy:${giiCalculation.inclinedEnergy.toFixed(3)}`
    );
}

    

// =====================================================
// GII 15 MINUTE DATABASE SAVE
// =====================================================

async function saveGII15Minute() {

    // No MQTT data
    if (!giiHasData) {

        console.log(
            "⏭️ GII 15-MIN SKIPPED | No MQTT data"
        );

        return;
    }


    const horizontal =
        giiCalculation.latestHorizontal;

    const inclined =
        giiCalculation.latestInclined;

    const temperature =
        giiCalculation.latestTemperature;

    const mqttTimestamp =
        giiCalculation.latestTimestamp;


    // =========================================
    // DON'T SAVE LOW / NIGHT DATA
    // =========================================

    if (
        horizontal <= 15 ||
        inclined <= 15
    ) {

        console.log(
            `⏭️ GII 15-MIN DB SKIPPED | ` +
            `H:${horizontal} | I:${inclined}`
        );

        resetGIIMemory();

        return;
    }


    try {

       await saveGII(
    horizontal,
    inclined,
    temperature,
    mqttTimestamp,
    giiCalculation.horizontalCumulative,
giiCalculation.inclinedCumulative
);


        console.log(
            `✅ GII 15-MIN DATABASE SAVED | ` +
            `H:${horizontal} | ` +
            `I:${inclined} | ` +
            `T:${temperature}`
        );


    }
    catch (err) {

        console.log(
            "❌ GII 15-MIN SAVE ERROR:",
            err.message
        );

    }


    // =========================================
    // RESET AFTER 15 MIN
    // =========================================

    resetGIIMemory();
}

// =====================================================
// WEATHER 15 MINUTE DATABASE SAVE
// =====================================================
// =====================================================
// WEATHER 15 MINUTE DATABASE SAVE
// =====================================================

async function saveWeather15Minute(campus) {

    const memory =
        weatherCalculation[campus];

    if (!memory) {
        return;
    }


    // =========================================
    // NO MQTT DATA
    // =========================================

    if (!memory.hasData) {

        console.log(
            `⏭️ ${campus} SKIPPED | No MQTT data`
        );

        return;
    }


    // =========================================
    // SAVE LATEST IRRADIANCE
    // =========================================

    const irradiance =
        memory.latestIrradiance;

    const temperature =
        memory.latestTemperature;

    const mqttTimestamp =
        memory.latestTimestamp;


    try {

       await saveWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp,
    memory.cumulativeEnergy
);


        console.log(
            `✅ ${campus} 15-MIN SAVED | ` +
            `I:${irradiance} | ` +
            `T:${temperature} | ` +
            `Cumulative:${memory.cumulativeEnergy.toFixed(3)}`
        );


        // =========================================
        // RESET AFTER SUCCESSFUL SAVE
        // =========================================

       memory.intervalEnergy = 0;

console.log(
    `🔄 ${campus} NEW 15-MIN INTERVAL | ` +
    `Cumulative continues:${memory.cumulativeEnergy.toFixed(3)}`
);

    }
    catch (err) {

        console.log(
            `❌ ${campus} 15-MIN SAVE ERROR:`,
            err.message
        );

        // DB fail என்றால் memory reset ஆகாது
    }
}


function resetGIIMemory() {

    giiCalculation.horizontalEnergy = 0;
    giiCalculation.inclinedEnergy = 0;

    giiCalculation.intervalStart =
        giiCalculation.latestTimestamp;

    giiHasData = false;

    console.log(
        `🔄 GII NEW 15-MIN INTERVAL | ` +
        `Cumulative continues`
    );
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


        if (topic === "test/rx") {

    const weather = {

        irradiance:
            Number(status.Pyranometer) || 0,

        temperature:
            (
                Number(
                    status.Module_temperature ||
                    status.Module_temp ||
                    0
                )
            ) / 10,

        mqttTimestamp:
            mqttTimestamp,

        lastUpdate:
            Date.now()
    };


    // =========================================
    // LIVE MEMORY
    // =========================================

    latestWeather.NLCIL = {
        ...weather
    };

    latestWeather.NLCIC = {
        ...weather
    };

    latestWeather.NTPL = {
        ...weather
    };

    // =========================================
// 10-SEC MEMORY CALCULATION
// =========================================

processWeather(
    "NLCIL",
    weather.irradiance,
    weather.temperature,
    weather.mqttTimestamp
);

processWeather(
    "NLCIC",
    weather.irradiance,
    weather.temperature,
    weather.mqttTimestamp
);

processWeather(
    "NTPL",
    weather.irradiance,
    weather.temperature,
    weather.mqttTimestamp
);

    console.log(
        `🌤️ TEST/RX LIVE | ` +
        `NLCIL/NLCIC/NTPL | ` +
        `I:${weather.irradiance} | ` +
        `T:${weather.temperature}`
    );
}

       if (topic === "nuppl/rx") {

    latestWeather.NUPPL = {

        irradiance:
            Number(status.Param_1) || 0,

        temperature:
            (
                Number(status.Param_2) || 0
            ) / 10,

        mqttTimestamp:
            mqttTimestamp,

        lastUpdate:
            Date.now()
    };

    processWeather(
    "NUPPL",
    latestWeather.NUPPL.irradiance,
    latestWeather.NUPPL.temperature,
    latestWeather.NUPPL.mqttTimestamp
);

    console.log(
        `🌤️ NUPPL LIVE | ` +
        `I:${latestWeather.NUPPL.irradiance} | ` +
        `T:${latestWeather.NUPPL.temperature}`
    );
}

     // =================================================
// GII
// =================================================

if (topic === "library/rx") {

    giiStatus.lastUpdate = Date.now();
    giiStatus.online = true;

    const subDeviceId =
        data.payload?.[0]?.subDeviceId;


    // ---------------------------------------------
    // HORIZONTAL SENSOR
    // ---------------------------------------------

  if (subDeviceId === "ttyCOM1_1") {

    const horizontal =
        Number(status.Param_1) || 0;

    const temperature =
        (Number(status.Param_2) || 0) / 10;

    // =========================================
    // GII LIVE UPDATE - IMMEDIATE
    // =========================================

    giiStatus.online = true;
    giiStatus.horizontal_irradiance = horizontal;
    giiStatus.temperature = temperature;
    giiStatus.lastUpdate = Date.now();

    // Existing calculation memory
    giiCalculation.latestHorizontal =
        horizontal;

    giiCalculation.latestTemperature =
        temperature;

    giiCalculation.latestTimestamp =
        mqttTimestamp;

    // 15-min buffer
    giiBuffer.horizontal =
        horizontal;

    giiBuffer.temperature =
        temperature;

    giiBuffer.mqttTimestamp =
        mqttTimestamp;

    console.log(
        `🔥 GII HORIZONTAL LIVE | H:${horizontal} | T:${temperature}`
    );
}


    // ---------------------------------------------
    // INCLINED SENSOR
    // ---------------------------------------------

   if (subDeviceId === "ttyCOM1_2") {

    const inclined =
        Number(status.Param_3) || 0;

    // =========================================
    // GII LIVE UPDATE - IMMEDIATE
    // =========================================

    giiStatus.online = true;
    giiStatus.inclined_irradiance = inclined;
    giiStatus.lastUpdate = Date.now();

    // Existing calculation memory
    giiCalculation.latestInclined =
        inclined;

    giiCalculation.latestTimestamp =
        mqttTimestamp;

    // 15-min buffer
    giiBuffer.inclined =
        inclined;

    console.log(
        `🔥 GII INCLINED LIVE | I:${inclined}`
    );
}

    // ---------------------------------------------
    // BOTH AVAILABLE
    // 15-MIN CALCULATION ONLY
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
        giiBuffer.horizontal = null;
        giiBuffer.inclined = null;
        giiBuffer.temperature = null;
        giiBuffer.mqttTimestamp = null;
    }
}


        // =================================================
        // BTPS
        // =================================================

       if (topic === "rajashthan/rx") {

    const weather = {

        irradiance:
            Number(status.Pyranometer) || 0,

        temperature:
            (
                Number(
                    status.Module_temperature ||
                    status.Module_temp ||
                    0
                )
            ) / 10,

        mqttTimestamp:
            mqttTimestamp,

        lastUpdate:
            Date.now()
    };


    latestWeather.BTPS = {
        ...weather
    };

processWeather(
    "BTPS",
    weather.irradiance,
    weather.temperature,
    weather.mqttTimestamp
);
       console.log(
        `🌤️ RAJASHTHAN/RX LIVE | ` +
        `BTPS | ` +
        `I:${weather.irradiance} | ` +
        `T:${weather.temperature}`
    );
}


// =====================================================
// CLOSE MQTT MESSAGE HANDLER
// =====================================================

    } catch (err) {

        console.error(
            "MQTT MESSAGE ERROR ❌:",
            err.message
        );

    }
});


// =====================================================
// LIVE WEATHER
// =====================================================

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

    const age =
        Date.now() - giiStatus.lastUpdate;

    // MQTT data not received for 30 sec
    if (age > 30000) {

        return {
            online: false,
            horizontal_irradiance: 0,
            inclined_irradiance: 0,
            temperature: 0,
            lastUpdate: giiStatus.lastUpdate
        };
    }

    return {
        online: true,

        horizontal_irradiance:
            giiStatus.horizontal_irradiance,

        inclined_irradiance:
            giiStatus.inclined_irradiance,

        temperature:
            giiStatus.temperature,

        lastUpdate:
            giiStatus.lastUpdate
    };
}
};
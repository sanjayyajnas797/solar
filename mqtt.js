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
    inclinedIrradiance: 0,
    temperature: 0,
    mqttTimestamp: null,
    lastUpdate: 0
},

    BTPS: {
    irradiance: 0,
    inclinedIrradiance: 0,
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
        previousInclined: null,
        previousTimestamp: null,

        cumulativeEnergy: 0,
        intervalEnergy: 0,

        inclinedCumulative: 0,
        inclinedIntervalEnergy: 0,

        latestIrradiance: 0,
        latestInclinedIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,

        hasData: false,
        calculationDate: null
    },

    NLCIC: {
        previousIrradiance: null,
        previousInclined: null,
        previousTimestamp: null,

        cumulativeEnergy: 0,
        intervalEnergy: 0,

        inclinedCumulative: 0,
        inclinedIntervalEnergy: 0,

        latestIrradiance: 0,
        latestInclinedIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,

        hasData: false,
        calculationDate: null
    },

    NTPL: {
        previousIrradiance: null,
        previousInclined: null,
        previousTimestamp: null,

        cumulativeEnergy: 0,
        intervalEnergy: 0,

        inclinedCumulative: 0,
        inclinedIntervalEnergy: 0,

        latestIrradiance: 0,
        latestInclinedIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,

        hasData: false,
        calculationDate: null
    },

    NUPPL: {
        previousIrradiance: null,
        previousInclined: null,
        previousTimestamp: null,

        cumulativeEnergy: 0,
        intervalEnergy: 0,

        inclinedCumulative: 0,
        inclinedIntervalEnergy: 0,

        latestIrradiance: 0,
        latestInclinedIrradiance: 0,
        latestTemperature: 0,
        latestTimestamp: null,

        hasData: false,
        calculationDate: null
    },

    BTPS: {
        previousIrradiance: null,
        previousInclined: null,
        previousTimestamp: null,

        cumulativeEnergy: 0,
        intervalEnergy: 0,

        inclinedCumulative: 0,
        inclinedIntervalEnergy: 0,

        latestIrradiance: 0,
        latestInclinedIrradiance: 0,
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

client.on("connect", async () => {

    console.log("MQTT Connected ✅");

    await loadCumulativeFromDatabase();

    client.subscribe([
    "test/rx",
    "rajashthan/rx",
    "nuppl/rx",
    "ntpl/rx",
    "library/rx"
], {
    qos: 0
});

    console.log("Subscribed All Topics ✅");
});



// =====================================================
// ALL MQTT DATA - 15 MINUTE DATABASE TIMER
// =====================================================

// =====================================================
// CLOCK-ALIGNED 15 MINUTE DATABASE SAVE
// 10:00, 10:15, 10:30, 10:45...
// =====================================================

function start15MinuteDatabaseScheduler() {

    const scheduleNextSave = () => {

        const now = new Date();

        const next = new Date(now);

        // Next 15-minute boundary
        const currentMinutes = now.getMinutes();

        const nextQuarter =
            Math.floor(currentMinutes / 15) * 15 + 15;

        if (nextQuarter >= 60) {

            next.setHours(
                now.getHours() + 1,
                0,
                0,
                0
            );

        } else {

            next.setMinutes(
                nextQuarter,
                0,
                0
            );

        }

        const delay =
            next.getTime() - now.getTime();

        console.log(
            `⏰ NEXT 15-MIN DATABASE SAVE: ${next.toLocaleTimeString()}`
        );

        giiDbSaveTimer = setTimeout(
            async () => {

                console.log(
                    "⏱️ CLOCK-ALIGNED 15-MIN SAVE"
                );

                try {

                    const saveTime = new Date(next);

await Promise.all([

    saveGII15Minute(saveTime),

    saveWeather15Minute("NLCIL", saveTime),
    saveWeather15Minute("NLCIC", saveTime),
    saveWeather15Minute("NTPL", saveTime),
    saveWeather15Minute("NUPPL", saveTime),
    saveWeather15Minute("BTPS", saveTime)

]);

                }
                catch (err) {

                    console.error(
                        "❌ 15-MIN DATABASE SAVE ERROR:",
                        err.message
                    );

                }

                // Schedule next 15-minute boundary
                scheduleNextSave();

            },
            delay
        );

    };

    scheduleNextSave();
}


// Start scheduler
start15MinuteDatabaseScheduler();


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

async function loadCumulativeFromDatabase() {

    console.log("🔄 Loading TODAY cumulative values...");

    const campuses = [
        "NLCIL",
        "NLCIC",
        "NTPL",
        "NUPPL",
        "BTPS"
    ];

    for (const campus of campuses) {

        try {

            const result = await db.query(`
                SELECT
    irradiance,
    inclined_irradiance,
    temperature,
    cumulative_irradiance,
    inclined_cumulative,
    mqtt_timestamp
FROM weather_logs
                WHERE UPPER(TRIM(campus)) = $1
                AND (
                    to_timestamp(mqtt_timestamp / 1000)
                    AT TIME ZONE 'Asia/Kolkata'
                )::date = (
                    CURRENT_TIMESTAMP
                    AT TIME ZONE 'Asia/Kolkata'
                )::date
                ORDER BY mqtt_timestamp DESC
                LIMIT 1
            `, [campus]);

            const memory = weatherCalculation[campus];

            if (!memory) continue;

            // =========================================
            // NO TODAY DATA
            // =========================================

            if (result.rows.length === 0) {

                memory.cumulativeEnergy = 0;
                memory.intervalEnergy = 0;

                memory.previousIrradiance = null;
                memory.previousTimestamp = null;

                memory.latestIrradiance = 0;
                memory.latestTemperature = 0;

                memory.calculationDate = getISTDateKey(new Date());

                if (
                    campus === "NUPPL" ||
                    campus === "BTPS" ||
                    campus === "NTPL"
                ) {
                    memory.inclinedCumulative = 0;
                    memory.inclinedIntervalEnergy = 0;
                    memory.previousInclined = null;
                    memory.previousInclinedTimestamp = null;
                    memory.latestInclinedIrradiance = 0;
                }

                console.log(
                    `🆕 ${campus} | NO TODAY DATA | Cumulative START = 0`
                );

                continue;
            }

            // =========================================
            // TODAY DATA EXISTS
            // =========================================

            const row = result.rows[0];

            // =============================================
// RESTORE LAST WEATHER READING
// =============================================

weatherCalculation[campus].previousIrradiance =
    Number(row.irradiance) || 0;

weatherCalculation[campus].previousTimestamp =
    getDate(row.mqtt_timestamp);

weatherCalculation[campus].latestIrradiance =
    Number(row.irradiance) || 0;

weatherCalculation[campus].latestTemperature =
    Number(row.temperature) || 0;

weatherCalculation[campus].latestTimestamp =
    getDate(row.mqtt_timestamp);

weatherCalculation[campus].hasData = true;

            memory.cumulativeEnergy =
                Number(row.cumulative_irradiance) || 0;

            memory.previousIrradiance =
                Number(row.irradiance) || 0;

           memory.previousTimestamp =
    new Date(Number(row.mqtt_timestamp));

            memory.latestIrradiance =
                Number(row.irradiance) || 0;

            memory.latestTemperature =
                Number(row.temperature) || 0;

            memory.calculationDate =
                getISTDateKey(
                    new Date(Number(row.mqtt_timestamp))
                );

            // =========================================
            // INCLINED DATA
            // =========================================

          if (campus === "BTPS") {

    // =========================================
    // BTPS - START INCLINED CUMULATIVE FROM 0
    // =========================================

    weatherCalculation[campus].inclinedCumulative = 0;

    weatherCalculation[campus].previousInclined =
        Number(row.inclined_irradiance) || 0;

    weatherCalculation[campus].previousInclinedTimestamp =
        getDate(row.mqtt_timestamp);

    weatherCalculation[campus].latestInclinedIrradiance =
        Number(row.inclined_irradiance) || 0;

    memory.inclinedCumulative = 0;

    memory.previousInclined =
        Number(row.inclined_irradiance) || 0;

    memory.previousInclinedTimestamp =
        new Date(Number(row.mqtt_timestamp));

    memory.latestInclinedIrradiance =
        Number(row.inclined_irradiance) || 0;

    memory.inclinedIntervalEnergy = 0;

    console.log(
        `♻️ ${campus} TODAY RESTORED | ` +
        `Normal:${memory.cumulativeEnergy.toFixed(3)} | ` +
        `Inclined:0.000 | ` +
        `Previous I:${memory.previousIrradiance} | ` +
        `Previous GII:${memory.previousInclined}`
    );

} else if (
    campus === "NUPPL" ||
    campus === "NTPL"
) {

    // =========================================
    // NUPPL / NTPL - EXISTING LOGIC
    // =========================================

    weatherCalculation[campus].inclinedCumulative =
        Number(row.inclined_cumulative) || 0;

    weatherCalculation[campus].previousInclined =
        Number(row.inclined_irradiance) || 0;

    weatherCalculation[campus].previousInclinedTimestamp =
        getDate(row.mqtt_timestamp);

    weatherCalculation[campus].latestInclinedIrradiance =
        Number(row.inclined_irradiance) || 0;

    memory.inclinedCumulative =
        Number(row.inclined_cumulative) || 0;

    memory.previousInclined =
        Number(row.inclined_irradiance) || 0;

    memory.previousInclinedTimestamp =
        new Date(Number(row.mqtt_timestamp));

    memory.latestInclinedIrradiance =
        Number(row.inclined_irradiance) || 0;

    memory.inclinedIntervalEnergy = 0;

    console.log(
        `♻️ ${campus} TODAY RESTORED | ` +
        `Normal:${memory.cumulativeEnergy.toFixed(3)} | ` +
        `Inclined:${memory.inclinedCumulative.toFixed(3)} | ` +
        `Previous I:${memory.previousIrradiance} | ` +
        `Previous GII:${memory.previousInclined}`
    );

} else {

    console.log(
        `♻️ ${campus} TODAY RESTORED | ` +
        `Normal:${memory.cumulativeEnergy.toFixed(3)} | ` +
        `Previous I:${memory.previousIrradiance}`
    );
}

        } catch (err) {

            console.error(
                `❌ ${campus} cumulative restore error:`,
                err.message
            );
        }
    }

    console.log("✅ TODAY CUMULATIVE RESTORE COMPLETED");
}

async function saveWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp,
    cumulativeEnergy,
    inclinedIrradiance = 0,
    inclinedCumulative = 0
) {

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
                inclined_irradiance,
                temperature,
                mqtt_timestamp,
                cumulative_irradiance,
                inclined_cumulative
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
                campus,
                irradiance,
                inclinedIrradiance,
                temperature,

                mqttTimestamp instanceof Date
                    ? mqttTimestamp.getTime()
                    : getDate(mqttTimestamp).getTime(),

                cumulativeEnergy,
                inclinedCumulative
            ]
        );

        console.log(
            `✅ WEATHER SAVED | ${campus} | ` +
            `I:${irradiance} | ` +
            `Inclined:${inclinedIrradiance} | ` +
            `Cum:${Number(cumulativeEnergy).toFixed(3)} | ` +
            `Inclined Cum:${Number(inclinedCumulative).toFixed(3)}`
        );

    } catch (err) {

        console.log(
            "Weather DB Insert Error ❌",
            err.message
        );
    }
}
function processWeather(
    campus,
    irradiance,
    temperature,
    mqttTimestamp,
    inclinedIrradiance = null
) {

    const memory = weatherCalculation[campus];

    if (!memory) {
        return;
    }

    const now = getDate(mqttTimestamp);

   // ==========================================
// IGNORE OLD / RETAINED MQTT DATA
// ==========================================

const incomingDateKey = getISTDateKey(now);
const todayDateKey = getISTDateKey(new Date());

if (incomingDateKey !== todayDateKey) {
    console.log(
        `🛑 ${campus} OLD MQTT DATA IGNORED | ` +
        `Incoming: ${incomingDateKey} | ` +
        `Today: ${todayDateKey}`
    );

    return;
}

    // =========================================
    // NEW DAY CHECK
    // =========================================

    const currentDate = getISTDateKey(now);

    if (
        memory.calculationDate !== null &&
        memory.calculationDate !== currentDate
    ) {

        console.log(
            `🌅 NEW DAY | ${campus} | ` +
            `Previous: ${memory.calculationDate} | ` +
            `New: ${currentDate}`
        );

        // Existing irradiance reset
        memory.cumulativeEnergy = 0;
        memory.intervalEnergy = 0;
        memory.previousIrradiance = null;

       // Inclined irradiance reset
if (
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
) {

    memory.inclinedCumulative = 0;
    memory.inclinedIntervalEnergy = 0;
    memory.previousInclined = null;

    memory.latestInclinedIrradiance = 0;
}
        memory.previousTimestamp = null;

        memory.latestIrradiance = 0;
        memory.latestTemperature = 0;
        memory.latestTimestamp = null;

        memory.hasData = false;
    }

    memory.calculationDate = currentDate;

    // =========================================
    // FIRST READING
    // =========================================

    if (memory.previousTimestamp === null) {

        memory.previousIrradiance = irradiance;

       if (
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
) {

    memory.previousInclined =
        Number(inclinedIrradiance) || 0;

    memory.latestInclinedIrradiance =
        Number(inclinedIrradiance) || 0;
}

        memory.previousTimestamp = now;

        memory.latestIrradiance = irradiance;
        memory.latestTemperature = temperature;
        memory.latestTimestamp = now;

        memory.hasData = true;

        console.log(
            `🟢 ${campus} MEMORY START | ` +
            `I:${irradiance} | ` +
            `T:${temperature}` +
            (
                campus === "NUPPL"
                    ? ` | Inclined:${Number(inclinedIrradiance) || 0}`
                    : ""
            )
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
    // NORMAL IRRADIANCE CALCULATION
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
    // NUPPL INCLINED IRRADIANCE CALCULATION
    // SAME AS GII FORMULA
    // =========================================
if (
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
) {

    const currentInclined =
        Number(inclinedIrradiance) || 0;

    const inclinedAverage =
        (
            memory.previousInclined +
            currentInclined
        ) / 2;

    const inclinedEnergy =
        inclinedAverage *
        seconds /
        3600;

    memory.inclinedCumulative +=
        inclinedEnergy;

    memory.inclinedIntervalEnergy +=
        inclinedEnergy;

    memory.previousInclined =
        currentInclined;

    memory.latestInclinedIrradiance =
        currentInclined;
}
    // =========================================
    // UPDATE PREVIOUS
    // =========================================

    memory.previousIrradiance = irradiance;
    memory.previousTimestamp = now;

    // =========================================
    // LATEST VALUE
    // =========================================

    memory.latestIrradiance = irradiance;
    memory.latestTemperature = temperature;
    memory.latestTimestamp = now;

    memory.hasData = true;
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


    
}

    

// =====================================================
// GII 15 MINUTE DATABASE SAVE
// =====================================================

async function saveGII15Minute(saveTime) {

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
    saveTime;

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
async function saveWeather15Minute(campus, saveTime) {

    const memory = weatherCalculation[campus];

    if (!memory) {
        return;
    }

    if (!memory.hasData) {

        console.log(
            `⏭️ ${campus} SKIPPED | No MQTT data`
        );

        return;
    }

    const irradiance = memory.latestIrradiance;
    const temperature = memory.latestTemperature;

const inclinedIrradiance =
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
        ? memory.latestInclinedIrradiance
        : 0;

const inclinedCumulative =
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
        ? memory.inclinedCumulative
        : 0;

    try {

        await saveWeather(
            campus,
            irradiance,
            temperature,
            saveTime,
            memory.cumulativeEnergy,
            inclinedIrradiance,
            inclinedCumulative
        );

        // Normal 15-min interval reset
        memory.intervalEnergy = 0;

        // NUPPL inclined interval reset
     if (
    campus === "NUPPL" ||
    campus === "BTPS" ||
    campus === "NTPL"
) {
    memory.inclinedIntervalEnergy = 0;
}

        console.log(
            `🔄 ${campus} NEW 15-MIN INTERVAL | ` +
            `Cumulative continues:${memory.cumulativeEnergy.toFixed(3)}` +
            (
                campus === "NUPPL"
                    ? ` | Inclined:${memory.inclinedCumulative.toFixed(3)}`
                    : ""
            )
        );

    } catch (err) {

        console.log(
            `❌ ${campus} 15-MIN SAVE ERROR:`,
            err.message
        );
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



   
}
if (topic === "nuppl/rx") {

    const oldNuppl = latestWeather.NUPPL || {};

    latestWeather.NUPPL = {

        ...oldNuppl,

        irradiance:
            status.Param_1 !== undefined
                ? Number(status.Param_1)
                : oldNuppl.irradiance || 0,

        temperature:
            status.Param_2 !== undefined
                ? Number(status.Param_2) / 10
                : oldNuppl.temperature || 0,

        inclinedIrradiance:
            status.Param_3 !== undefined
                ? Number(status.Param_3)
                : oldNuppl.inclinedIrradiance || 0,

        mqttTimestamp: mqttTimestamp,
        lastUpdate: Date.now()
    };


    // Param_1 + Param_2 + Param_3 values merge ஆன பிறகு
    // ஒரே ஒரு முறை cumulative calculation
    if (status.Param_3 !== undefined) {

        processWeather(
            "NUPPL",
            latestWeather.NUPPL.irradiance,
            latestWeather.NUPPL.temperature,
            latestWeather.NUPPL.mqttTimestamp,
            latestWeather.NUPPL.inclinedIrradiance
        );

    }


  
}


// =====================================================
// NTPL MQTT
//
// Param_1 -> Horizontal Irradiance
// Param_2 -> Module Temperature
// Param_3 -> Inclined Irradiance
// =====================================================

if (topic === "ntpl/rx") {

    const oldNtpl =
        latestWeather.NTPL || {};

    // =========================================
    // MERGE ALL NTPL PARAMETERS
    // =========================================

    latestWeather.NTPL = {

        ...oldNtpl,

        // Horizontal Irradiance
        irradiance:
            status.Param_1 !== undefined
                ? Number(status.Param_1)
                : oldNtpl.irradiance || 0,

        // Module Temperature
        temperature:
            status.Param_2 !== undefined
                ? Number(status.Param_2) / 10
                : oldNtpl.temperature || 0,

        // Inclined Irradiance
        inclinedIrradiance:
            status.Param_3 !== undefined
                ? Number(status.Param_3)
                : oldNtpl.inclinedIrradiance || 0,

        mqttTimestamp:
            mqttTimestamp,

        lastUpdate:
            Date.now()
    };


    // =========================================
    // PROCESS NTPL WEATHER
    // ANY PARAMETER UPDATE
    // =========================================

    processWeather(
        "NTPL",

        latestWeather.NTPL.irradiance,

        latestWeather.NTPL.temperature,

        latestWeather.NTPL.mqttTimestamp,

        latestWeather.NTPL.inclinedIrradiance
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

if (topic === "rajashthan/rx") {

    const oldBtps =
        latestWeather.BTPS || {};

    latestWeather.BTPS = {

        ...oldBtps,

        irradiance:
            status.Param_1 !== undefined
                ? Number(status.Param_1)
                : oldBtps.irradiance || 0,

        temperature:
            status.Param_2 !== undefined
                ? Number(status.Param_2) / 10
                : oldBtps.temperature || 0,

        inclinedIrradiance:
            status.Param_3 !== undefined
                ? Number(status.Param_3)
                : oldBtps.inclinedIrradiance || 0,

        mqttTimestamp:
            mqttTimestamp,

        lastUpdate:
            Date.now()
    };


    // =========================================
    // Param_1 + Param_2 + Param_3
    // MERGED DATA → ONE CALCULATION
    // =========================================

    if (status.Param_3 !== undefined) {

        processWeather(
            "BTPS",
            latestWeather.BTPS.irradiance,
            latestWeather.BTPS.temperature,
            latestWeather.BTPS.mqttTimestamp,
            latestWeather.BTPS.inclinedIrradiance
        );

    }

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
            inclinedIrradiance: 0,
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
            inclinedIrradiance: 0,
            online: false
        };
    }


    return {

        irradiance:
            data.irradiance || 0,

        temperature:
            data.temperature || 0,

        inclinedIrradiance:
            data.inclinedIrradiance || 0,

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
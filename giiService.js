const db = require("./db");

// ================= Latest GII Logs =================

async function getGIILogs() {

    const { rows } = await db.query(`
        SELECT *
        FROM gii_weather_logs
        ORDER BY id DESC
        LIMIT 100
    `);

    return rows;

}

// ================= Today Summary =================

async function getGIIToday() {

    const { rows } = await db.query(`
        SELECT
            COUNT(*) AS total_records,

            AVG(horizontal_irradiance) AS avg_horizontal,

            MAX(horizontal_irradiance) AS max_horizontal,

            AVG(inclined_irradiance) AS avg_inclined,

            MAX(inclined_irradiance) AS max_inclined,

            AVG(temperature) AS avg_temperature,

            MAX(temperature) AS max_temperature

        FROM gii_weather_logs

        WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata')
              = CURRENT_DATE
    `);

    return rows[0];

}

// ================= Detailed Report =================

async function getGIIReport() {

    const { rows } = await db.query(`
        SELECT
            created_at,
            mqtt_timestamp,
            horizontal_irradiance,
            inclined_irradiance,
            temperature
        FROM gii_weather_logs
        ORDER BY mqtt_timestamp ASC
    `);

    const report = [];

    let cumulativeHorizontal = 0;
    let cumulativeInclined = 0;

    for (let i = 0; i < rows.length; i++) {

        const current = rows[i];

        let horizontalEnergy = 0;
        let inclinedEnergy = 0;

        if (i > 0) {

            const previous = rows[i - 1];

            const currentDate =
                new Date(current.created_at)
                .toISOString()
                .split("T")[0];

            const previousDate =
                new Date(previous.created_at)
                .toISOString()
                .split("T")[0];

            if (currentDate === previousDate) {

                const interval =
                    current.mqtt_timestamp -
                    previous.mqtt_timestamp;

                if (interval > 0 && interval <= 30) {

                    horizontalEnergy =
                        (current.horizontal_irradiance * interval) / 3600;

                    inclinedEnergy =
                        (current.inclined_irradiance * interval) / 3600;

                }

            } else {

                cumulativeHorizontal = 0;
                cumulativeInclined = 0;

            }

        }

        cumulativeHorizontal += horizontalEnergy;
        cumulativeInclined += inclinedEnergy;

        report.push({

            time: current.created_at,

            horizontal:
                current.horizontal_irradiance,

            inclined:
                current.inclined_irradiance,

            temperature:
                current.temperature,

            horizontalEnergy:
                Number(horizontalEnergy.toFixed(2)),

            inclinedEnergy:
                Number(inclinedEnergy.toFixed(2)),

            horizontalCumulative:
                Number(cumulativeHorizontal.toFixed(2)),

            inclinedCumulative:
                Number(cumulativeInclined.toFixed(2))

        });

    }

    return report;

}

async function getLatestGII() {

    const { rows } = await db.query(`
        SELECT
            horizontal_irradiance,
            inclined_irradiance,
            temperature
        FROM gii_weather_logs
        ORDER BY id DESC
        LIMIT 1
    `);

    return rows[0] || {
        horizontal_irradiance: 0,
        inclined_irradiance: 0,
        temperature: 0
    };

}



module.exports = {

    getGIILogs,
    getGIIToday,
    getGIIReport,
    getLatestGII

};
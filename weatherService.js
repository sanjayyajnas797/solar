const db = require("./db");

// =====================================================
// LATEST LOGS
// =====================================================

async function getWeatherLogs() {

    const { rows } = await db.query(`
       SELECT
        id,
        created_at,
        mqtt_timestamp,
        horizontal_irradiance,
        inclined_irradiance,
        temperature,
        horizontal_cumulative,
        inclined_cumulative
    FROM gii_weather_logs
    ORDER BY id DESC
    LIMIT 100
    `);

    return rows;
}


// =====================================================
// TODAY SUMMARY
// =====================================================

async function getTodaySummary() {

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

        WHERE DATE(
            created_at AT TIME ZONE 'Asia/Kolkata'
        ) = CURRENT_DATE
    `);

    return rows[0];
}


// =====================================================
// GII DAILY CUMULATIVE
// =====================================================

async function getDailyCumulative() {

    const { rows } = await db.query(`
        SELECT
            created_at,
            mqtt_timestamp,
            horizontal_irradiance,
            inclined_irradiance

        FROM gii_weather_logs

        WHERE DATE(
            created_at AT TIME ZONE 'Asia/Kolkata'
        ) = CURRENT_DATE

        ORDER BY mqtt_timestamp ASC
    `);


    let horizontalCumulative = 0;
    let inclinedCumulative = 0;

    const result = [];


    for (let i = 0; i < rows.length; i++) {

        const current = rows[i];

        let horizontalEnergy = 0;
        let inclinedEnergy = 0;


        // ---------------------------------------------
        // Calculate energy between two readings
        // ---------------------------------------------

        if (i > 0) {

            const previous = rows[i - 1];


            const currentTime =
                Number(current.mqtt_timestamp);

            const previousTime =
                Number(previous.mqtt_timestamp);


            const diff =
                currentTime - previousTime;


            // Accept normal 15-minute interval
            // Allow maximum 20 minutes
            if (diff > 0 && diff <= 1200) {

                // Trapezoidal calculation

                horizontalEnergy =
                    (
                        Number(previous.horizontal_irradiance) +
                        Number(current.horizontal_irradiance)
                    ) / 2
                    * diff / 3600;


                inclinedEnergy =
                    (
                        Number(previous.inclined_irradiance) +
                        Number(current.inclined_irradiance)
                    ) / 2
                    * diff / 3600;
            }
        }


        horizontalCumulative += horizontalEnergy;

        inclinedCumulative += inclinedEnergy;


        result.push({

            time: current.created_at,

            horizontal:
                Number(current.horizontal_irradiance),

            inclined:
                Number(current.inclined_irradiance),

            horizontalCumulative:
                Number(
                    horizontalCumulative.toFixed(2)
                ),

            inclinedCumulative:
                Number(
                    inclinedCumulative.toFixed(2)
                )
        });
    }


    return result;
}


// =====================================================
// INTERVAL FILTER
// =====================================================

function filterByInterval(
    fullReport,
    interval = "15"
) {

    // 15 minute is now the default
    if (interval === "10") {
        return fullReport;
    }


    const bucketMinutes = {

        "15": 15,

        "30": 30,

        "60": 60

    }[interval];


    // Invalid interval
    if (!bucketMinutes) {
        return fullReport;
    }


    const report = [];

    const buckets = new Map();


    for (const row of fullReport) {

        const d = new Date(row.time);


        // ---------------------------------------------
        // Bucket start
        // ---------------------------------------------

        const bucket = new Date(d);

        bucket.setSeconds(0);

        bucket.setMilliseconds(0);


        if (bucketMinutes === 60) {

            bucket.setMinutes(0);

        }
        else {

            const minutes =
                Math.floor(
                    d.getMinutes() /
                    bucketMinutes
                ) * bucketMinutes;

            bucket.setMinutes(minutes);
        }


        const key =
            bucket.getTime();


        const diff =
            Math.abs(
                d.getTime() - key
            );


        if (!buckets.has(key)) {

            buckets.set(key, {

                row,

                diff

            });

        }
        else {

            if (
                diff <
                buckets.get(key).diff
            ) {

                buckets.set(key, {

                    row,

                    diff

                });
            }
        }
    }


    return Array
        .from(buckets.values())
        .map(x => x.row)
        .sort(
            (a, b) =>
                new Date(a.time) -
                new Date(b.time)
        );
}


// =====================================================
// WEATHER DETAILED REPORT
// =====================================================

async function getDetailedReport(
    campus,
    fromDate,
    toDate,
    interval = "15"
) {

    // =================================================
    // GET STORED 15-MINUTE WEATHER DATA
    // =================================================

    const { rows } = await db.query(`
       SELECT
    to_char(
        created_at AT TIME ZONE 'Asia/Kolkata',
        'YYYY-MM-DD HH24:MI:SS'
    ) AS created_at,

    mqtt_timestamp,
    irradiance,
    inclined_irradiance,
    temperature,
    cumulative_irradiance,
    inclined_cumulative

FROM weather_logs

        WHERE campus = $1

        AND DATE(
            created_at AT TIME ZONE 'Asia/Kolkata'
        )
        BETWEEN $2::date AND $3::date

        ORDER BY mqtt_timestamp ASC;

    `, [
        campus,
        fromDate,
        toDate
    ]);


    // =================================================
    // DIRECTLY USE DATABASE CUMULATIVE VALUE
    // =================================================
const fullReport = rows.map(row => ({

    time:
        row.created_at,

    irradiance:
        Number(row.irradiance || 0),

    inclinedIrradiance:
        Number(row.inclined_irradiance || 0),

    temperature:
        Number(row.temperature || 0),

    cumulative:
        Number(
            Number(row.cumulative_irradiance || 0)
                .toFixed(2)
        ),

    inclinedCumulative:
        Number(
            Number(row.inclined_cumulative || 0)
                .toFixed(2)
        )

}));

    // =================================================
    // FILTER ONLY FOR DISPLAY
    // =================================================

    let report = [];


    if (interval === "10") {

        report = fullReport;

    } else {

        const gapSeconds = {

            "15": 15 * 60,

            "30": 30 * 60,

            "60": 60 * 60

        }[interval];


        // Invalid interval

        if (!gapSeconds) {

            report = fullReport;

        } else {

            let lastTime = null;


            for (const row of fullReport) {

                const currentTime =
                    new Date(row.time).getTime();


                if (!lastTime) {

                    report.push(row);

                    lastTime = currentTime;

                    continue;
                }


                const diff =
                    (
                        currentTime -
                        lastTime
                    ) / 1000;


                if (diff >= gapSeconds) {

                    report.push(row);

                    lastTime = currentTime;
                }
            }
        }
    }


    // =================================================
    // SUMMARY
    // =================================================

    const summary = {

        campus,

        date: fromDate,

        records:
            report.length,

        totalEnergy:
            report.length > 0
                ? report[
                    report.length - 1
                  ].cumulative
                : 0
    };


    return {

        summary,

        rows: report

    };
}

async function getGIIDetailedReport(
    campus,
    fromDate,
    toDate,
    interval = "15"
) {
    try {

        console.log(
            `📊 GII REPORT | Campus: ${campus} | From: ${fromDate} | To: ${toDate} | Interval: ${interval}`
        );

        let rows = [];

        // =====================================================
        // 1. NLC TA BUILDING
        //    Data comes from gii_weather_logs
        // =====================================================

        if (
            campus === "GII" ||
            campus === "NLC TA BUILDING"
        ) {

            const result = await db.query(
                `
                SELECT
                    to_char(
                        created_at AT TIME ZONE 'Asia/Kolkata',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS time,

                    mqtt_timestamp,

                    horizontal_irradiance,

                    inclined_irradiance,

                    temperature,

                    horizontal_cumulative,

                    inclined_cumulative

                FROM gii_weather_logs

                WHERE DATE(
                    created_at AT TIME ZONE 'Asia/Kolkata'
                )
                BETWEEN $1::date AND $2::date

                ORDER BY mqtt_timestamp ASC
                `,
                [
                    fromDate,
                    toDate
                ]
            );

            rows = result.rows;

        }

        // =====================================================
        // 2. ALL OTHER CAMPUSES
        //    BTPS / NTPL / NUPPL / NLCIL
        //    Data comes from weather_logs
        //    campus column separates each campus
        // =====================================================

        else {

            const result = await db.query(
                `
                SELECT

                    to_char(
                        to_timestamp(mqtt_timestamp / 1000)
                            AT TIME ZONE 'Asia/Kolkata',
                        'YYYY-MM-DD HH24:MI:SS'
                    ) AS time,

                    mqtt_timestamp,

                    irradiance,

                    inclined_irradiance,

                    temperature,

                    cumulative_irradiance,

                    inclined_cumulative

                FROM weather_logs

                WHERE UPPER(TRIM(campus))
                    = UPPER(TRIM($1))

                AND DATE(
                    to_timestamp(mqtt_timestamp / 1000)
                        AT TIME ZONE 'Asia/Kolkata'
                )
                BETWEEN $2::date AND $3::date

                ORDER BY mqtt_timestamp ASC
                `,
                [
                    campus,
                    fromDate,
                    toDate
                ]
            );

            rows = result.rows;
        }

        console.log(
            `📦 ${campus} | DB Records: ${rows.length}`
        );

        // =====================================================
        // 3. FORMAT COMMON DATA
        //    Same output structure for ALL campuses
        // =====================================================

        const fullReport = rows.map(row => {

            const horizontal =
                campus === "NLC TA BUILDING" ||
                campus === "GII"
                    ? Number(row.horizontal_irradiance ?? 0)
                    : Number(row.irradiance ?? 0);

            const inclined =
                Number(row.inclined_irradiance ?? 0);

            const horizontalCumulative =
                campus === "NLC TA BUILDING" ||
                campus === "GII"
                    ? Number(row.horizontal_cumulative ?? 0)
                    : Number(row.cumulative_irradiance ?? 0);

            const inclinedCumulative =
                Number(row.inclined_cumulative ?? 0);

            return {

                time: row.time,

                horizontal: horizontal,

                temperature:
                    Number(row.temperature ?? 0),

                inclined: inclined,

                horizontalCumulative:
                    Number(
                        horizontalCumulative.toFixed(2)
                    ),

                inclinedCumulative:
                    Number(
                        inclinedCumulative.toFixed(2)
                    )
            };
        });

        // =====================================================
        // 4. INTERVAL FILTER
        // =====================================================

        let report = [];

        if (interval === "10") {

            report = fullReport;

        } else {

            const gapSeconds = {

                "15": 15 * 60,

                "30": 30 * 60,

                "60": 60 * 60

            }[interval];

            // Invalid interval
            if (!gapSeconds) {

                report = fullReport;

            } else {

                let lastTime = null;

                for (const row of fullReport) {

                    const currentTime =
                        new Date(row.time).getTime();

                    if (!lastTime) {

                        report.push(row);

                        lastTime = currentTime;

                        continue;
                    }

                    const diff =
                        (
                            currentTime -
                            lastTime
                        ) / 1000;

                    if (diff >= gapSeconds) {

                        report.push(row);

                        lastTime = currentTime;
                    }
                }
            }
        }

        // =====================================================
        // 5. SUMMARY
        // =====================================================

        const lastRow =
            report.length > 0
                ? report[report.length - 1]
                : null;

        const summary = {

            campus: campus,

            date: fromDate,

            records:
                report.length,

            totalHorizontalEnergy:
                lastRow
                    ? Number(
                        lastRow.horizontalCumulative
                    )
                    : 0,

            totalInclinedEnergy:
                lastRow
                    ? Number(
                        lastRow.inclinedCumulative
                    )
                    : 0
        };

        console.log(
            `✅ ${campus} REPORT | Records: ${summary.records} | ` +
            `Horizontal: ${summary.totalHorizontalEnergy} | ` +
            `Inclined: ${summary.totalInclinedEnergy}`
        );

        return {

            summary,

            rows: report

        };

    }
    catch (error) {

        console.error(
            `❌ GII REPORT ERROR | ${campus}:`,
            error
        );

        throw error;
    }
        } 
// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getWeatherLogs,

    getTodaySummary,

    getDailyCumulative,

    getGIIDetailedReport,

    getDetailedReport

};
const db = require("./db");

// =====================================================
// LATEST LOGS
// =====================================================

async function getWeatherLogs() {

    const { rows } = await db.query(`
        SELECT *
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
// GII DETAILED REPORT
// =====================================================

async function getGIIDetailedReport(

    fromDate,

    toDate,

    interval = "15"

) {


    const { rows } = await db.query(`

        SELECT

            to_char(
                created_at AT TIME ZONE 'Asia/Kolkata',
                'YYYY-MM-DD HH24:MI:SS'
            ) AS created_at,

            mqtt_timestamp,

            horizontal_irradiance,

            inclined_irradiance,

            temperature

        FROM gii_weather_logs

        WHERE DATE(
            created_at AT TIME ZONE 'Asia/Kolkata'
        )
        BETWEEN $1::date AND $2::date

        ORDER BY mqtt_timestamp ASC;

    `, [
        fromDate,
        toDate
    ]);


    // =================================================
    // CALCULATE CUMULATIVE
    // USING ALL 15-MINUTE DATABASE ROWS
    // =================================================

    const fullReport = [];


    let horizontalCumulative = 0;

    let inclinedCumulative = 0;


    for (
        let i = 0;
        i < rows.length;
        i++
    ) {

        const current = rows[i];


        let horizontalEnergy = 0;

        let inclinedEnergy = 0;


        // =================================================
        // BETWEEN CURRENT AND PREVIOUS READING
        // =================================================

        if (i > 0) {

            const previous =
                rows[i - 1];


            const currentDate =
                current.created_at
                    .split(" ")[0];


            const previousDate =
                previous.created_at
                    .split(" ")[0];


            // Same day only
            if (
                currentDate ===
                previousDate
            ) {


                const currentTimestamp =
                    Number(
                        current.mqtt_timestamp
                    );


                const previousTimestamp =
                    Number(
                        previous.mqtt_timestamp
                    );


                const diff =
                    currentTimestamp -
                    previousTimestamp;


                // =================================================
                // 15 MIN DATA
                //
                // Normal:
                // 900 seconds
                //
                // Allow up to:
                // 1200 seconds = 20 minutes
                // =================================================

                if (
                    diff > 0 &&
                    diff <= 1200
                ) {


                    // ---------------------------------------------
                    // Horizontal
                    // ---------------------------------------------

                    horizontalEnergy =

                        (
                            Number(
                                previous.horizontal_irradiance
                            ) +

                            Number(
                                current.horizontal_irradiance
                            )

                        ) / 2

                        * diff

                        / 3600;


                    // ---------------------------------------------
                    // Inclined
                    // ---------------------------------------------

                    inclinedEnergy =

                        (
                            Number(
                                previous.inclined_irradiance
                            ) +

                            Number(
                                current.inclined_irradiance
                            )

                        ) / 2

                        * diff

                        / 3600;
                }

            }
            else {

                // New day
                horizontalCumulative = 0;

                inclinedCumulative = 0;
            }
        }


        // =================================================
        // ADD ENERGY
        // =================================================

        horizontalCumulative +=
            horizontalEnergy;


        inclinedCumulative +=
            inclinedEnergy;


        // =================================================
        // REPORT ROW
        // =================================================

        fullReport.push({

            time:
                current.created_at,


            horizontal:
                Number(
                    current.horizontal_irradiance
                ),


            temperature:
                Number(
                    current.temperature
                ),


            inclined:
                Number(
                    current.inclined_irradiance
                ),


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


    // =================================================
    // FILTER ONLY FOR DISPLAY
    // =================================================

    const report =
        filterByInterval(
            fullReport,
            interval
        );


    // =================================================
    // SUMMARY
    // =================================================

    const summary = {

        campus: "GII",

        date: fromDate,

        records:
            report.length,


        horizontalTotal:

            report.length > 0

                ? report[
                    report.length - 1
                  ].horizontalCumulative

                : 0,


        inclinedTotal:

            report.length > 0

                ? report[
                    report.length - 1
                  ].inclinedCumulative

                : 0
    };


    return {

        summary,

        rows: report

    };
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    getWeatherLogs,

    getTodaySummary,

    getDailyCumulative,

    getGIIDetailedReport

};
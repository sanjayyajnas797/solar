const db = require("./db");

// ================= Latest Logs =================

async function getWeatherLogs() {

    const { rows } = await db.query(`
        SELECT *
        FROM weather_logs
        ORDER BY id DESC
        LIMIT 100
    `);

    return rows;
}

// ================= Today Summary =================

async function getTodaySummary() {

    const { rows } = await db.query(`
        SELECT
            campus,
            COUNT(*) AS total_records,
            AVG(irradiance) AS avg_irradiance,
            MAX(irradiance) AS max_irradiance,
            AVG(temperature) AS avg_temperature,
            MAX(temperature) AS max_temperature
        FROM weather_logs
        WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata') = CURRENT_DATE
        GROUP BY campus
        ORDER BY campus
    `);

    return rows;
}

// ================= Daily Cumulative =================

async function getDailyCumulative() {

    const { rows } = await db.query(`
        SELECT
            campus,
            created_at,
            mqtt_timestamp,
            irradiance
        FROM weather_logs
        WHERE campus IS NOT NULL
        ORDER BY campus, mqtt_timestamp ASC
    `);

    const summary = {};

    for (let i = 0; i < rows.length; i++) {

        const current = rows[i];

        const date = new Date(current.created_at)
            .toLocaleDateString("en-CA", {
                timeZone: "Asia/Kolkata"
            });

        const key = `${current.campus}_${date}`;

        if (!summary[key]) {

            summary[key] = {
                campus: current.campus,
                date,
                cumulative_irradiance: 0
            };

        }

        if (i > 0) {

            const previous = rows[i - 1];

            // Same campus only
            if (previous.campus === current.campus) {

                const previousDate = new Date(previous.created_at)
                    .toLocaleDateString("en-CA", {
                        timeZone: "Asia/Kolkata"
                    });

                // Same day only
                if (previousDate === date) {

                    const interval =
                        current.mqtt_timestamp -
                        previous.mqtt_timestamp;

                    if (interval > 0 && interval <= 30) {

                        summary[key].cumulative_irradiance +=
                            (current.irradiance * interval) / 3600;

                    }

                }

            }

        }

    }

    return Object.values(summary).map(item => ({

        campus: item.campus,

        date: item.date,

        cumulative_irradiance:
            Number(item.cumulative_irradiance.toFixed(2))

    }));

}

function filterByInterval(fullReport, interval) {

    if (interval === "10") {
        return fullReport;
    }

    const bucketMinutes = {
        "15": 15,
        "30": 30,
        "60": 60
    }[interval];

    const report = [];
    const buckets = new Map();

    for (const row of fullReport) {

        const d = new Date(row.time);

        // Bucket Start
        const bucket = new Date(d);

        bucket.setSeconds(0);
        bucket.setMilliseconds(0);

        if (bucketMinutes === 60) {

            bucket.setMinutes(0);

        } else {

            const m =
                Math.floor(d.getMinutes() / bucketMinutes) *
                bucketMinutes;

            bucket.setMinutes(m);

        }

        const key = bucket.getTime();

        const diff =
            Math.abs(d.getTime() - key);

        if (!buckets.has(key)) {

            buckets.set(key, {
                row,
                diff
            });

        } else {

            if (diff < buckets.get(key).diff) {

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

// ================= Detailed Report =================

// ================= Detailed Report =================

async function getDetailedReport(
    campus,
    fromDate,
    toDate,
    interval = "10"
){

    const { rows } = await db.query(`
SELECT
    to_char(
        created_at AT TIME ZONE 'Asia/Kolkata',
        'YYYY-MM-DD HH24:MI:SS'
    ) AS created_at,
    mqtt_timestamp,
    irradiance,
    temperature
FROM weather_logs
WHERE campus = $1
AND created_at <= NOW()
AND DATE(created_at AT TIME ZONE 'Asia/Kolkata')
    BETWEEN $2::date AND $3::date
ORDER BY created_at ASC;
`, [campus, fromDate, toDate]);

    console.table(rows.slice(0,5));
    console.log("Campus :", campus);
    console.log("From :", fromDate);
    console.log("To :", toDate);
    console.table(rows.slice(-10));

    // ==========================================
    // FIRST CALCULATE CUMULATIVE USING ALL DATA
    // ==========================================

    const fullReport = [];

    let cumulative = 0;

    for(let i=0;i<rows.length;i++){

        const current = rows[i];

        let energy = 0;

        if(i > 0){

            const previous = rows[i-1];

            const currentDate = current.created_at.split(" ")[0];
            const previousDate = previous.created_at.split(" ")[0];

            if(currentDate === previousDate){

                const diff =
                    current.mqtt_timestamp -
                    previous.mqtt_timestamp;

                if(diff > 0 && diff <= 30){

                    energy =
                        (current.irradiance * diff) / 3600;

                }

            }else{

                cumulative = 0;

            }

        }

        cumulative += energy;

        fullReport.push({

            time: current.created_at,

            irradiance: current.irradiance,

            temperature: current.temperature,

            cumulative: Number(cumulative.toFixed(2))

        });

    }

    // ==========================================
    // FILTER ONLY FOR DISPLAY
    // ==========================================
const report =
    filterByInterval(
        fullReport,
        interval
    );

    // ==========================================
    // SUMMARY
    // ==========================================

    const summary = {

        campus,

        date: fromDate,

        records: report.length,

        totalEnergy:
            report.length > 0
                ? report[report.length - 1].cumulative
                : 0

    };

    return {

        summary,

        rows: report

    };

}

// ================= GII Detailed Report =================

async function getGIIDetailedReport(
    fromDate,
    toDate,
    interval = "10"
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

WHERE DATE(created_at AT TIME ZONE 'Asia/Kolkata')
BETWEEN $1::date
AND $2::date

ORDER BY created_at ASC;
`, [fromDate, toDate]);

    // ==========================================
    // CALCULATE USING ALL ROWS
    // ==========================================

    const fullReport = [];

    let horizontalCumulative = 0;
    let inclinedCumulative = 0;

    for (let i = 0; i < rows.length; i++) {

        const current = rows[i];

        let horizontalEnergy = 0;
        let inclinedEnergy = 0;

        if (i > 0) {

            const previous = rows[i - 1];

            const currentDate =
                current.created_at.split(" ")[0];

            const previousDate =
                previous.created_at.split(" ")[0];

            if (currentDate === previousDate) {

                const diff =
                    current.mqtt_timestamp -
                    previous.mqtt_timestamp;

                if (diff > 0 && diff <= 30) {

                    horizontalEnergy =
                        (current.horizontal_irradiance * diff) / 3600;

                    inclinedEnergy =
                        (current.inclined_irradiance * diff) / 3600;

                }

            }
            else {

                horizontalCumulative = 0;
                inclinedCumulative = 0;

            }

        }

        horizontalCumulative += horizontalEnergy;
        inclinedCumulative += inclinedEnergy;

        fullReport.push({

            time: current.created_at,

            horizontal:
                current.horizontal_irradiance,

            temperature:
                current.temperature,

            inclined:
                current.inclined_irradiance,

            horizontalCumulative:
                Number(horizontalCumulative.toFixed(2)),

            inclinedCumulative:
                Number(inclinedCumulative.toFixed(2))

        });

    }

    // ==========================================
    // FILTER ONLY DISPLAY
    // ==========================================

   const report =
    filterByInterval(
        fullReport,
        interval
    );
    // ==========================================
    // SUMMARY
    // ==========================================

    const summary = {

        campus: "GII",

        date: fromDate,

        records: report.length,

        horizontalTotal:
            report.length > 0
                ? report[report.length - 1].horizontalCumulative
                : 0,

        inclinedTotal:
            report.length > 0
                ? report[report.length - 1].inclinedCumulative
                : 0

    };

    return {

        summary,

        rows: report

    };

}
module.exports = {

    getWeatherLogs,
    getTodaySummary,
    getDailyCumulative,
    getDetailedReport,
     getGIIDetailedReport

};
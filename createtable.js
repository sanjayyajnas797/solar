
const db = require("./db");

async function checkTestRxWeather() {
    try {
        const selectedDate = "2026-11-14";

        console.log("\n");
        console.log("==============================================================");
        console.log("                 TEST / RX WEATHER DATA REPORT");
        console.log("==============================================================");
        console.log(" Date       :", selectedDate);
        console.log(" Interval   : 2 Seconds");
        console.log(" Timezone   : Asia/Kolkata (IST)");
        console.log(" Table      : weather_logs");
        console.log("==============================================================\n");

        const result = await db.query(`
            SELECT
                TO_CHAR(
                    TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                    AT TIME ZONE 'Asia/Kolkata',
                    'DD-MM-YYYY HH24:MI:SS'
                ) AS ist_time,

                campus,
                irradiance AS horizontal_irradiance,
                inclined_irradiance,
                temperature,
                inclined_cumulative,

                ROUND(
                    (mqtt_timestamp - previous_timestamp) / 1000.0,
                    2
                ) AS gap_seconds

            FROM (
                SELECT
                    *,
                    LAG(mqtt_timestamp) OVER (
                        PARTITION BY UPPER(TRIM(campus))
                        ORDER BY mqtt_timestamp ASC
                    ) AS previous_timestamp

                FROM weather_logs

                WHERE (
                    TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                    AT TIME ZONE 'Asia/Kolkata'
                )::date = $1::date

                AND UPPER(TRIM(campus)) = 'NLCIL'

            ) AS weather_data

            ORDER BY mqtt_timestamp DESC
            LIMIT 100;
        `, [selectedDate]);

        const formattedRows = result.rows.map((row, index) => ({
            "S.No": index + 1,
            "IST Time": row.ist_time,
            "Campus": row.campus,
            "Horizontal Irr.": row.horizontal_irradiance,
            "Inclined Irr.": row.inclined_irradiance,
            "Temperature": row.temperature,
            "Inclined Cum.": row.inclined_cumulative,
            "Gap (Sec)": row.gap_seconds
        }));

        console.log("TEST / RX WEATHER - LATEST 100 RECORDS\n");
        console.table(formattedRows);

        const countResult = await db.query(`
            SELECT
                COUNT(*) AS total_records,
                MIN(mqtt_timestamp) AS first_timestamp,
                MAX(mqtt_timestamp) AS last_timestamp
            FROM weather_logs
            WHERE (
                TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                AT TIME ZONE 'Asia/Kolkata'
            )::date = $1::date
            AND UPPER(TRIM(campus)) = 'NLCIL';
        `, [selectedDate]);

        const summary = countResult.rows[0];

        console.log("\n==============================================================");
        console.log("                    REPORT SUMMARY");
        console.log("==============================================================");

        console.log("Selected Date      :", selectedDate);
        console.log("Campus             : NLCIL");
        console.log("Total Records      :", summary.total_records);
        console.log("Displayed Records  :", result.rows.length);
        console.log("Data Interval      : 2 Seconds");
        console.log("Timezone           : IST");

        console.log("==============================================================");
        console.log("           TEST / RX WEATHER CHECK COMPLETED");
        console.log("==============================================================\n");

        process.exit(0);

    } catch (err) {
        console.error("\nTEST / RX WEATHER ERROR:", err);
        process.exit(1);
    }
}

checkTestRxWeather();

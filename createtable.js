
const db = require("./db");

async function checkLibraryGII() {
    try {
        const selectedDate = "2026-11-12";

        console.log("\n");
        console.log("==============================================================");
        console.log("                 LIBRARY GII DATA REPORT");
        console.log("==============================================================");
        console.log(" Date       :", selectedDate);
        console.log(" Interval   : 2 Seconds");
        console.log(" Timezone   : Asia/Kolkata (IST)");
        console.log("==============================================================\n");

        const result = await db.query(`
            SELECT
                TO_CHAR(
                    TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                    AT TIME ZONE 'Asia/Kolkata',
                    'DD-MM-YYYY HH24:MI:SS'
                ) AS ist_time,

                horizontal_irradiance,
                inclined_irradiance,
                temperature,

                horizontal_cumulative,
                inclined_cumulative,

                ROUND(
                    (mqtt_timestamp - previous_timestamp) / 1000.0,
                    2
                ) AS gap_seconds

            FROM (
                SELECT
                    *,
                    LAG(mqtt_timestamp) OVER (
                        ORDER BY mqtt_timestamp ASC
                    ) AS previous_timestamp

                FROM gii_weather_logs

                WHERE (
                    TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                    AT TIME ZONE 'Asia/Kolkata'
                )::date = $1::date

            ) AS gii_data

            ORDER BY mqtt_timestamp DESC
            LIMIT 100;
        `, [selectedDate]);

        const formattedRows = result.rows.map((row, index) => ({
            "S.No": index + 1,
            "IST Time": row.ist_time,
            "Horizontal Irr.": row.horizontal_irradiance,
            "Inclined Irr.": row.inclined_irradiance,
            "Temperature": row.temperature,
            "Horizontal Cum.": row.horizontal_cumulative,
            "Inclined Cum.": row.inclined_cumulative,
            "Gap (Sec)": row.gap_seconds
        }));

        console.log("LIBRARY GII READINGS - LATEST 100 RECORDS\n");

        console.table(formattedRows);

        const countResult = await db.query(`
            SELECT COUNT(*) AS total_records
            FROM gii_weather_logs
            WHERE (
                TO_TIMESTAMP(mqtt_timestamp / 1000.0)
                AT TIME ZONE 'Asia/Kolkata'
            )::date = $1::date;
        `, [selectedDate]);

        console.log("\n==============================================================");
        console.log("                    REPORT SUMMARY");
        console.log("==============================================================");

        console.log(" Selected Date       :", selectedDate);
        console.log(" Total Records       :", countResult.rows[0].total_records);
        console.log(" Displayed Records   :", result.rows.length);
        console.log(" Data Interval       : 2 Seconds");
        console.log(" Timezone            : IST");

        console.log("==============================================================");
        console.log("              LIBRARY GII CHECK COMPLETED");
        console.log("==============================================================\n");

        process.exit(0);

    } catch (err) {
        console.error("\nLIBRARY GII ERROR:", err.message);
        process.exit(1);
    }
}

checkLibraryGII();

const db = require("./db");

async function deleteBTPS() {
    try {
        console.log("\n========================================");
        console.log("     DELETING BTPS TODAY DATA");
        console.log("========================================\n");

        const result = await db.query(`
            DELETE FROM weather_logs
            WHERE UPPER(TRIM(campus)) = 'BTPS'
              AND DATE(
                  to_timestamp(mqtt_timestamp / 1000)
                  AT TIME ZONE 'Asia/Kolkata'
              ) = '2026-10-24'
        `);

        console.log("✅ BTPS TODAY RECORDS DELETED:", result.rowCount);

        console.log("\n========================================");
        console.log("     BTPS TODAY DELETE COMPLETED");
        console.log("========================================\n");

        process.exit(0);

    } catch (err) {
        console.error("❌ ERROR:", err.message);
        process.exit(1);
    }
}

deleteBTPS();
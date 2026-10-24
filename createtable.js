const db = require("./db");

async function deleteBTPS() {
    try {
        console.log("\n========================================");
        console.log("        DELETING BTPS DATA");
        console.log("========================================\n");

        const result = await db.query(`
            DELETE FROM weather_logs
            WHERE UPPER(TRIM(campus)) = 'BTPS'
        `);

        console.log("✅ BTPS RECORDS DELETED:", result.rowCount);

        console.log("\n========================================");
        console.log("        BTPS DELETE COMPLETED");
        console.log("========================================\n");

        process.exit(0);

    } catch (err) {

        console.error("❌ ERROR:", err.message);

        process.exit(1);
    }
}

deleteBTPS();
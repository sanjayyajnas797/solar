const db = require("./db");

async function alterTable() {
  try {
    await db.query(`
     ALTER TABLE gii_weather_logs
ADD COLUMN horizontal_cumulative DOUBLE PRECISION DEFAULT 0,
ADD COLUMN inclined_cumulative DOUBLE PRECISION DEFAULT 0;
    `);

    console.log("✅ campus column added successfully");
  } catch (err) {
    console.log("❌ Error:", err.message);
  } finally {
    process.exit();
  }
}

alterTable();
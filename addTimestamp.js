const db = require("./db");

async function addTimestamp() {
  try {
    await db.query(`
      ALTER TABLE weather_logs
      ADD COLUMN IF NOT EXISTS mqtt_timestamp BIGINT;
    `);

    console.log("✅ mqtt_timestamp column added successfully");
  } catch (err) {
    console.log("❌ Error:", err.message);
  } finally {
    process.exit();
  }
}

addTimestamp();
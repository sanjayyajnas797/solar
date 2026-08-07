const db = require("./db");

async function alterTable() {
  try {
    await db.query(`
      ALTER TABLE weather_logs
      ADD COLUMN IF NOT EXISTS campus VARCHAR(30);
    `);

    console.log("✅ campus column added successfully");
  } catch (err) {
    console.log("❌ Error:", err.message);
  } finally {
    process.exit();
  }
}

alterTable();
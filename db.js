const { Pool } = require("pg");

const pool = new Pool({
  host: "solar-weather-db.ccxemvloc4oq.ap-south-1.rds.amazonaws.com",
  port: 5432,
  user: "postgres",
  password: "Solar#2026",
  database: "postgres",
  ssl: {
    rejectUnauthorized: false,
  },
});

// 👇 இதை add பண்ணு
pool.on("connect", async (client) => {
    await client.query("SET TIME ZONE 'Asia/Kolkata'");
    console.log("Timezone set to Asia/Kolkata");
});

pool.connect()
.then(() => {
    console.log("✅ AWS PostgreSQL Connected");
})
.catch((err) => {
    console.error("❌ Database Connection Error:", err.message);
});

module.exports = pool;
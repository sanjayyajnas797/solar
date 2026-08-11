 require("dotenv").config();

 const express = require("express");
 const cors = require("cors");
 const comperrision=require('compression')
 const routes = require("./router");
 const weatherRouter = require("./weatherRouter");
 const giiRouter = require("./giiRouter");

 const app = express();

 app.use(cors());

 app.use(express.json());
 app.use(comperrision())
 app.use("/api/weather", weatherRouter);
 app.use("/api/gii", giiRouter);
 app.use("/api", routes);
 const db=require('./db')

 app.get("/test", (req, res) => {
  res.json({ status: "OK" });
});

 app.get("/", (req, res) => {
    res.send("Backend running ✅");
 });

 const PORT = process.env.PORT || 5000;

 app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
});


// const db = require("./db");

// async function checkGII() {
//     try {

//         const { rows } = await db.query(`
//           SELECT
//     id,
//     created_at,
//     mqtt_timestamp,
//     horizontal_irradiance,
//     inclined_irradiance,
//     temperature
// FROM gii_weather_logs
// ORDER BY id DESC
// LIMIT 10;
//         `);

//         console.table(rows);

//         process.exit(0);

//     } catch (err) {

//         console.error("❌ DB ERROR:", err.message);

//         process.exit(1);
//     }
// }

// checkGII();
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

 app.get("/", (req, res) => {
    res.send("Backend running ✅");
 });

 const PORT = process.env.PORT || 5000;

 app.listen(PORT, () => {
     console.log(`Server running on port ${PORT}`);
});


// const db = require("./db");

// (async () => {

// const { rows } = await db.query(`
// SELECT
//     id,
//     campus,
//     irradiance,
//     temperature,
//     mqtt_timestamp,
//     to_char(
//         created_at AT TIME ZONE 'Asia/Kolkata',
//         'YYYY-MM-DD HH24:MI:SS'
//     ) AS created_at
// FROM weather_logs
// WHERE campus = 'BTPS'
// AND created_at >= NOW() - INTERVAL '1 hour'
// ORDER BY created_at;
// `);

// console.table(rows);

// })();
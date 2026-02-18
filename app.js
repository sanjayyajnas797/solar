require("dotenv").config();

const express = require("express");
const cors = require("cors");
const comperrision=require('compression')
const routes = require("./router");

const app = express();

app.use(cors());
app.use(express.json());
app.use(comperrision())
app.use("/api", routes);

app.get("/", (req, res) => {
    res.send("Backend running ✅");
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

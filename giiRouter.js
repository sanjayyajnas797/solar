const express = require("express");

const router = express.Router();

const {

    getGIILogs,
    getGIIToday,
    getGIIReport,
    getLatestGII

} = require("./giiService");


// ================= Latest Logs =================

router.get("/logs", async (req, res) => {

    try {

        const data = await getGIILogs();

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


// ================= Today Summary =================

router.get("/today", async (req, res) => {

    try {

        const data = await getGIIToday();

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


// ================= Detailed Report =================

router.get("/report", async (req, res) => {

    try {

        const data = await getGIIReport();

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

router.get("/latest", async (req, res) => {

    try {

        res.json(await getLatestGII());

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});

module.exports = router;
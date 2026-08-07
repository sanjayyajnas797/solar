const express = require("express");
const router = express.Router();
const {
    getWeatherLogs,
    getTodaySummary,
    getDailyCumulative,
    getDetailedReport,
    getGIIDetailedReport
} = require("./weatherService");

// Weather Logs
router.get("/logs", async (req, res) => {
  try {
    const data = await getWeatherLogs();

   res.json(data);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/today", async (req, res) => {
  try {
    const data = await getTodaySummary();
    res.json(data);
  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});

// Daily Cumulative Irradiance
router.get("/cumulative", async (req, res) => {

    try {

        const data = await getDailyCumulative();

        res.json(data);

    } catch (err) {

        res.status(500).json({
            error: err.message
        });

    }

});


// Detailed Weather Report

router.get("/report/:campus", async (req, res) => {

    try {

        const { campus } = req.params;
        const { from, to, interval } = req.query;

        const data = await getDetailedReport(
            campus,
            from,
            to,
            interval
        );

        res.json(data);

    } catch (err) {

        console.error(err);

        res.status(500).json({
            error: err.message
        });

    }

});

// ================= GII Report =================

router.get("/gii-report", async (req, res) => {

    try {

       const { from, to, interval } = req.query;

const data = await getGIIDetailedReport(
    from,
    to,
    interval
);

        res.json(data);

    }

    catch (err) {

        res.status(500).json({

            error: err.message

        });

    }

});

module.exports = router;
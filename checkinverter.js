
const express = require("express");
const { getInverterHistory } = require("./deye");

const app = express();
const PORT = 5001;

app.get("/api/inverter-history/:stationId", async (req, res) => {
    try {
        const { stationId } = req.params;
        const { date } = req.query;

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Date is required in YYYY-MM-DD format"
            });
        }

        console.log("Deye Inverter History Request:", {
            stationId,
            date
        });

        const data = await getInverterHistory(stationId, date);

        return res.json({
            success: true,
            stationId,
            date,
            timeRange: "10:00:00 - 17:00:00 IST",
            count: data.length,
            data
        });

    } catch (error) {
        console.error(
            "Inverter History API Error:",
            error.response?.data || error.message
        );

        return res.status(500).json({
            success: false,
            message: error.response?.data || error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Inverter Test API running on port ${PORT}`);
});

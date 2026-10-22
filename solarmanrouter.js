

const express=require('express')
const router=express.Router()

const {Solarbuildings}=require('./serversolarman')
const {Devicelist,RealTimePower,HistoryPower,SolarmanGraph,getSolarmanInverterHistoricalEnergy}=require('./solarman')

router.get('/solarbuildings',Solarbuildings)
router.get("/solardevice/:Stationid/devices", Devicelist);
router.get("/solarman/:stationId/realtime", RealTimePower);
router.get("/solarman/:stationId/history", HistoryPower);
router.get("/solarman/:stationId/graph", SolarmanGraph);
router.get(
  "/test-solarman-inverter-energy/:stationId/:date",
  async (req, res) => {

    try {

      const {
        stationId,
        date
      } = req.params;

      const data =
        await getSolarmanInverterHistoricalEnergy(
          stationId,
          date
        );

      res.json({
        success: true,
        data
      });

    } catch (error) {

      console.error(
        "Solarman inverter energy test error:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          error.response?.data ||
          error.message
      });
    }
  }
);
module.exports=router

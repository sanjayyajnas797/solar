const express = require("express");

const router = express.Router();

const {

    getMainBuildingData,

    getSubBuildings,

  getLast10DaysData,

    login,

    getWeather,

    getGraph,

    

   

} = require("./service");


// LOGIN

router.post("/login", (req, res) => {

    try {

        const token =
            login(
                req.body.email,
                req.body.password
            );

        res.json({
            success: true,
            token
        });

    }
    catch (err) {

        res.status(401).json({
            success: false,
            message: err.message
        });

    }

});


// MAIN BUILDING

router.get(
    "/main-building",
    async (req, res) => {

        res.json(
            await getMainBuildingData()
        );

    }
);


// SUB BUILDINGS

router.get(
    "/sub-buildings",
    async (req, res) => {

        res.json(
            await getSubBuildings()
        );

    }
);


// GRAPH

// GRAPH

router.get(
    "/graph/:type/:stationId",
    async (req, res) => {

        try {

            const data =
                await getGraph(
                    req.params.type,       // ✅ type first
                    req.params.stationId  // ✅ stationId second
                );

            res.json(data);

        }
        catch (err) {

            res.status(500).json({
                error: err.message
            });

        }

    }
);



// ================= CUSTOM DATE GRAPH =================

router.get(
    "/graph/:stationId",
    async (req, res) => {
        try {

            const { stationId } = req.params;
            const { date } = req.query;

            const data =
                await getGraph(
                    "custom",      // 👈 new type
                    stationId,
                    date           // 👈 pass date
                );

            res.json(data);

        }
        catch (err) {

            res.status(500).json({
                error: err.message
            });

        }
    }
);













// WEATHER BY CAMPUS

router.get("/weather/:campus", async(req,res)=>{

    try{

        const campus = req.params.campus;

        const weather =
            await getWeather(campus);

        res.json(weather);

    }
    catch(err){

        res.status(500).json({
            error: err.message
        });

    }

});




// ================= LAST 10 DAYS =================
router.get(
  "/last10days/:stationId",
  async (req, res) => {
    try {

      const data =
        await getLast10DaysData(
          req.params.stationId
        );

      res.json(data);

    } catch (err) {

      res.status(500).json({
        error: err.message
      });

    }
  }
);




module.exports = router;
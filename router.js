const express = require("express");

const router = express.Router();

const {

    getMainBuildingData,

    getSubBuildings,

  getLast10DaysData,

    login,

    getWeather,

    getGraph,

    getReportData,

    getCampusReport,

    
   getPgtInverterEnergy,

   getPgtReport,

   

   getNUPPLPgtReport,

   getNUPPLPgtStations,

   getNLCILPgtSummary,

   getNUPPLPgtSummary,

   getBTPSPgtReport,
   getBTPSPgtStations,
   getBTPSPgtSummary,
   getAllNLCILPgtStations,
   
   getNTPLPgtStations,
   getNTPLPgtReport
   

} = require("./service");

const { getGIIStatus } = require("./mqtt");

const {
    getActiveAlerts
} = require("./alertService");

const db = require("./db");


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


// ================= GII LIVE STATUS =================

router.get("/gii/latest", async (req, res) => {

    try {

        const status = getGIIStatus();

        res.json(status);

    }
    catch (err) {

        console.error("GII LIVE ERROR:", err.message);

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

// ================= CAMPUS CONSOLIDATED REPORT =================

router.get(
  "/report/campus/:campus",
  async (req, res) => {

    try {

      const { campus } = req.params;
      const { from, to } = req.query;

      console.log("=================================");
      console.log("CAMPUS REPORT");
      console.log("Campus :", campus);
      console.log("From   :", from);
      console.log("To     :", to);
      console.log("=================================");

      const data =
        await getCampusReport(
          campus,
          from,
          to
        );

      console.log(
        "Campus Report Result:",
        data
      );

      res.json(data);

    }
    catch (err) {

      console.error(
        "Campus Report Route Error:",
        err
      );

      res.status(500).json({
        error: err.message
      });

    }

  }
);


// ================= REPORT DATE RANGE =================

router.get(
  "/report/:stationId",
  async (req, res) => {

    try {

      const { stationId } = req.params;

      const { from, to } = req.query;

      const data =
        await getReportData(
          stationId,
          from,
          to
        );

      res.json(data);

    }
    catch (err) {

      console.error(
        "Building Report Route Error:",
        err
      );

      res.status(500).json({
        error: err.message
      });

    }

  }
);

// ================= PGT INVERTER ENERGY =================

router.get(
    "/pgt/inverter-energy/:stationId",
    async (req, res) => {

        try {

            const { stationId } = req.params;
            const { date } = req.query;

            if (!date) {

                return res.status(400).json({
                    error: "Date is required"
                });

            }

            const data =
                await getPgtInverterEnergy(
                    stationId,
                    date
                );

            res.json(data);

        }
        catch (err) {

            console.error(
                "PGT Inverter Energy Error:",
                err.message
            );

            res.status(500).json({
                error: err.message
            });

        }

    }
);

// ================= PGT COMBINED REPORT =================

router.get(
    "/pgt/report/:stationId",
    async (req, res) => {

        try {

            const { stationId } =
                req.params;


           const {
    date,
    fromTime,
    toTime,
    source
} = req.query;


            // ================================
            // VALIDATE DATE
            // ================================

            if (!date) {

                return res.status(400).json({

                    error:
                        "Date is required"

                });

            }


            // ================================
            // VALIDATE TIME RANGE
            // ================================

            if (!fromTime || !toTime) {

                return res.status(400).json({

                    error:
                        "From Time and To Time are required"

                });

            }


            // ================================
            // VALIDATE TIME ORDER
            // ================================

            if (fromTime >= toTime) {

                return res.status(400).json({

                    error:
                        "To Time must be greater than From Time"

                });

            }


            // ================================
            // GET PGT REPORT
            // ================================

           let data;

if (String(source).toUpperCase() === "SOLARMAN") {

    const stations =
        await getAllNLCILPgtStations();

    const station =
        stations.find(
            item =>
                String(item.stationId) ===
                    String(stationId) &&
                item.source === "SOLARMAN"
        );

    if (!station) {
        return res.status(404).json({
            error: "Solarman building not found"
        });
    }

    data =
        await getSolarmanPgtReport(
            station.stationId,
            station.buildingName,
            station.installedDcCapacity,
            date,
            fromTime,
            toTime
        );

} else {

    data =
        await getPgtReport(
            stationId,
            date,
            fromTime,
            toTime
        );
}


            // ================================
            // RESPONSE
            // ================================

            res.json(data);

        }
        catch (err) {

            console.error(
                "PGT Report Route Error:",
                err.message
            );


            res.status(500).json({

                error:
                    err.message

            });

        }

    }
);

// =====================================================
// PGT - BUILDING LIST BY CAMPUS
// =====================================================

router.get(
    "/pgt/stations",
    async (req, res) => {

        try {

            const campus =
                String(
                    req.query.campus || "NLCIL"
                )
                .trim()
                .toUpperCase();


            // =============================================
            // NLCIL
            // =============================================

            if (campus === "NLCIL") {
    const data =
        await getAllNLCILPgtStations();

    return res.json(data);
}


            // =============================================
            // NUPPL
            // =============================================

            if (campus === "NUPPL") {

                const data =
                    await getNUPPLPgtStations();

                return res.json(data);

            }

            // =============================================
// BTPS
// =============================================

if (campus === "BTPS") {

    const data =
        await getBTPSPgtStations();

    return res.json(data);
}

// =============================================
// NTPL
// =============================================

if (campus === "NTPL") {

    const data =
        await getNTPLPgtStations();

    return res.json(data);

}


            // =============================================
            // INVALID CAMPUS
            // =============================================

            return res.status(400).json({

                error:
                    "Invalid campus. Use NLCIL or NUPPL."

            });

        }

        catch (err) {

            console.error(
                "PGT Stations Route Error:",
                err.message
            );

            res.status(500).json({

                error:
                    err.message

            });

        }

    }
);


// =====================================================
// NUPPL PGT REPORT - SELECTED BUILDING
// =====================================================

router.get(
    "/pgt/nuppl/report/:stationId",
    async (req, res) => {

        try {

            const {
                stationId
            } = req.params;


            const {
                date,
                fromTime,
                toTime
            } = req.query;


            // =============================================
            // VALIDATE STATION
            // =============================================

            if (!stationId) {

                return res.status(400).json({

                    error:
                        "Station ID is required"

                });

            }


            // =============================================
            // VALIDATE DATE
            // =============================================

            if (!date) {

                return res.status(400).json({

                    error:
                        "Date is required"

                });

            }


            // =============================================
            // VALIDATE TIME
            // =============================================

            if (
                !fromTime ||
                !toTime
            ) {

                return res.status(400).json({

                    error:
                        "From Time and To Time are required"

                });

            }


            // =============================================
            // VALIDATE TIME ORDER
            // =============================================

            if (
                fromTime >= toTime
            ) {

                return res.status(400).json({

                    error:
                        "To Time must be greater than From Time"

                });

            }


            // =============================================
            // GET SELECTED NUPPL PGT
            // =============================================

            const data =
                await getNUPPLPgtReport(
                    date,
                    fromTime,
                    toTime,
                    stationId
                );


            // =============================================
            // RESPONSE
            // =============================================

            res.json(data);

        }

        catch (err) {

            console.error(
                "NUPPL PGT Report Route Error:",
                err.message
            );


            res.status(500).json({

                error:
                    err.message

            });

        }

    }
);

// =====================================================
// NLCIL PGT SUMMARY REPORT
// =====================================================

router.get(
    "/pgt/summary",
    async (req, res) => {

        try {

           const {
    campus,
    date,
    fromTime,
    toTime
} = req.query;


            // =============================================
            // VALIDATE DATE
            // =============================================

            if (!date) {

                return res.status(400).json({

                    error:
                        "Date is required"

                });

            }


            // =============================================
            // VALIDATE TIME RANGE
            // =============================================

            if (
                !fromTime ||
                !toTime
            ) {

                return res.status(400).json({

                    error:
                        "From Time and To Time are required"

                });

            }


            // =============================================
            // VALIDATE TIME ORDER
            // =============================================

            if (
                fromTime >= toTime
            ) {

                return res.status(400).json({

                    error:
                        "To Time must be greater than From Time"

                });

            }


            // =============================================
            // GET NLCIL SUMMARY
            // =============================================

          


            // =============================================
            // RESPONSE
            // =============================================

         // =============================================
// GET PGT SUMMARY BY CAMPUS
// =============================================

const selectedCampus =
    String(
        campus || "NLCIL"
    )
    .trim()
    .toUpperCase();


// =============================================
// NLCIL
// =============================================

if (
    selectedCampus === "NLCIL"
) {

    const data =
        await getNLCILPgtSummary(
            date,
            fromTime,
            toTime
        );

    return res.json(data);
}


// =============================================
// NUPPL
// =============================================

if (
    selectedCampus === "NUPPL"
) {

    const data =
        await getNUPPLPgtSummary(
            date,
            fromTime,
            toTime
        );

    return res.json(data);
}

// =============================================
// BTPS
// =============================================

if (
    selectedCampus === "BTPS"
) {

    const data =
        await getBTPSPgtSummary(
            date,
            fromTime,
            toTime
        );

    return res.json(data);
}


// =============================================
// INVALID CAMPUS
// =============================================

return res.status(400).json({

    error:
        "Invalid campus. Use NLCIL or NUPPL."

});

        }

        catch (err) {

            console.error(
                "NLCIL PGT Summary Route Error:",
                err.message
            );


            res.status(500).json({

                error:
                    err.message

            });

        }

    }
);


// =====================================================
// BTPS PGT REPORT - SELECTED BUILDING
// =====================================================

router.get(
    "/pgt/btps/report/:stationId",
    async (req, res) => {

        try {

            const {
                stationId
            } = req.params;

            const {
                date,
                fromTime,
                toTime
            } = req.query;


            // =============================================
            // VALIDATE STATION
            // =============================================

            if (!stationId) {

                return res.status(400).json({
                    error: "Station ID is required"
                });

            }


            // =============================================
            // VALIDATE DATE
            // =============================================

            if (!date) {

                return res.status(400).json({
                    error: "Date is required"
                });

            }


            // =============================================
            // VALIDATE TIME
            // =============================================

            if (!fromTime || !toTime) {

                return res.status(400).json({
                    error:
                        "From Time and To Time are required"
                });

            }


            // =============================================
            // VALIDATE TIME ORDER
            // =============================================

            if (fromTime >= toTime) {

                return res.status(400).json({
                    error:
                        "To Time must be greater than From Time"
                });

            }


            // =============================================
            // GET BTPS PGT
            // =============================================

            const data =
                await getBTPSPgtReport(
                    date,
                    fromTime,
                    toTime,
                    stationId
                );


            // =============================================
            // RESPONSE
            // =============================================

            res.json(data);

        }

        catch (err) {

            console.error(
                "BTPS PGT Report Route Error:",
                err.message
            );

            res.status(500).json({
                error: err.message
            });

        }

    }
);

// ================= INVERTER ALERTS =================

router.get("/alerts", async (req, res) => {

    try {

        // ============================================
        // 1. EXISTING ACTIVE INVERTER ALERTS
        // ============================================

        const alerts = getActiveAlerts();

        // Copy existing alerts
        const finalAlerts = [...alerts];


        // ============================================
        // 2. GET ALL CAMPUS BUILDINGS
        // ============================================

        const buildings = await getSubBuildings();


        // ============================================
        // 3. FIND ALL OFFLINE BUILDINGS
        // ============================================

        const offlineBuildings =
            buildings.filter(
                building =>
                    String(building.status)
                        .toUpperCase() === "OFFLINE"
            );


        // ============================================
        // 4. ADD MISSING OFFLINE BUILDINGS
        // ============================================

        for (const building of offlineBuildings) {

            // Check whether this building already
            // has an active inverter alert

            const alreadyAlerted =
                finalAlerts.some(
                    alert =>
                        String(alert.stationId) ===
                            String(
                                building.stationId ||
                                building.id
                            )
                );


            // Already present → don't duplicate
            if (alreadyAlerted) {
                continue;
            }


            // ========================================
            // CREATE DISPLAY ALERT FOR OFFLINE BUILDING
            // ========================================

            finalAlerts.push({

                id:
                    `BUILDING_OFFLINE_${building.stationId || building.id}`,

                type:
                    "INVERTER_OFFLINE",

                severity:
                    "CRITICAL",

                stationId:
                    building.stationId ||
                    building.id,

                buildingName:
                    building.name,

                campus:
                    building.campus || "OTHERS",

                inverterName:
                    "INVERTER",

                deviceSn:
                    null,

                message:
                    `Inverter is offline at ${building.name}`,

                reason:
                    "No inverter data received for more than 8 minutes",

                detectedAt:
                    new Date().toISOString(),

                status:
                    "ACTIVE"

            });

        }


        // ============================================
        // 5. SORT
        // ============================================

        finalAlerts.sort(
            (a, b) =>
                new Date(b.detectedAt) -
                new Date(a.detectedAt)
        );


        // ============================================
        // 6. RESPONSE
        // ============================================

        res.json({

            success:
                true,

            count:
                finalAlerts.length,

            alerts:
                finalAlerts

        });


    }
    catch (error) {

        console.error(
            "Alert API error:",
            error
        );

        res.status(500).json({

            success:
                false,

            message:
                "Failed to fetch alerts"

        });

    }

});

// =====================================================
// NTPL PGT REPORT - SELECTED BUILDING
// =====================================================

router.get(
    "/pgt/ntpl/report/:stationId",
    async (req, res) => {

        try {

            const {
                stationId
            } = req.params;


            const {
                date,
                fromTime,
                toTime
            } = req.query;


            // =============================================
            // VALIDATE STATION
            // =============================================

            if (!stationId) {

                return res.status(400).json({

                    error:
                        "Station ID is required"

                });

            }


            // =============================================
            // VALIDATE DATE
            // =============================================

            if (!date) {

                return res.status(400).json({

                    error:
                        "Date is required"

                });

            }


            // =============================================
            // VALIDATE TIME
            // =============================================

            if (
                !fromTime ||
                !toTime
            ) {

                return res.status(400).json({

                    error:
                        "From Time and To Time are required"

                });

            }


            // =============================================
            // VALIDATE TIME ORDER
            // =============================================

            if (
                fromTime >= toTime
            ) {

                return res.status(400).json({

                    error:
                        "To Time must be greater than From Time"

                });

            }


            // =============================================
            // GET NTPL PGT REPORT
            // =============================================

            const data =
                await getNTPLPgtReport(
                    date,
                    fromTime,
                    toTime,
                    stationId
                );


            // =============================================
            // RESPONSE
            // =============================================

            res.json(data);

        }
        catch (err) {

            console.error(
                "NTPL PGT Report Route Error:",
                err.message
            );


            res.status(500).json({

                error:
                    err.message

            });

        }

    }
);

module.exports = router;
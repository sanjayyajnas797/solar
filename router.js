const express = require("express");

const router = express.Router();

const {

    getMainBuildingData,

    getSubBuildings,

    getGraph,

    login

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

router.get(
    "/graph/:type/:stationId",
    async (req, res) => {

        try {

            const data =
                await getGraph(
                    req.params.stationId,
                    req.params.type
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


module.exports = router;

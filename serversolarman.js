
const {
  getSolarmanBuildings,
} = require("./solarman");

async function Solarbuildings(req, res) {
  try {
    const result = await getSolarmanBuildings();

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: result.msg || "SOLARMAN API request failed",
      });
    }

    return res.status(200).json({
      success: true,
      message: result.msg ?? null,
      total: result.total ?? result.stationList?.length ?? 0,
      buildings: result.stationList || [],
    });
  } catch (error) {
    console.error(
      "SOLARMAN Buildings Error:",
      error.response?.data || error.message
    );

    return res.status(502).json({
      success: false,
      message: "Unable to fetch SOLARMAN buildings",
    });
  }
}

module.exports = { Solarbuildings };

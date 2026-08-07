const db = require("./db");

async function createGIITable() {

    try {

        await db.query(`
            CREATE TABLE IF NOT EXISTS gii_weather_logs (

                id SERIAL PRIMARY KEY,

                horizontal_irradiance DOUBLE PRECISION,

                inclined_irradiance DOUBLE PRECISION,

                temperature DOUBLE PRECISION,

                mqtt_timestamp BIGINT,

                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

            );
        `);

        console.log("✅ GII Weather Table Created");

    } catch (err) {

        console.log("❌", err.message);

    } finally {

        process.exit();

    }

}

createGIITable();
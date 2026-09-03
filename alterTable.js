// const db = require("./db");

// async function alterTable() {

//     try {

//         await db.query(`
//             ALTER TABLE weather_logs
//             ADD COLUMN IF NOT EXISTS inclined_irradiance DOUBLE PRECISION DEFAULT 0,
//             ADD COLUMN IF NOT EXISTS inclined_cumulative DOUBLE PRECISION DEFAULT 0;
//         `);

//         console.log("✅ Inclined columns added successfully");

//     } catch (err) {

//         console.error("❌ Error:", err.message);

//     } finally {

//         process.exit();

//     }

// }

// alterTable();


const mqtt = require("mqtt");

// =====================================
// MQTT CONFIG
// =====================================

const MQTT_URL = "mqtt://13.202.201.160:1883";

const options = {
    username: "solar_mqtt",
    password: "Test1234",

    reconnectPeriod: 5000,

    // Every connection gets unique client ID
    clientId: "nuppl_test_" + Date.now() + "_" + Math.random().toString(16).slice(2),

    clean: true
};


// =====================================
// CONNECT
// =====================================

console.log("🔄 Connecting to MQTT...");
console.log("📡 Broker:", MQTT_URL);
console.log("📌 Topic: nuppl/rx");

const client = mqtt.connect(MQTT_URL, options);


// =====================================
// CONNECT SUCCESS
// =====================================

client.on("connect", () => {

    console.log("🟢 MQTT CONNECTED SUCCESSFULLY");

    client.subscribe("nuppl/rx", { qos: 0 }, (err, granted) => {

        if (err) {
            console.error("❌ SUBSCRIBE ERROR:", err.message);
            return;
        }

        console.log("📡 SUBSCRIBED:", granted);
        console.log("⏳ WAITING FOR NUPPL DATA...");
        console.log("========================================");
    });

});


// =====================================
// MESSAGE RECEIVED
// =====================================

let messageCount = 0;

client.on("message", (topic, message, packet) => {
    console.log("🔥 NUPPL MESSAGE RECEIVED");
    console.log("📌 Topic:", topic);
    console.log("📦 Retain:", packet.retain);
    console.log("📦 QoS:", packet.qos);
    console.log("📦 RAW:", message.toString());

    messageCount++;

    try {
        const data = JSON.parse(message.toString());

        const payload = data.payload?.[0];

        if (!payload) {
            console.log("❌ PAYLOAD NOT FOUND");
            return;
        }

        const status = payload.status || {};

        console.log("🌤️ Param_1:", status.Param_1);
        console.log("🌡️ Param_2:", status.Param_2);
        console.log("⏱️ Timestamp:", status.timestamp || data.time);

    } catch (err) {
        console.error("❌ JSON ERROR:", err.message);
    }
});

// =====================================
// HEARTBEAT
// Check Node is still alive
// =====================================

setInterval(() => {

    console.log("💓 STILL CONNECTED | Messages:", messageCount);

}, 30000);


// =====================================
// ERRORS
// =====================================

client.on("error", (err) => {

    console.error("❌ MQTT ERROR:", err.message);

});

client.on("reconnect", () => {

    console.log("🔄 MQTT RECONNECTING...");

});

client.on("offline", () => {

    console.log("🟠 MQTT OFFLINE");

});

client.on("close", () => {

    console.log("🔴 MQTT CONNECTION CLOSED");

});
// ================= INVERTER ALERT SERVICE =================

const alertStore = new Map();

const inverterState = new Map();

const OFFLINE_THRESHOLD = 8 * 60; // 8 minutes
const STUCK_THRESHOLD = 8 * 60;   // 8 minutes

// =====================================================
// EMAIL CONFIGURATION
// =====================================================

const nodemailer = require("nodemailer");

const EMAIL_FROM = "sanjayyajnas797@gmail.com";
const EMAIL_PASSWORD = "agaibchhidrqazar";
const ALERT_EMAIL_TO = "nagarajan@sias.co.in";


// =====================================================
// EMAIL TRANSPORTER
// =====================================================

const emailTransporter = nodemailer.createTransport({
    service: "gmail",

    auth: {
        user: EMAIL_FROM,
        pass: EMAIL_PASSWORD
    }
});


// =====================================================
// SEND ALERT EMAIL
// =====================================================

async function sendAlertEmail(alert) {

    try {

        const problem =
            alert.type === "INVERTER_OFFLINE"
                ? "INVERTER OFFLINE"
                : "INVERTER DATA STUCK";


        const subject =
            `🚨 Solar Alert - ${problem} - ${alert.buildingName}`;


        const message = `
SOLAR MONITORING ALERT

Campus      : ${alert.campus}
Building    : ${alert.buildingName}
Inverter    : ${alert.inverterName}
Device      : ${alert.deviceSn}

Problem     : ${problem}

Reason:
${alert.reason}

Detected At:
${alert.detectedAt}
        `;


        const info = await emailTransporter.sendMail({

            from: EMAIL_FROM,

            to: ALERT_EMAIL_TO,

            subject: subject,

            text: message
        });


        console.log(
            "📧 ALERT EMAIL SENT:",
            info.messageId,
            alert.buildingName,
            alert.inverterName,
            problem
        );


        return info;


    } catch (error) {

        console.error(
            "❌ EMAIL SEND ERROR:",
            error.message
        );

        return null;
    }
}
// =====================================================
// GET CURRENT ACTIVE ALERTS
// =====================================================

function getActiveAlerts() {

    return Array.from(alertStore.values())

        .filter(
            alert =>
                alert.status === "ACTIVE"
        )

        .sort(
            (a, b) =>
                new Date(b.detectedAt) -
                new Date(a.detectedAt)
        );
}


// =====================================================
// CREATE ALERT
// =====================================================

function createAlert({

    type,

    severity,

    stationId,

    buildingName,

    campus,

    inverterName,

    deviceSn,

    message,

    reason

}) {


    // ---------------------------------------------
    // UNIQUE ALERT KEY
    // ---------------------------------------------

    const alertKey =
        `${type}_${stationId}_${deviceSn}`;


    // ---------------------------------------------
    // PREVENT DUPLICATE ACTIVE ALERT
    // ---------------------------------------------

    const existing =
        alertStore.get(alertKey);


    if (
        existing &&
        existing.status === "ACTIVE"
    ) {

        return existing;
    }


    // ---------------------------------------------
    // CREATE ALERT
    // ---------------------------------------------

    const alert = {

        id:
            `${Date.now()}_${deviceSn}`,

        type,

        severity,

        stationId,

        buildingName,

        campus,

        inverterName,

        deviceSn,

        message,

        reason,

        detectedAt:
            new Date().toISOString(),

        status:
            "ACTIVE"
    };


    // ---------------------------------------------
    // STORE ALERT
    // ---------------------------------------------

    alertStore.set(
        alertKey,
        alert
    );


    // ---------------------------------------------
    // CONSOLE
    // ---------------------------------------------

    console.log(
        "🚨 INVERTER ALERT:",
        alert
    );


    // ---------------------------------------------
    // SEND SMS ONLY ON NEW ALERT
    // ---------------------------------------------
sendAlertEmail(alert)
    .catch(error => {

        console.error(
            "EMAIL ALERT ERROR:",
            error.message
        );

    });


    return alert;
}


// =====================================================
// RESOLVE ALERT
// =====================================================

function resolveAlert(

    type,

    stationId,

    deviceSn

) {


    const alertKey =
        `${type}_${stationId}_${deviceSn}`;


    const existing =
        alertStore.get(alertKey);


    if (
        !existing ||
        existing.status !== "ACTIVE"
    ) {

        return null;
    }


    // ---------------------------------------------
    // RESOLVE
    // ---------------------------------------------

    existing.status =
        "RESOLVED";


    existing.resolvedAt =
        new Date().toISOString();


    console.log(

        "✅ ALERT RESOLVED:",

        existing.buildingName,

        existing.inverterName,

        type

    );


    return existing;
}


// =====================================================
// CHECK INVERTER
// =====================================================

function checkInverter({

    stationId,

    buildingName,

    campus,

    inverterName,

    deviceSn,

    latest

}) {


    // =================================================
    // COLLECTION TIME
    // =================================================

    const collectionTime =
        Number(
            latest?.collectionTime || 0
        );


    // =================================================
    // CURRENT TIME
    // =================================================

    const nowSeconds =
        Math.floor(
            Date.now() / 1000
        );


    // =================================================
    // DATA AGE
    // =================================================

    const dataAge =
        collectionTime > 0

            ? nowSeconds - collectionTime

            : Infinity;


    // =================================================
    // OFFLINE CHECK
    // =================================================

    const isOffline =

        collectionTime === 0 ||

        dataAge > OFFLINE_THRESHOLD;

// =================================================
// DATA STUCK CHECK - COLLECTION TIME BASED
// =================================================

const stateKey =
    `${stationId}_${deviceSn}`;

let state =
    inverterState.get(stateKey);


// =================================================
// FIRST DATA
// =================================================

if (!state) {

    state = {

        lastCollectionTime:
            collectionTime,

        unchangedSince:
            nowSeconds

    };

    inverterState.set(
        stateKey,
        state
    );

}


// =================================================
// EXISTING INVERTER
// =================================================

else {

    // ---------------------------------------------
    // COLLECTION TIME CHANGED
    // ---------------------------------------------

    if (
        state.lastCollectionTime !==
        collectionTime
    ) {

        state.lastCollectionTime =
            collectionTime;

        state.unchangedSince =
            nowSeconds;


        // -----------------------------------------
        // RESOLVE PREVIOUS STUCK ALERT
        // -----------------------------------------

        resolveAlert(

            "INVERTER_DATA_STUCK",

            stationId,

            deviceSn

        );

    }

}


// =================================================
// STUCK DURATION
// =================================================

const stuckDuration =
    nowSeconds -
    state.unchangedSince;


// =================================================
// CREATE DATA STUCK ALERT
// =================================================

if (

    !isOffline &&

    collectionTime > 0 &&

    stuckDuration >
        STUCK_THRESHOLD

) {

    createAlert({

        type:
            "INVERTER_DATA_STUCK",

        severity:
            "WARNING",

        stationId,

        buildingName,

        campus,

        inverterName,

        deviceSn,

        message:
            `${inverterName} data is stuck at ${buildingName}`,

        reason:
            "Inverter collection time has not changed for more than 8 minutes"

    });

}


// =================================================
// CREATE OFFLINE ALERT
// =================================================

if (isOffline) {

    // ---------------------------------------------
    // RESOLVE STUCK ALERT IF ANY
    // ---------------------------------------------

    resolveAlert(

        "INVERTER_DATA_STUCK",

        stationId,

        deviceSn

    );


    return createAlert({

        type:
            "INVERTER_OFFLINE",

        severity:
            "CRITICAL",

        stationId,

        buildingName,

        campus,

        inverterName,

        deviceSn,

        message:
            `${inverterName} is offline at ${buildingName}`,

        reason:
            "No inverter data received for more than 8 minutes"

    });

}
    // =================================================
    // CREATE OFFLINE ALERT
    // =================================================

    if (isOffline) {


        return createAlert({

            type:
                "INVERTER_OFFLINE",

            severity:
                "CRITICAL",

            stationId,

            buildingName,

            campus,

            inverterName,

            deviceSn,

            message:
                `${inverterName} is offline at ${buildingName}`,

            reason:
                "No inverter data received for more than 8 minutes"

        });

    }


    // =================================================
    // ONLINE → RESOLVE OFFLINE ALERT
    // =================================================

    resolveAlert(

        "INVERTER_OFFLINE",

        stationId,

        deviceSn

    );


    return null;
}


// =====================================================
// EXPORT
// =====================================================

module.exports = {

    checkInverter,

    createAlert,

    resolveAlert,

    getActiveAlerts

};
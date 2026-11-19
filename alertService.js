// ================= INVERTER ALERT SERVICE =================

const alertStore = new Map();

const inverterState = new Map();

const OFFLINE_THRESHOLD = 8 * 60; // 8 minutes
const STUCK_THRESHOLD = 8 * 60;   // 8 minutes

const GENERATION_START_HOUR = 6;
const GENERATION_END_HOUR = 18;

function isSolarGenerationTime() {

    const now = new Date();

    const indiaTime = new Date(
        now.toLocaleString("en-US", {
            timeZone: "Asia/Kolkata"
        })
    );

    const hour = indiaTime.getHours();

    return (
        hour >= GENERATION_START_HOUR &&
        hour < GENERATION_END_HOUR
    );
}

// =====================================================
// DAILY REMINDER TIME
// =====================================================






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

   const generationTime = isSolarGenerationTime();

const isOffline =
    generationTime &&
    (
        collectionTime === 0 ||
        dataAge > OFFLINE_THRESHOLD
    );

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
    generationTime &&
    !isOffline &&
    collectionTime > 0 &&
    stuckDuration > STUCK_THRESHOLD
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
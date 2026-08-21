import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import "./pgtreport.css";

import MainLogo from "../assets/main logo.png";
import SunLogo from "../assets/sunlogo.png";

import API_BASE from "./config";

function PgtReport() {

    const navigate = useNavigate();

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

   const [fromTime, setFromTime] = useState("10:00");
const [toTime, setToTime] = useState("16:00");

    const [reportData, setReportData] = useState([]);

    const [totals, setTotals] = useState({
        inverterEnergyInterval: null,
        netExportEnergyInterval: null,
        poaIrradiationInterval: null
    });

    const [loading, setLoading] = useState(false);


    // =========================================================
    // GENERATE REPORT
    // =========================================================

    const generateReport = async () => {

        if (!fromDate || !toDate) {

    alert("Please select From Date and To Date.");

    return;

}


if (!fromTime || !toTime) {

    alert("Please select From Time and To Time.");

    return;

}


if (fromTime >= toTime) {

    alert("To Time must be greater than From Time.");

    return;

}

        if (fromDate !== toDate) {

            alert(
                "PGT Report currently supports one day at a time. Please select the same date."
            );

            return;

        }


        try {

            setLoading(true);


            const stationId = "61858673";


            const res = await axios.get(

    `${API_BASE}/pgt/report/${stationId}`,

    {
        params: {
            date: fromDate,
            fromTime: fromTime,
            toTime: toTime
        }
    }

);


            console.log(
                "PGT REPORT RESPONSE:",
                res.data
            );


            setReportData(
                res.data.rows || []
            );


            setTotals(
                res.data.totals || {}
            );


        }
        catch (err) {

            console.error(
                "PGT Report Error:",
                err
            );


            alert(
                "Unable to generate PGT report."
            );

        }
        finally {

            setLoading(false);

        }

    };


    // =========================================================
    // FORMAT DATE
    // =========================================================

    const formatDate = (date) => {

        if (!date) {
            return "-";
        }

        const parts = date.split("-");

        if (parts.length !== 3) {
            return date;
        }

        return `${parts[2]}-${parts[1]}-${parts[0]}`;

    };


    // =========================================================
    // RENDER
    // =========================================================

    return (

        <div className="wms-page">


            {/* =====================================================
                FIXED TOP HEADER
            ===================================================== */}

            <header className="wms-report-navbar">


                {/* LEFT */}

                <div className="wms-report-nav-left">

                    <div className="wms-report-logo-box">

                        <img
                            src={MainLogo}
                            alt="NLC Logo"
                        />

                    </div>


                    <div className="wms-report-title-box">

                        <h2>
                            NLC India Limited
                        </h2>

                        <span>
                            Solar Dashboard
                        </span>

                    </div>

                </div>


                {/* DIVIDER */}

                <div className="wms-report-divider"></div>


                {/* CENTER */}

                <div className="wms-report-nav-center">

                    <div className="wms-report-sun-box">

                        <img
                            src={SunLogo}
                            alt="SUN Logo"
                        />

                    </div>


                    <div className="wms-report-company">

                        <small>
                            EPC BY
                        </small>

                        <h4>
                            SUN Industrial Automation & Solutions Pvt Ltd
                        </h4>

                    </div>

                </div>


                {/* RIGHT */}

                <div className="wms-report-nav-right">

                    <div className="wms-report-live">

                        <span className="wms-report-dot"></span>

                        LIVE SYSTEM

                    </div>


                    <div className="wms-report-time">

                        Updated:{" "}

                        {new Date().toLocaleTimeString()}

                    </div>


                    <button
                        className="wms-report-back-btn"
                        onClick={() => navigate("/dashboard")}
                    >
                        ← ← Back
                    </button>

                </div>

            </header>



            {/* =====================================================
                PAGE CONTENT
            ===================================================== */}

            <div className="pgt-page-content">


                {/* =================================================
                    FILTER
                ================================================= */}

                <div className="pgt-filter-card">

                    <div className="pgt-filter-grid">


                        {/* FROM DATE */}

                        <div className="pgt-filter-item">

                            <label>
                                From Date
                            </label>

                            <input
                                type="date"
                                value={fromDate}
                                onChange={(e) =>
                                    setFromDate(e.target.value)
                                }
                            />

                        </div>


                        {/* TO DATE */}

                        <div className="pgt-filter-item">

                            <label>
                                To Date
                            </label>

                            <input
                                type="date"
                                value={toDate}
                                onChange={(e) =>
                                    setToDate(e.target.value)
                                }
                            />

                        </div>


                       {/* FROM TIME */}

<div className="pgt-filter-item">

    <label>
        From Time
    </label>

    <input
        type="time"
        value={fromTime}
        onChange={(e) =>
            setFromTime(e.target.value)
        }
    />

</div>


{/* TO TIME */}

<div className="pgt-filter-item">

    <label>
        To Time
    </label>

    <input
        type="time"
        value={toTime}
        onChange={(e) =>
            setToTime(e.target.value)
        }
    />

</div>


                        {/* BUTTON */}

                        <div className="pgt-filter-item pgt-btn-box">

                            <button
                                className="pgt-generate-btn"
                                onClick={generateReport}
                                disabled={loading}
                            >

                                {loading
                                    ? "Generating..."
                                    : "📄 Generate Report"
                                }

                            </button>

                        </div>

                    </div>

                </div>



                {/* =================================================
                    REPORT
                ================================================= */}

                {reportData.length > 0 && (

                    <div className="pgt-report-preview">


                        {/* =================================================
                            REPORT TITLE
                        ================================================= */}

                        <div className="pgt-report-title">

                            <h2>
                                NLCIL - Roof Top Solar - Performance Guarantee Test (PGT) - Library Building
                            </h2>

                            <span>
                                Date: {formatDate(fromDate)}
                            </span>

                        </div>



                        {/* =================================================
                            TABLE
                        ================================================= */}

                        <div className="pgt-table-wrapper">

                            <table className="pgt-report-table">

                                <thead>

                                    <tr>

                                        <th>
                                            Sl. No
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Time
                                        </th>

                                        <th>
                                            GHI
                                            <br />
                                            (W/m²)
                                        </th>

                                        <th>
                                            GII / POA
                                            <br />
                                            (W/m²)
                                        </th>

                                        <th>
                                            Module
                                            <br />
                                            Temp (°C)
                                        </th>

                                        <th>
                                            Inverter
                                            <br />
                                            Energy (kWh)
                                        </th>

                                        <th>
                                            Inverter Energy
                                            <br />
                                            for Interval (kWh)
                                        </th>

                                        <th>
                                            Net Meter
                                            <br />
                                            Reading (kWh)
                                        </th>

                                        <th>
                                            Net Export Energy
                                            <br />
                                            for Interval (kWh)
                                        </th>

                                        <th>
                                            POA Irradiation
                                            <br />
                                            for Interval (Wh/m²)
                                        </th>

                                        <th>
                                            Remarks
                                        </th>

                                    </tr>

                                </thead>


                                <tbody>

                                    {reportData.map(
                                        (row, index) => (

                                            <tr key={index}>


                                                {/* SL NO */}

                                                <td>
                                                    {index + 1}
                                                </td>


                                                {/* DATE */}

                                                <td>
                                                    {formatDate(row.date)}
                                                </td>


                                                {/* TIME */}

                                                <td>
                                                    {row.time || "-"}
                                                </td>


                                                {/* GHI */}

                                                <td>
                                                    {row.ghi !== null &&
                                                     row.ghi !== undefined
                                                        ? row.ghi
                                                        : "-"
                                                    }
                                                </td>


                                                {/* GII */}

                                                <td>
                                                    {row.gii !== null &&
                                                     row.gii !== undefined
                                                        ? row.gii
                                                        : "-"
                                                    }
                                                </td>


                                                {/* MODULE TEMP */}

                                                <td>
                                                    {row.moduleTemp !== null &&
                                                     row.moduleTemp !== undefined
                                                        ? row.moduleTemp
                                                        : "-"
                                                    }
                                                </td>


                                                {/* INVERTER ENERGY */}

                                                <td>
                                                    {row.inverterEnergy !== null &&
                                                     row.inverterEnergy !== undefined
                                                        ? row.inverterEnergy
                                                        : "-"
                                                    }
                                                </td>


                                                {/* INVERTER INTERVAL */}

                                                <td className="pgt-blue-cell">

                                                    {row.inverterEnergyInterval !== null &&
                                                     row.inverterEnergyInterval !== undefined
                                                        ? row.inverterEnergyInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* NET METER */}

                                                <td className="pgt-blue-cell">

                                                    {row.netMeterReading !== null &&
                                                     row.netMeterReading !== undefined
                                                        ? row.netMeterReading
                                                        : "-"
                                                    }

                                                </td>


                                                {/* NET EXPORT */}

                                                <td className="pgt-blue-cell">

                                                    {row.netExportEnergyInterval !== null &&
                                                     row.netExportEnergyInterval !== undefined
                                                        ? row.netExportEnergyInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* POA */}

                                                <td className="pgt-blue-cell">

                                                    {row.poaIrradiationInterval !== null &&
                                                     row.poaIrradiationInterval !== undefined
                                                        ? row.poaIrradiationInterval
                                                        : "-"
                                                    }

                                                </td>


                                                {/* REMARKS */}

                                                <td>
                                                    -
                                                </td>


                                            </tr>

                                        )
                                    )}


                                    {/* =================================================
                                        TOTAL
                                    ================================================= */}

                                    <tr className="pgt-total-row">

                                        <td
                                            colSpan="7"
                                        >
                                            Total
                                        </td>


                                        <td>

                                            {totals.inverterEnergyInterval !== null &&
                                             totals.inverterEnergyInterval !== undefined

                                                ? totals.inverterEnergyInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>
                                            -
                                        </td>


                                        <td>

                                            {totals.netExportEnergyInterval !== null &&
                                             totals.netExportEnergyInterval !== undefined

                                                ? totals.netExportEnergyInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>

                                            {totals.poaIrradiationInterval !== null &&
                                             totals.poaIrradiationInterval !== undefined

                                                ? totals.poaIrradiationInterval

                                                : "-"

                                            }

                                        </td>


                                        <td>
                                            -
                                        </td>

                                    </tr>

                                </tbody>

                            </table>

                        </div>



                        {/* =================================================
                            PG TEST CALCULATION
                        ================================================= */}

                        <div className="pgt-calculation-section">


                            <div className="pgt-calculation-heading">

                                PG TEST CALCULATION - Library Building

                            </div>


                            {/* Installed DC Capacity */}

                            <div className="pgt-calc-line">

                                <div>
                                    Installed DC Capacity
                                </div>

                                <div>
                                    kWp
                                </div>

                                <strong>
                                    50.85
                                </strong>

                            </div>


                            {/* Start */}

                            <div className="pgt-calc-line">

                                <div>
                                    Test Start Date & Time
                                </div>

                                <div>
                                    {formatDate(
                                        reportData[0]?.date
                                    )}
                                </div>

                                <strong>
                                    {reportData[0]?.time || "-"}
                                </strong>

                            </div>


                            {/* End */}

                            <div className="pgt-calc-line">

                                <div>
                                    Test End Date & Time
                                </div>

                                <div>
                                    {formatDate(
                                        reportData[
                                            reportData.length - 1
                                        ]?.date
                                    )}
                                </div>

                                <strong>
                                    {
                                        reportData[
                                            reportData.length - 1
                                        ]?.time || "-"
                                    }
                                </strong>

                            </div>


                            {/* Total POA */}

                            <div className="pgt-calc-line">

                                <div>
                                    Total POA Irradiation
                                </div>

                                <div>
                                    kWh/m²
                                </div>

                                <strong>

                                    {totals.poaIrradiationInterval !== null &&
                                     totals.poaIrradiationInterval !== undefined

                                        ? (
                                            Number(
                                                totals.poaIrradiationInterval
                                            ) / 1000
                                        ).toFixed(2)

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Initial Net Meter */}

                            <div className="pgt-calc-line">

                                <div>
                                    Initial Net Meter Energy
                                </div>

                                <div>
                                    kWh
                                </div>

                                <strong>

                                    {reportData[0]?.netMeterReading !== null &&
                                     reportData[0]?.netMeterReading !== undefined

                                        ? reportData[0].netMeterReading

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Final Net Meter */}

                            <div className="pgt-calc-line">

                                <div>
                                    Final Net Meter Energy
                                </div>

                                <div>
                                    kWh
                                </div>

                                <strong>

                                    {reportData[
                                        reportData.length - 1
                                    ]?.netMeterReading !== null &&
                                     reportData[
                                        reportData.length - 1
                                     ]?.netMeterReading !== undefined

                                        ? reportData[
                                            reportData.length - 1
                                          ].netMeterReading

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Total AC Energy */}

                            <div className="pgt-calc-line">

                                <div>
                                    Total AC Energy Generated
                                </div>

                                <div>
                                    kWh
                                </div>

                                <strong>

                                    {totals.inverterEnergyInterval !== null &&
                                     totals.inverterEnergyInterval !== undefined

                                        ? totals.inverterEnergyInterval

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Reference Yield */}

                            <div className="pgt-calc-line">

                                <div>
                                    Reference Yield
                                </div>

                                <div>
                                    h
                                </div>

                                <strong>

                                    {totals.poaIrradiationInterval !== null &&
                                     totals.poaIrradiationInterval !== undefined

                                        ? (
                                            Number(
                                                totals.poaIrradiationInterval
                                            ) / 1000
                                        ).toFixed(2)

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Final Yield */}

                            <div className="pgt-calc-line">

                                <div>
                                    Final Yield
                                </div>

                                <div>
                                    kWh/kWp
                                </div>

                                <strong>

                                    {totals.inverterEnergyInterval !== null &&
                                     totals.inverterEnergyInterval !== undefined

                                        ? (
                                            Number(
                                                totals.inverterEnergyInterval
                                            ) / 50.85
                                        ).toFixed(2)

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* PR */}

                            <div className="pgt-calc-line pgt-pr-row">

                                <div>
                                    Performance Ratio (PR)
                                </div>

                                <div>
                                    %
                                </div>

                                <strong>

                                    {(
                                        totals.inverterEnergyInterval !== null &&
                                        totals.poaIrradiationInterval !== null &&
                                        Number(
                                            totals.poaIrradiationInterval
                                        ) > 0
                                    )

                                        ? (

                                            (
                                                Number(
                                                    totals.inverterEnergyInterval
                                                )
                                                /
                                                (
                                                    (
                                                        Number(
                                                            totals.poaIrradiationInterval
                                                        ) / 1000
                                                    )
                                                    * 50.85
                                                )
                                            )
                                            * 100

                                        ).toFixed(2) + "%"

                                        : "-"

                                    }

                                </strong>

                            </div>


                            {/* Guaranteed PR */}

                            <div className="pgt-calc-line">

                                <div>
                                    Guaranteed PR
                                </div>

                                <div>
                                    %
                                </div>

                                <strong>
                                    75.00%
                                </strong>

                            </div>


                            {/* RESULT */}

                            <div className="pgt-calc-line pgt-result-row">

                                <div>
                                    PGT Result
                                </div>

                                <div>
                                </div>

                                <strong>

                                    {(
                                        totals.inverterEnergyInterval !== null &&
                                        totals.poaIrradiationInterval !== null &&
                                        Number(
                                            totals.poaIrradiationInterval
                                        ) > 0
                                    )

                                        ? (

                                            (
                                                (
                                                    Number(
                                                        totals.inverterEnergyInterval
                                                    )
                                                    /
                                                    (
                                                        (
                                                            Number(
                                                                totals.poaIrradiationInterval
                                                            ) / 1000
                                                        )
                                                        * 50.85
                                                    )
                                                )
                                                * 100
                                            ) >= 75

                                                ? "PASS"
                                                : "FAIL"

                                        )

                                        : "PENDING"

                                    }

                                </strong>

                            </div>

                        </div>

                    </div>

                )}

            </div>

        </div>

    );

}

export default PgtReport;
import { useState } from "react";
import axios from "axios";
import "./Report.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import mainlogo from "../assets/main logo.png";
import sunlogo from "../assets/sunlogo.png";
import { useNavigate } from "react-router-dom";
import API_BASE from "./config";

function Report() {

    const navigate = useNavigate();

    // =====================================================
    // NLCIL PGT SUMMARY ONLY
    // =====================================================

    const [campus, setCampus] = useState("NLCIL");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    const [pgtSummary, setPgtSummary] = useState([]);

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);

    // =====================================================
    // GENERATE NLCIL PGT SUMMARY
    // =====================================================

    const generateReport = async () => {

        if (!fromDate || !toDate) {
            alert("Please Select From Date and To Date");
            return;
        }

      
        // Backend PGT Summary currently works for one test day.
        if (fromDate !== toDate) {
            alert(
                "For NLCIL PGT Summary, please select the same From Date and To Date."
            );
            return;
        }

        setLoading(true);
        setProgress(10);
        setPgtSummary([]);

        try {

            const progressTimer = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 90) return prev;
                    return prev + 10;
                });
            }, 200);

            // =================================================
            // ONLY API USED IN THIS PAGE
            // =================================================
const res = await axios.get(
    `${API_BASE}/pgt/summary`,
    {
        params: {
            campus: campus,
            date: fromDate,
            fromTime: "08:00",
            toTime: "18:00"
        }
    }
);

            clearInterval(progressTimer);

            setPgtSummary(
                res.data?.buildings || []
            );

            setProgress(100);

            setTimeout(() => {
                setLoading(false);
            }, 300);

        }
        catch (err) {

            setLoading(false);
            setProgress(0);

            console.error(
                "NLCIL PGT Summary Error:",
                err
            );

            alert(
                err?.response?.data?.error ||
                "PGT Summary Report Load Failed"
            );
        }
    };

    // =====================================================
    // DOWNLOAD PGT SUMMARY PDF
    // =====================================================

    const downloadPDF = () => {

        if (pgtSummary.length === 0) {
            alert("Generate Report First");
            return;
        }

        const doc = new jsPDF("landscape");

        const pageWidth =
            doc.internal.pageSize.getWidth();

        // =================================================
        // HEADER
        // =================================================

        doc.setFillColor(15, 42, 63);

        doc.rect(
            0,
            0,
            pageWidth,
            28,
            "F"
        );

        doc.setFillColor(255, 255, 255);

        doc.roundedRect(
            4,
            3,
            18,
            20,
            2,
            2,
            "F"
        );

        doc.addImage(
            mainlogo,
            "PNG",
            6,
            4,
            14,
            18
        );

        doc.setDrawColor(90, 120, 150);

        doc.line(
            24,
            2,
            24,
            26
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(15);

        doc.setTextColor(
            255,
            255,
            255
        );

        doc.text(
            "NLC India Limited",
            30,
            10
        );

        doc.setFont(
            "helvetica",
            "normal"
        );

        doc.setFontSize(8);

        doc.text(
            "Weather Monitoring System",
            30,
            16
        );

       doc.text(
    `${campus} PGT Summary Report`,
    30,
    21
);

        doc.addImage(
            sunlogo,
            "PNG",
            156,
            5,
            12,
            12
        );

        doc.setFont(
            "helvetica",
            "bold"
        );

        doc.setFontSize(7);

        doc.setTextColor(
            210,
            210,
            210
        );

        doc.text(
            "EPC BY",
            172,
            8
        );

        doc.setFontSize(10);

        doc.setTextColor(
            0,
            255,
            220
        );

        doc.text(
            "SUN Industrial Automation & Solutions Pvt Ltd",
            172,
            16
        );

        // =================================================
        // REPORT INFO
        // =================================================

        doc.setTextColor(0, 0, 0);

        doc.setFontSize(10);

        doc.text(
            `Campus: ${campus}`,
            10,
            38
        );

        doc.text(
            `Test Date: ${fromDate}`,
            100,
            38
        );

        doc.text(
            "Test Time: 08:00 - 18:00",
            190,
            38
        );

        // =================================================
        // TABLE
        // =================================================

        const tableBody =
            pgtSummary.map(
                (item, index) => [
                    index + 1,
                    item.buildingName || "-",
                    item.performanceRatio !== null &&
                    item.performanceRatio !== undefined
                        ? `${Number(item.performanceRatio).toFixed(2)} %`
                        : "-"
                ]
            );

        autoTable(
            doc,
            {
                startY: 45,

                head: [
                    [
                        "S.No",
                        "Building Name",
                        "Performance Ratio (%)"
                    ]
                ],

                body: tableBody,

                theme: "grid",

                headStyles: {
                    fillColor: [
                        22,
                        90,
                        145
                    ],
                    textColor: [
                        255,
                        255,
                        255
                    ],
                    fontSize: 10,
                    fontStyle: "bold",
                    halign: "center",
                    valign: "middle",
                    cellPadding: 3
                },

                alternateRowStyles: {
                    fillColor: [
                        245,
                        245,
                        245
                    ]
                },

               bodyStyles: {
    fontSize: 9,
    fontStyle: "bold",
    textColor: [0, 0, 0],
    halign: "center",
    valign: "middle",
    cellPadding: 2.5
},

                columnStyles: {
                    0: {
                        cellWidth: 35,
                        halign: "center"
                    },
                    1: {
                        cellWidth: 150,
                        halign: "left"
                    },
                    2: {
                        cellWidth: 80,
                        halign: "center"
                    }
                }
            }
        );

        // =================================================
        // FOOTER
        // =================================================

        const pageCount =
            doc.getNumberOfPages();

        for (
            let i = 1;
            i <= pageCount;
            i++
        ) {

            doc.setPage(i);

            doc.setFont(
                "helvetica",
                "normal"
            );

            doc.setFontSize(8);

            doc.setTextColor(
                120,
                120,
                120
            );

          doc.text(
    `Generated by Solar Monitoring Dashboard | ${campus} | Confidential`,
    10,
    205
);

            doc.text(
                `Page ${i} of ${pageCount}`,
                287,
                205,
                {
                    align: "right"
                }
            );
        }

       doc.save(
    `${campus}_PGT_Summary_${fromDate}.pdf`
);
    };

    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="solarReportPage">

            {/* =================================================
                LOADING
            ================================================= */}

            {
                loading && (

                    <div className="loadingOverlay">

                        <div className="loadingCard">

                            <div className="loaderCircle"></div>

                            <h2>
                                Generating PGT Summary Report...
                            </h2>

                            <div className="progressBar">

                                <div
                                    className="progressFill"
                                    style={{
                                        width: `${progress}%`
                                    }}
                                />

                            </div>

                            <h3>
                                {progress}%
                            </h3>

                            <p>
                                Please wait...
                            </p>

                        </div>

                    </div>
                )
            }

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="dashboardTopHeader">

                <div className="dashboardLeft">

                    <img
                        src={mainlogo}
                        alt="NLC"
                        className="dashboardLogo"
                    />

                    <div>

                        <h2>
                            NLC India Limited
                        </h2>

                        <span>
                            Solar Dashboard
                        </span>

                    </div>

                </div>

                <div className="dashboardCenter">

                    <img
                        src={sunlogo}
                        className="sunLogo"
                        alt=""
                    />

                    <div className="epcText">

                        <small>
                            EPC BY
                        </small>

                        <h3>
                            SUN Industrial Automations & Solutions Pvt Ltd
                        </h3>

                    </div>

                </div>

                <button
                    className="wmsReportBtn"
                    onClick={() => navigate("/wms-report")}
                >
                    🌤️ WMS REPORT
                </button>

                <div className="dashboardRight">

                    <div className="liveBadge">
                        ● LIVE SYSTEM
                    </div>

                    <div className="timeBadge">
                        Updated : {new Date().toLocaleTimeString()}
                    </div>

                    <button
                        className="backBtn"
                        onClick={() => window.history.back()}
                    >
                        ← Back
                    </button>

                </div>

            </div>

            {/* =================================================
                FILTER CARD
                ONLY CAMPUS + FROM DATE + TO DATE
                NO BUILDING FIELD
            ================================================= */}

            <div className="solarReportFilterCard">

                {/* Campus */}

                <div className="solarReportField">

                    <label>
                        Campus
                    </label>

                   <select
    value={campus}
    onChange={(e) => {
        setCampus(e.target.value);
        setPgtSummary([]);
    }}
>
    <option value="NLCIL">
        NLCIL
    </option>

    <option value="NUPPL">
        NUPPL
    </option>
</select>

                </div>

                {/* From Date */}

                <div className="solarReportField">

                    <label>
                        From Date
                    </label>

                    <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => {
                            setFromDate(e.target.value);
                            setPgtSummary([]);
                        }}
                    />

                </div>

                {/* To Date */}

                <div className="solarReportField">

                    <label>
                        To Date
                    </label>

                    <input
                        type="date"
                        value={toDate}
                        onChange={(e) => {
                            setToDate(e.target.value);
                            setPgtSummary([]);
                        }}
                    />

                </div>

                {/* Generate */}

                <div className="solarReportButtonArea">

                    <button
                        className="solarGenerateBtn"
                        onClick={generateReport}
                    >
                        📄 Generate Report
                    </button>

                </div>

                {/* Download PDF */}

                <button
                    className="solarPdfDownloadBtn"
                    onClick={downloadPDF}
                    disabled={pgtSummary.length === 0}
                >
                    📄 Download PDF
                </button>

            </div>

            {/* =================================================
                REPORT PREVIEW
            ================================================= */}

            <div className="solarReportPreviewCard">

                <h2>
                    Report Preview
                </h2>

                {/* Empty */}

                {
                    pgtSummary.length === 0 && (

                        <p>
                            Select Campus, From Date and To Date,
                            then click <b>Generate Report</b>.
                        </p>

                    )
                }

                {/* PGT SUMMARY */}

                {
                    pgtSummary.length > 0 && (

                        <>

                            <div className="reportInfoCard">

                                <div>

                                    <span>
                                        Campus
                                    </span>

                                    <strong>
                                        {campus}
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Total Buildings
                                    </span>

                                    <strong>
                                        {pgtSummary.length}
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Test Date
                                    </span>

                                    <strong>
                                        {fromDate}
                                    </strong>

                                </div>

                                <div>

                                    <span>
                                        Test Time
                                    </span>

                                    <strong>
                                        08:00 - 18:00
                                    </strong>

                                </div>

                            </div>

                          <h3
    style={{
        marginBottom: "15px"
    }}
>
    {campus} PGT Summary Report
</h3>

                            <table className="reportTable">

                                <thead>

                                    <tr>

                                        <th>
                                            S.No
                                        </th>

                                        <th>
                                            Building Name
                                        </th>

                                        <th>
                                            Performance Ratio (%)
                                        </th>

                                    </tr>

                                </thead>

                                <tbody>

                                    {
                                        pgtSummary.map(
                                            (item, index) => (

                                                <tr
                                                    key={
                                                        item.buildingName ||
                                                        index
                                                    }
                                                >

                                                    <td>
                                                        {index + 1}
                                                    </td>

                                                    <td
                                                        style={{
                                                            textAlign: "left"
                                                        }}
                                                    >
                                                        {
                                                            item.buildingName ||
                                                            "-"
                                                        }
                                                    </td>

                                                    <td>

                                                        <b>

                                                            {
                                                                item.performanceRatio !== null &&
                                                                item.performanceRatio !== undefined
                                                                    ? `${Number(item.performanceRatio).toFixed(2)} %`
                                                                    : "-"
                                                            }

                                                        </b>

                                                    </td>

                                                </tr>

                                            )
                                        )
                                    }

                                </tbody>

                            </table>

                        </>

                    )
                }

            </div>

        </div>
    );
}

export default Report;

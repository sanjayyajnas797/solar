import { useState, useEffect } from "react";
import axios from "axios";
import "./Report.css";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import mainlogo from "../assets/main logo.png";
import sunlogo from "../assets/sunlogo.png";
import { useNavigate } from "react-router-dom";
import API_BASE from './config'
function Report() {

    const navigate = useNavigate();

 const [campus, setCampus] = useState("NLCIL");

const [building, setBuilding] = useState("ALL");

const [fromDate, setFromDate] = useState("");

const [toDate, setToDate] = useState("");

const [loading, setLoading] = useState(false);
const [progress, setProgress] = useState(0);

// ============================================
// REPORT STATES
// ============================================

// Individual Building Report
const [buildingReport, setBuildingReport] = useState([]);

// Campus Consolidated Report
const [campusSummary, setCampusSummary] = useState([]);

// Building Master
const [buildings, setBuildings] = useState([]);

// ============================================
// REPORT TYPE
// ============================================

const isCampusReport = building === "ALL";
    useEffect(() => {

        loadBuildings();

    }, [campus]);

   // ============================================
// DOWNLOAD SOLAR REPORT PDF
// WMS REPORT STYLE
// ============================================
const downloadPDF = () => {

    const reportData = isCampusReport
        ? campusSummary
        : buildingReport;

    if (reportData.length === 0) {

        alert("Generate Report First");

        return;
    }


    // ============================================
    // SELECTED BUILDING
    // ============================================

    const selectedBuilding = isCampusReport
        ? "All Buildings"
        : buildings.find(
            x =>
                String(x.stationId) === String(building)
        )?.name || "";


    // ============================================
    // PDF
    // ============================================

    const doc = new jsPDF("landscape");


    // ============================================
    // PAGE SIZE
    // ============================================

    const pageWidth = doc.internal.pageSize.getWidth();


    // ============================================
    // HEADER
    // ============================================

    // Navy Header
    doc.setFillColor(15, 42, 63);

    doc.rect(
        0,
        0,
        pageWidth,
        28,
        "F"
    );


    // ============================================
    // NLC LOGO WHITE BOX
    // ============================================

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


    // NLC Logo
    doc.addImage(
        mainlogo,
        "PNG",
        6,
        4,
        14,
        18
    );


    // Divider
    doc.setDrawColor(90, 120, 150);

    doc.line(
        24,
        2,
        24,
        26
    );


    // ============================================
    // NLC TITLE
    // ============================================

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
        "Solar Generation Monitoring Report",
        30,
        21
    );


    // ============================================
    // CENTER DIVIDER
    // ============================================

    doc.setDrawColor(
        90,
        120,
        150
    );

    doc.line(
        150,
        2,
        150,
        26
    );


    // ============================================
    // SUN LOGO
    // ============================================

    doc.addImage(
        sunlogo,
        "PNG",
        156,
        5,
        12,
        12
    );


    // ============================================
    // EPC
    // ============================================

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


    // ============================================
    // SUMMARY CARDS
    // ============================================

    // --------------------------------------------
    // CAMPUS
    // --------------------------------------------

    doc.setFillColor(
        46,
        134,
        222
    );

    doc.roundedRect(
        8,
        34,
        62,
        18,
        3,
        3,
        "F"
    );

    doc.setFont(
        "helvetica",
        "bold"
    );

    doc.setFontSize(8);

    doc.setTextColor(
        255,
        255,
        255
    );

    doc.text(
        "CAMPUS",
        12,
        40
    );

    doc.setFontSize(12);

    doc.text(
        campus,
        12,
        48
    );


    // --------------------------------------------
    // BUILDING
    // --------------------------------------------

    doc.setFillColor(
        39,
        174,
        96
    );

    doc.roundedRect(
        79,
        34,
        62,
        18,
        3,
        3,
        "F"
    );

    doc.setFontSize(8);

    doc.text(
        "BUILDING",
        83,
        40
    );

    doc.setFontSize(9);

    doc.text(
        selectedBuilding,
        83,
        48
    );


    // --------------------------------------------
    // DATE RANGE
    // --------------------------------------------

    doc.setFillColor(
        243,
        156,
        18
    );

    doc.roundedRect(
        150,
        34,
        62,
        18,
        3,
        3,
        "F"
    );

    doc.setFontSize(8);

    doc.text(
        "DATE RANGE",
        154,
        40
    );

    doc.setFontSize(9);

    doc.text(
        `${fromDate} - ${toDate}`,
        154,
        48
    );


    // --------------------------------------------
    // TOTAL RECORDS
    // --------------------------------------------

    doc.setFillColor(
        155,
        89,
        182
    );

    doc.roundedRect(
        221,
        34,
        68,
        18,
        3,
        3,
        "F"
    );

    doc.setFontSize(8);

    doc.text(
        "TOTAL RECORDS",
        225,
        40
    );

    doc.setFontSize(12);

    doc.text(
        String(reportData.length),
        225,
        48
    );


    // ============================================
    // TABLE DATA
    // ============================================

    let tableHead = [];

    let tableBody = [];

    let grandTotal = 0;


    // ============================================
    // INDIVIDUAL BUILDING
    // ============================================

    if (!isCampusReport) {

        tableHead = [
            [
                "S.No",
                "Date",
                "Generation (kWh)"
            ]
        ];


        tableBody = buildingReport.map(
            (item, index) => {

                const generation =
                    Number(item.generation) || 0;

                grandTotal += generation;

                return [
                    index + 1,
                    item.date,
                    `${generation.toFixed(1)} kWh`
                ];

            }
        );

    }


    // ============================================
    // CAMPUS REPORT
    // ============================================

    else {

        const map = {};


        campusSummary.forEach(day => {

            Object.entries(
                day.buildings || {}
            ).forEach(
                ([name, value]) => {

                    map[name] =
                        (map[name] || 0)
                        + Number(value);

                }
            );

        });


        const summaryRows =
            Object.entries(map)
                .sort(
                    (a, b) =>
                        b[1] - a[1]
                );


        tableHead = [
            [
                "S.No",
                "Building Name",
                "Total Generation (kWh)"
            ]
        ];


        tableBody =
            summaryRows.map(
                ([name, total], index) => {

                    grandTotal +=
                        Number(total);

                    return [
                        index + 1,
                        name,
                        `${Number(total).toFixed(1)} kWh`
                    ];

                }
            );

    }


    // ============================================
    // TABLE
    // ============================================

    autoTable(
        doc,
        {

            startY: 58,

            head: tableHead,

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

                textColor: [
                    0,
                    0,
                    0
                ],

                halign: "center",

                valign: "middle",

                cellPadding: 2.5

            },

            styles: {

                lineColor: [
                    225,
                    225,
                    225
                ],

                lineWidth: 0.1,

                font: "helvetica"

            },

            columnStyles: {

                0: {
                    cellWidth: 40,
                    halign: "center"
                },

                1: {
                    cellWidth: 100,
                    halign: "center"
                },

                2: {
                    cellWidth: 100,
                    halign: "center"
                }

            }

        }
    );


    // ============================================
    // TOTAL ROW
    // ============================================

    let finalY =
        doc.lastAutoTable.finalY + 1;


    autoTable(
        doc,
        {

            startY: finalY,

            body: [
                [
                    "",
                    isCampusReport
                        ? "TOTAL CAMPUS GENERATION"
                        : "TOTAL GENERATION",

                    `${grandTotal.toFixed(1)} kWh`
                ]
            ],

            theme: "grid",

            styles: {

                fontSize: 10,

                fontStyle: "bold",

                textColor: [
                    255,
                    255,
                    255
                ],

                halign: "center",

                valign: "middle",

                cellPadding: 3

            },

            bodyStyles: {

                fillColor: [
                    22,
                    90,
                    145
                ]

            },

            columnStyles: {

                0: {
                    cellWidth: 40
                },

                1: {
                    cellWidth: 100
                },

                2: {
                    cellWidth: 100
                }

            }

        }
    );


    // ============================================
    // FOOTER
    // ============================================

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
            "Generated by Solar Monitoring Dashboard | NLC India Limited | Confidential",
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


    // ============================================
    // SAVE PDF
    // ============================================

    doc.save(
        `Solar_Report_${campus}_${fromDate}_to_${toDate}.pdf`
    );

};
    const loadBuildings = async () => {

        try {

            const res = await axios.get(`${API_BASE}/sub-buildings`);
            const list = res.data.filter(

                item => item.campus === campus

            );

            setBuildings(list);

            setBuilding("ALL");

            setBuildingReport([]);

setCampusSummary([]);

        }

        catch (err) {

            console.log(err);

        }

    };

// ============================================
// GENERATE REPORT
// ============================================

const generateReport = async () => {

    // Validation

    if (!fromDate || !toDate) {

        alert("Please Select From Date and To Date");

        return;

    }

    setLoading(true);

    setProgress(1);

    let value = 1;

    const timer = setInterval(() => {

        value += Math.floor(Math.random() * 8) + 2;

        if (value >= 95) value = 95;

        setProgress(value);

    }, 180);

    try {

        // =====================================
        // CAMPUS REPORT
        // =====================================

        if (isCampusReport) {

            const res = await axios.get(
    `${API_BASE}/report/campus/${campus}?from=${fromDate}&to=${toDate}`
);

            setCampusSummary(res.data);

            setBuildingReport([]);

        }

        // =====================================
        // INDIVIDUAL REPORT
        // =====================================

        else {

            const res = await axios.get(
    `${API_BASE}/report/${building}?from=${fromDate}&to=${toDate}`
);

            setBuildingReport(res.data);

            setCampusSummary([]);

        }

        // =====================================
        // SUCCESS
        // =====================================

        setProgress(100);

        clearInterval(timer);

        setTimeout(() => {

            setLoading(false);

        }, 300);

    }

    catch (err) {

        clearInterval(timer);

        setLoading(false);

        console.log(err);

        alert("Report Load Failed");

    }

};
const totalGeneration = buildingReport.reduce(

    (sum, item) =>

        sum + Number(item.generation),

    0

);

const campusTotalGeneration = campusSummary.reduce(

    (sum, item) =>

        sum + Number(item.totalGeneration),

    0

);


    return (

        <div className="solarReportPage">

            {
loading && (

<div className="loadingOverlay">

    <div className="loadingCard">

        <div className="loaderCircle"></div>

        <h2>Generating Report...</h2>

        <div className="progressBar">

            <div
                className="progressFill"
                style={{width:`${progress}%`}}
            />

        </div>

        <h3>{progress}%</h3>

        <p>Please wait...</p>

    </div>

</div>

)
}

            {/* Header */}

            <div className="dashboardTopHeader">

    <div className="dashboardLeft">

        <img src={mainlogo} alt="NLC" className="dashboardLogo"/>

        <div>
            <h2>NLC India Limited</h2>
            <span>Solar Dashboard</span>
        </div>

    </div>

   <div className="dashboardCenter">

    <img
        src={sunlogo}
        className="sunLogo"
        alt=""
    />

    <div className="epcText">

        <small>EPC BY</small>

        <h3>SUN Industrial Automations & Solutions Pvt Ltd</h3>

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

           

            {/* Filter Card */}

            <div className="solarReportFilterCard">

                {/* Campus */}

                <div className="solarReportField">

                    <label>Campus</label>

                    <select
                        value={campus}
                        onChange={(e) => setCampus(e.target.value)}
                    >

                        <option value="NLCIL">NLCIL</option>
                        <option value="NLCIC">NLCIC</option>
                        <option value="NTPL">NTPL</option>
                        <option value="NUPPL">NUPPL</option>
                        <option value="BTPS">BTPS</option>

                    </select>

                </div>

                {/* Building */}

                <div className="solarReportField">

                    <label>Building</label>

                    <select
                        value={building}
                        onChange={(e) => setBuilding(e.target.value)}
                    >

                        <option value="ALL">

                            All Buildings

                        </option>

                        {

                            buildings.map(item => (

                                <option

                                    key={item.stationId}

                                    value={item.stationId}

                                >

                                    {item.name}

                                </option>

                            ))

                        }

                    </select>

                </div>

                {/* From Date */}

                <div className="solarReportField">

                    <label>From Date</label>

                    <input

                        type="date"

                        value={fromDate}

                        onChange={(e) => setFromDate(e.target.value)}

                    />

                </div>

                {/* To Date */}

                <div className="solarReportField">

                    <label>To Date</label>

                    <input

                        type="date"

                        value={toDate}

                        onChange={(e) => setToDate(e.target.value)}

                    />

                </div>

                {/* Button */}

                <div className="solarReportButtonArea">

                    <button

                        className="solarGenerateBtn"

                        onClick={generateReport}

                    >

                        📄 Generate Report

                    </button>

                </div>

             <button
    className="solarPdfDownloadBtn"
    onClick={downloadPDF}
>
    📄 Download PDF
</button>

            </div>

            {/* Preview */}

          <div className="solarReportPreviewCard">

    <h2>Report Preview</h2>

    {/* ================= EMPTY ================= */}

    {

    buildingReport.length === 0 &&

    campusSummary.length === 0 &&

    (

        <p>

            Select Campus, Building and Date Range,
            then click <b>Generate Report</b>.

        </p>

    )

    }

    {/* ====================================================== */}
    {/* INDIVIDUAL BUILDING REPORT */}
    {/* ====================================================== */}

    {

    !isCampusReport &&

    buildingReport.length > 0 &&

    <>

        <div className="reportInfoCard">

            <div>

                <span>Campus</span>

                <strong>{campus}</strong>

            </div>

            <div>

                <span>Building</span>

                <strong>

                    {

                    buildings.find(

                    x=>String(x.stationId)===String(building)

                    )?.name

                    }

                </strong>

            </div>

            <div>

                <span>Date Range</span>

                <strong>

                    {fromDate} - {toDate}

                </strong>

            </div>

            <div>

                <span>Total Records</span>

                <strong>

                    {buildingReport.length}

                </strong>

            </div>

        </div>

        <table className="reportTable">

            <thead>

                <tr>

                    <th>S.No</th>

                    <th>Date</th>

                    <th>Generation (kWh)</th>

                </tr>

            </thead>

            <tbody>

            {

            buildingReport.map((item,index)=>(

                <tr key={index}>

                    <td>{index+1}</td>

                    <td>{item.date}</td>

                    <td>

                        {Number(item.generation).toFixed(1)} kWh

                    </td>

                </tr>

            ))

            }

            </tbody>

            <tfoot>

                <tr>

                    <td colSpan="2">

                        <b>Total Generation</b>

                    </td>

                    <td>

                        <b>

                            {totalGeneration.toFixed(1)} kWh

                        </b>

                    </td>

                </tr>

            </tfoot>

        </table>

    </>

    }

    {/* ====================================================== */}
    {/* CAMPUS SUMMARY */}
    {/* ====================================================== */}

    {

    isCampusReport &&

    campusSummary.length > 0 &&

    <>

        <div className="reportInfoCard">

            <div>

                <span>Campus</span>

                <strong>{campus}</strong>

            </div>

            <div>

                <span>Total Buildings</span>

                <strong>{buildings.length}</strong>

            </div>

            <div>

                <span>Date Range</span>

                <strong>

                    {fromDate} - {toDate}

                </strong>

            </div>

            <div>

                <span>Total Generation</span>

                <strong>

                    {campusTotalGeneration.toFixed(1)} kWh

                </strong>

            </div>

        </div>

        <h3 style={{marginBottom:"15px"}}>

            Campus Building Summary

        </h3>

        <table className="reportTable">

            <thead>

                <tr>

                    <th>S.No</th>

                    <th>Building Name</th>

                    <th>Total Generation (kWh)</th>

                </tr>

            </thead>

            <tbody>

            {

            Object.entries(

                campusSummary.reduce((acc,row)=>{

                    Object.entries(row.buildings).forEach(

                        ([name,value])=>{

                            acc[name]=(acc[name]||0)+Number(value);

                        }

                    );

                    return acc;

                },{})

            )

            .sort((a,b)=>b[1]-a[1])

            .map(([name,total],index)=>(

                <tr key={name}>

                    <td>{index+1}</td>

                    <td style={{textAlign:"left"}}>

                        {name}

                    </td>

                    <td>

                        <b>

                            {total.toFixed(1)} kWh

                        </b>

                    </td>

                </tr>

            ))

            }

            </tbody>

            <tfoot>

                <tr>

                    <td colSpan="2">

                        <b>Total Campus Generation</b>

                    </td>

                    <td>

                        <b>

                            {campusTotalGeneration.toFixed(1)} kWh

                        </b>

                    </td>

                </tr>

            </tfoot>

        </table>

    </>

        }







</div>

        </div>

    );

}

export default Report;
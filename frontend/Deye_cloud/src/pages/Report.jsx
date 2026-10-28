import { useEffect, useState } from "react";
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
    // FILTER STATES
    // =====================================================

    const [campus, setCampus] = useState("NLCIL");

    const [buildings, setBuildings] = useState([]);
    const [selectedBuilding, setSelectedBuilding] = useState("");

    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");

    // =====================================================
    // REPORT STATES
    // =====================================================

    const [reportData, setReportData] = useState([]);

    const [totalGeneration, setTotalGeneration] = useState(0);

    const [loadingBuildings, setLoadingBuildings] = useState(false);
    const [loadingReport, setLoadingReport] = useState(false);

    const [progress, setProgress] = useState(0);

    // =====================================================
    // LOAD BUILDINGS WHEN CAMPUS CHANGES
    // =====================================================

    useEffect(() => {

        loadBuildings();

    }, [campus]);


    // =====================================================
    // GET BUILDINGS
    // =====================================================

    const loadBuildings = async () => {

        try {

            setLoadingBuildings(true);

            setBuildings([]);
            setSelectedBuilding("");

            console.log(
                "Loading buildings for campus:",
                campus
            );

            const res = await axios.get(
                `${API_BASE}/pgt/stations`,
                {
                    params: {
                        campus: campus
                    }
                }
            );

            console.log(
                "Buildings Response:",
                res.data
            );

            const data = Array.isArray(res.data)
                ? res.data
                : res.data?.buildings || [];

            setBuildings(data);

        }
        catch (err) {

            console.error(
                "Building Load Error:",
                err
            );

            alert(
                err?.response?.data?.error ||
                "Buildings Load Failed"
            );

        }
        finally {

            setLoadingBuildings(false);

        }

    };


const generateReport = async () => {

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!selectedBuilding) {
        alert("Please Select Building");
        return;
    }

    if (!fromDate || !toDate) {
        alert("Please Select From Date and To Date");
        return;
    }

    if (fromDate > toDate) {
        alert("To Date must be greater than or equal to From Date");
        return;
    }

    // -------------------------------------------------
    // ALL BUILDINGS
    // PGT SUMMARY IS SINGLE DATE
    // -------------------------------------------------

    if (
        selectedBuilding === "ALL" &&
        fromDate !== toDate
    ) {
        alert(
            "For All Buildings PGT Report, From Date and To Date must be the same."
        );
        return;
    }

    // -------------------------------------------------
    // SELECTED BUILDING
    // -------------------------------------------------

    const building =
        selectedBuilding === "ALL"
            ? null
            : buildings.find(
                item =>
                    String(item.stationId) ===
                    String(selectedBuilding)
            );

    if (
        selectedBuilding !== "ALL" &&
        !building
    ) {
        alert("Selected Building Not Found");
        return;
    }

    console.log(
        "Selected Building:",
        building
    );

    // -------------------------------------------------
    // START LOADING
    // -------------------------------------------------

    setLoadingReport(true);
    setProgress(10);
    setReportData([]);
    setTotalGeneration(0);

    try {

        // -------------------------------------------------
        // SMOOTH PROGRESS
        // -------------------------------------------------

        const progressTimer =
            setInterval(() => {

                setProgress(prev => {

                    if (prev >= 90) {
                        return prev;
                    }

                    return prev + 10;

                });

            }, 200);

        let res;

        // =================================================
        // ALL BUILDINGS
        // NEW CAMPUS PGT API
        // =================================================

        if (selectedBuilding === "ALL") {

            console.log(
                "Calling Campus PGT API"
            );

            console.log(
                "Campus:",
                campus
            );

            console.log(
                "Date:",
                fromDate
            );

            res = await axios.get(
                `${API_BASE}/report/campus-pgt/${campus}`,
                {
                    params: {
                        date: fromDate
                    }
                }
            );

            console.log(
                "Campus PGT Response:",
                res.data
            );

            // ---------------------------------------------
            // NEW API RESPONSE
            // ---------------------------------------------

            const data =
                Array.isArray(res.data?.buildings)
                    ? res.data.buildings
                    : [];

            setReportData(data);

            // ---------------------------------------------
            // TOTAL GENERATION
            // ---------------------------------------------

            const total =
                data.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item?.generation || 0
                        ),
                    0
                );

            setTotalGeneration(total);

        }

        // =================================================
        // INDIVIDUAL BUILDING
        // EXISTING API - DO NOT CHANGE
        // =================================================

        else {

            console.log(
                "Calling Individual Building Report API"
            );

            console.log(
                "Station ID:",
                building.stationId
            );

            console.log(
                "From:",
                fromDate
            );

            console.log(
                "To:",
                toDate
            );

            res = await axios.get(
                `${API_BASE}/report/${building.stationId}`,
                {
                    params: {
                        from: fromDate,
                        to: toDate
                    }
                }
            );

            console.log(
                "Individual Building Response:",
                res.data
            );

            const data =
                Array.isArray(res.data)
                    ? res.data
                    : res.data?.data || [];

            setReportData(data);

            // ---------------------------------------------
            // EXISTING INDIVIDUAL TOTAL
            // ---------------------------------------------

            const total =
                data.reduce(
                    (sum, item) =>
                        sum +
                        Number(
                            item?.generation || 0
                        ),
                    0
                );

            setTotalGeneration(total);
        }

        clearInterval(progressTimer);

        setProgress(100);

        setTimeout(() => {
            setLoadingReport(false);
        }, 300);

    }
    catch (err) {

        console.error(
            "Report Error:",
            err
        );

        setLoadingReport(false);
        setProgress(0);

        alert(
            err?.response?.data?.error ||
            "Report Load Failed"
        );
    }
};


    // =====================================================
// DOWNLOAD PDF
// =====================================================

const downloadPDF = () => {

    // -------------------------------------------------
    // VALIDATION
    // -------------------------------------------------

    if (!selectedBuilding) {

        alert("Please Select Building");

        return;
    }

    if (!reportData || reportData.length === 0) {

        alert("Generate Report First");

        return;
    }


    // -------------------------------------------------
    // FIND SELECTED BUILDING
    // -------------------------------------------------

    const building =
        selectedBuilding === "ALL"
            ? null
            : buildings.find(
                item =>
                    String(item.stationId) ===
                    String(selectedBuilding)
            );


    const buildingName =
        selectedBuilding === "ALL"
            ? "All Buildings"
            : (
                building?.buildingName ||
                building?.name ||
                "Selected Building"
            );


    // -------------------------------------------------
    // CREATE PDF
    // -------------------------------------------------

    const doc =
        new jsPDF(
            "landscape"
        );


    const pageWidth =
        doc.internal.pageSize.getWidth();


    // =================================================
    // HEADER
    // =================================================

    doc.setFillColor(
        15,
        42,
        63
    );


    doc.rect(
        0,
        0,
        pageWidth,
        28,
        "F"
    );


    // -------------------------------------------------
    // MAIN LOGO
    // -------------------------------------------------

    doc.setFillColor(
        255,
        255,
        255
    );


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


    // -------------------------------------------------
    // HEADER TEXT
    // -------------------------------------------------

    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(
        15
    );


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


    doc.setFontSize(
        8
    );


    doc.text(
        "Solar Dashboard",
        30,
        16
    );


    doc.text(
        `${campus} Building Generation Report`,
        30,
        21
    );


    // -------------------------------------------------
    // SUN LOGO
    // -------------------------------------------------

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


    doc.setFontSize(
        7
    );


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


    doc.setFontSize(
        10
    );


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
    // REPORT INFORMATION
    // =================================================

    doc.setTextColor(
        0,
        0,
        0
    );


    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(
        10
    );


    doc.text(
        `Campus: ${campus}`,
        10,
        38
    );


    doc.text(
        `Building: ${buildingName}`,
        80,
        38
    );


    doc.text(
        `From: ${fromDate}`,
        200,
        38
    );


    doc.text(
        `To: ${toDate}`,
        255,
        38
    );


    // =================================================
    // TOTAL GENERATION BOX
    // =================================================

    doc.setFillColor(
        235,
        248,
        240
    );


    doc.roundedRect(
        10,
        44,
        80,
        25,
        3,
        3,
        "F"
    );


    doc.setFont(
        "helvetica",
        "bold"
    );


    doc.setFontSize(
        9
    );


    doc.setTextColor(
        50,
        50,
        50
    );


    doc.text(
        "TOTAL GENERATION",
        15,
        52
    );


    doc.setFontSize(
        16
    );


    doc.setTextColor(
        20,
        130,
        70
    );


    doc.text(
        `${Number(totalGeneration || 0).toFixed(2)} kWh`,
        15,
        63
    );


    // =================================================
    // TABLE DATA
    // =================================================

    let tableHead;

    let tableBody;


    // =================================================
    // ALL BUILDINGS
    // =================================================
if (selectedBuilding === "ALL") {

    tableHead = [
        [
            "S.No",
            "Building Name",
            "Generation",
            "Performance Ratio",
            "Building Status"
        ]
    ];

    tableBody =
        reportData.map(
            (item, index) => [

                index + 1,

                item?.buildingName ||
                item?.name ||
                "-",

                `${Number(
                    item?.generation || 0
                ).toFixed(2)} kWh`,

                item?.performanceRatio !== null &&
                item?.performanceRatio !== undefined
                    ? `${Number(
                        item.performanceRatio
                    ).toFixed(2)}%`
                    : "-",

                String(
                    item?.status ||
                    "UNKNOWN"
                ).toUpperCase()

            ]
        );

    // TOTAL ROW
    tableBody.push(
        [
            "",
            "TOTAL GENERATION",
            `${Number(
                totalGeneration || 0
            ).toFixed(2)} kWh`,
            "",
            ""
        ]
    );
}
    // =================================================
    // INDIVIDUAL BUILDING
    // =================================================

    else {

        tableHead = [
            [
                "S.No",
                "Date",
                "Generation"
            ]
        ];


        tableBody =
            reportData.map(
                (
                    item,
                    index
                ) => [

                    index + 1,

                    item?.date ||
                    "-",

                    item?.generation !== undefined &&
                    item?.generation !== null
                        ? `${Number(
                            item.generation
                        ).toFixed(2)} kWh`
                        : "-"

                ]
            );


        // -------------------------------------------------
        // TOTAL ROW
        // -------------------------------------------------

        tableBody.push(
            [
                "",
                "TOTAL GENERATION",
                `${Number(
                    totalGeneration || 0
                ).toFixed(2)} kWh`
            ]
        );

    }


    // =================================================
    // CREATE TABLE
    // =================================================

    autoTable(
        doc,
        {

            startY: 75,

            head: tableHead,

            body: tableBody,

            theme: "grid",


            // -------------------------------------------------
            // HEADER STYLE
            // -------------------------------------------------

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


            // -------------------------------------------------
            // BODY STYLE
            // -------------------------------------------------

            bodyStyles: {

                fontSize: 9,

                textColor: [
                    0,
                    0,
                    0
                ],

                halign: "center",

                valign: "middle",

                cellPadding: 2.5

            },


            // -------------------------------------------------
            // ALTERNATE ROW
            // -------------------------------------------------

            alternateRowStyles: {

                fillColor: [
                    245,
                    245,
                    245
                ]

            },


            // -------------------------------------------------
            // COLUMN WIDTH
            // -------------------------------------------------

          columnStyles: {

    0: {
        cellWidth: 20,
        halign: "center"
    },

    1: {
        cellWidth: 105,
        halign: "center"
    },

    2: {
        cellWidth: 55,
        halign: "center"
    },

    3: {
        cellWidth: 50,
        halign: "center"
    },

    4: {
        cellWidth: 50,
        halign: "center"
    }

},


            // -------------------------------------------------
            // TOTAL ROW STYLE
            // -------------------------------------------------

            didParseCell: function (data) {

                if (
                    data.row.index ===
                    tableBody.length - 1
                ) {

                    data.cell.styles.fontStyle =
                        "bold";


                    data.cell.styles.fillColor =
                        [
                            235,
                            248,
                            240
                        ];


                    if (
                        data.column.index === 2
                    ) {

                        data.cell.styles.textColor =
                            [
                                20,
                                130,
                                70
                            ];

                    }

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


        doc.setFontSize(
            8
        );


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


    // =================================================
    // SAVE PDF
    // =================================================

    const safeBuildingName =
        buildingName
            .replace(
                /[<>:"/\\|?*]/g,
                "_"
            );


    const fileName =
        `${campus}_${safeBuildingName}_Generation_${fromDate}_${toDate}.pdf`;


    console.log(
        "Downloading PDF:",
        fileName
    );


    doc.save(
        fileName
    );

};


    // =====================================================
    // SELECTED BUILDING OBJECT
    // =====================================================
const selectedBuildingData =
    buildings.find(
        item =>
            String(item.stationId) ===
            String(selectedBuilding)
    );

const isAllBuildings =
    selectedBuilding === "ALL";


    // =====================================================
    // UI
    // =====================================================

    return (

        <div className="solarReportPage">


            {/* =================================================
                LOADING
            ================================================= */}

            {
                (loadingReport ||
                    loadingBuildings) && (

                    <div className="loadingOverlay">

                        <div className="loadingCard">

                            <div className="loaderCircle"></div>

                            <h2>
                                {
                                    loadingBuildings
                                        ? "Loading Buildings..."
                                        : "Generating Building Report..."
                                }
                            </h2>


                            {
                                loadingReport && (

                                    <>
                                        <div className="progressBar">

                                            <div
                                                className="progressFill"
                                                style={{
                                                    width:
                                                        `${progress}%`
                                                }}
                                            />

                                        </div>


                                        <h3>
                                            {progress}%
                                        </h3>

                                    </>

                                )
                            }


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
                    onClick={() =>
                        navigate(
                            "/wms-report"
                        )
                    }
                >
                    🌤️ WMS REPORT
                </button>


                <div className="dashboardRight">

                    <div className="liveBadge">
                        ● LIVE SYSTEM
                    </div>


                    <div className="timeBadge">
                        Updated :{" "}
                        {new Date().toLocaleTimeString()}
                    </div>


                    <button
                        className="backBtn"
                        onClick={() =>
                            window.history.back()
                        }
                    >
                        ← Back
                    </button>

                </div>

            </div>


            {/* =================================================
                FILTER CARD
            ================================================= */}

            <div className="solarReportFilterCard">


                {/* =================================================
                    CAMPUS
                ================================================= */}

                <div className="solarReportField">

                    <label>
                        Campus
                    </label>


                    <select
                        value={campus}
                        onChange={(e) => {

                            setCampus(
                                e.target.value
                            );

                            setReportData([]);

                            setTotalGeneration(
                                0
                            );

                        }}
                    >

                       <option value="NLCIL">
    NLCIL
</option>

<option value="NTPL">
    NTPL
</option>

<option value="NUPPL">
    NUPPL
</option>

<option value="BTPS">
    BTPS
</option>

                    </select>

                </div>


                {/* =================================================
                    BUILDING
                ================================================= */}

                <div className="solarReportField">

                    <label>
                        Building
                    </label>


                    <select
                        value={
                            selectedBuilding
                        }
                        onChange={(e) => {

                            setSelectedBuilding(
                                e.target.value
                            );

                            setReportData([]);

                            setTotalGeneration(
                                0
                            );

                        }}
                        disabled={
                            loadingBuildings
                        }
                    >

                       <option value="">
    Select Building
</option>

<option value="ALL">
    All Buildings
</option>

{
    buildings.map(
        (
            building,
            index
        ) => (
            <option
                key={
                    building.stationId ||
                    index
                }
                value={
                    building.stationId
                }
            >
                {
                    building.buildingName ||
                    building.name ||
                    `Building ${index + 1}`
                }
            </option>
        )
    )
}

                    </select>

                </div>


                {/* =================================================
                    FROM DATE
                ================================================= */}

                <div className="solarReportField">

                    <label>
                        From Date
                    </label>


                    <input
                        type="date"
                        value={
                            fromDate
                        }
                        onChange={(e) => {

                            setFromDate(
                                e.target.value
                            );

                            setReportData([]);

                            setTotalGeneration(
                                0
                            );

                        }}
                    />

                </div>


                {/* =================================================
                    TO DATE
                ================================================= */}

                <div className="solarReportField">

                    <label>
                        To Date
                    </label>


                    <input
                        type="date"
                        value={
                            toDate
                        }
                        onChange={(e) => {

                            setToDate(
                                e.target.value
                            );

                            setReportData([]);

                            setTotalGeneration(
                                0
                            );

                        }}
                    />

                </div>


                {/* =================================================
                    GENERATE
                ================================================= */}

                <div className="solarReportButtonArea">

                    <button
                        className="solarGenerateBtn"
                        onClick={
                            generateReport
                        }
                    >
                        📄 Generate Report
                    </button>

                </div>


                {/* =================================================
                    DOWNLOAD PDF
                ================================================= */}

                <button
                    className="solarPdfDownloadBtn"
                    onClick={
                        downloadPDF
                    }
                    disabled={
                        reportData.length === 0
                    }
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


                {/* =================================================
                    EMPTY
                ================================================= */}

                {
                    reportData.length === 0 && (

                        <p>

                            Select Campus,
                            Building,
                            From Date and
                            To Date,
                            then click{" "}
                            <b>
                                Generate Report
                            </b>.

                        </p>

                    )
                }


                {/* =================================================
                    REPORT
                ================================================= */}

                {
                    reportData.length > 0 && (

                        <>

                            {/* =================================================
                                INFO CARD
                            ================================================= */}

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
                                        Building
                                    </span>

                                    <strong>
                                        {
                                            selectedBuildingData?.buildingName ||
                                            selectedBuildingData?.name ||
                                            "-"
                                        }
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        From Date
                                    </span>

                                    <strong>
                                        {fromDate}
                                    </strong>

                                </div>


                                <div>

                                    <span>
                                        To Date
                                    </span>

                                    <strong>
                                        {toDate}
                                    </strong>

                                </div>

                            </div>


                            {/* =================================================
                                TOTAL GENERATION CARD
                            ================================================= */}

                            <div
                                style={{
                                    marginTop:
                                        "20px",

                                    padding:
                                        "25px",

                                    borderRadius:
                                        "15px",

                                    background:
                                        "linear-gradient(135deg, #e8fff1, #f5fff9)",

                                    border:
                                        "1px solid #b8e8ca",

                                    display:
                                        "flex",

                                    alignItems:
                                        "center",

                                    justifyContent:
                                        "space-between",

                                    boxShadow:
                                        "0 8px 20px rgba(0,0,0,0.08)"
                                }}
                            >

                                <div>

                                    <span
                                        style={{
                                            display:
                                                "block",

                                            fontSize:
                                                "14px",

                                            color:
                                                "#555",

                                            marginBottom:
                                                "8px",

                                            fontWeight:
                                                "600"
                                        }}
                                    >
                                        Total Generation
                                    </span>


                                    <strong
                                        style={{
                                            fontSize:
                                                "32px",

                                            color:
                                                "#159447"
                                        }}
                                    >
                                        {
                                            totalGeneration.toFixed(
                                                2
                                            )
                                        } kWh
                                    </strong>

                                </div>


                                <div
                                    style={{
                                        fontSize:
                                            "45px"
                                    }}
                                >
                                    ⚡
                                </div>

                            </div>


                          {/* =================================================
    REPORT TITLE
================================================= */}

<h3
    style={{
        marginTop: "25px",
        marginBottom: "15px"
    }}
>
    {selectedBuilding === "ALL"
        ? `${campus} - All Buildings Generation Report`
        : `${selectedBuildingData?.buildingName ||
            selectedBuildingData?.name ||
            "Building"} Generation Report`}
</h3>


<table className="reportTable">

    <thead>

        <tr>

            <th>
                S.No
            </th>

            {selectedBuilding === "ALL" ? (

                <>
                    <th>
                        Building Name
                    </th>

                    <th>
                        Generation
                    </th>

                    <th>
                        Performance Ratio
                         ≥ 75% = PASS
                    </th>

                    <th>
                        Building Status
                    </th>
                </>

            ) : (

                <>
                    <th>
                        Date
                    </th>

                    <th>
                        Generation
                    </th>
                </>

            )}

        </tr>

    </thead>


    <tbody>

        {reportData.map(
            (item, index) => (

                <tr key={index}>

                    {/* S.NO */}

                    <td>
                        {index + 1}
                    </td>


                    {/* =================================
                        ALL BUILDINGS
                    ================================= */}

                    {selectedBuilding === "ALL" ? (

                        <>

                            {/* BUILDING NAME */}

                            <td>
                                {item?.buildingName ||
                                    item?.name ||
                                    "-"}
                            </td>


                            {/* GENERATION */}

                            <td>
                                <b>
                                    {Number(
                                        item?.generation || 0
                                    ).toFixed(2)} kWh
                                </b>
                            </td>


                            {/* PERFORMANCE RATIO */}

                            <td>

                                {item?.performanceRatio !== null &&
                                item?.performanceRatio !== undefined
                                    ? (
                                        <>
                                            {Number(
                                                item.performanceRatio
                                            ).toFixed(2)}
                                            %
                                        </>
                                    )
                                    : (
                                        "-"
                                    )}

                            </td>


                            {/* BUILDING STATUS */}

                            <td>

                                <span
                                    style={{
                                        display: "inline-block",
                                        padding: "6px 14px",
                                        borderRadius: "20px",
                                        fontWeight: "700",
                                        fontSize: "13px",

                                        background:
                                            String(
                                                item?.status
                                            ).toUpperCase() ===
                                            "ONLINE"
                                                ? "#e8fff1"
                                                : "#ffeaea",

                                        color:
                                            String(
                                                item?.status
                                            ).toUpperCase() ===
                                            "ONLINE"
                                                ? "#159447"
                                                : "#d32f2f"
                                    }}
                                >
                                    {item?.status ||
                                        "UNKNOWN"}
                                </span>

                            </td>

                        </>

                    ) : (

                        /* =================================
                           INDIVIDUAL BUILDING
                        ================================= */

                        <>

                            <td>
                                {item?.date || "-"}
                            </td>

                            <td>
                                <b>
                                    {item?.generation !==
                                        undefined &&
                                    item?.generation !==
                                        null
                                        ? `${Number(
                                            item.generation
                                        ).toFixed(2)} kWh`
                                        : "0.00 kWh"}
                                </b>
                            </td>

                        </>

                    )}

                </tr>

            )
        )}


        {/* =============================================
            TOTAL ROW - ALL BUILDINGS
        ============================================= */}

        <tr
            style={{
                fontWeight: "bold",
                background: "#eaf8ef"
            }}
        >

            {selectedBuilding === "ALL" ? (

                <>

                    <td
                        colSpan="4"
                        style={{
                            textAlign: "right"
                        }}
                    >
                        TOTAL GENERATION
                    </td>

                    <td>

                        <b
                            style={{
                                color: "#159447",
                                fontSize: "17px"
                            }}
                        >
                            {Number(
                                totalGeneration || 0
                            ).toFixed(2)} kWh
                        </b>

                    </td>

                </>

            ) : (

                <>

                    <td
                        colSpan="2"
                        style={{
                            textAlign: "right"
                        }}
                    >
                        TOTAL GENERATION
                    </td>

                    <td>

                        <b
                            style={{
                                color: "#159447",
                                fontSize: "17px"
                            }}
                        >
                            {Number(
                                totalGeneration || 0
                            ).toFixed(2)} kWh
                        </b>

                    </td>

                </>

            )}

        </tr>

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
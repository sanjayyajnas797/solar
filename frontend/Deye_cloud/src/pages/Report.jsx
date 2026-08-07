import { useState, useEffect } from "react";
import axios from "axios";
import "./Report.css";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import mainlogo from "../assets/main logo.png";
import sunlogo from "../assets/sunlogo.png";
import { useNavigate } from "react-router-dom";
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

    const downloadExcel = async () => {

    const excelData =

isCampusReport

?

campusSummary

:

buildingReport;

let buildingSummary = [];

if (isCampusReport) {

    const map = {};

    campusSummary.forEach(day => {

        Object.entries(day.buildings).forEach(([name, value]) => {

            map[name] = (map[name] || 0) + Number(value);

        });

    });

    buildingSummary = Object.entries(map)
        .map(([name, total]) => ({
            name,
            total
        }))
        .sort((a, b) => b.total - a.total);

}

if (excelData.length === 0) {

    alert("Generate Report First");

    return;

}
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Solar Monitoring Dashboard";
    workbook.created = new Date();

   const sheet = workbook.addWorksheet("Solar Report", {
    views: [
        {
            showGridLines: true
        }
    ]
});
    

    // =====================================================
    // COLUMN WIDTH
    // =====================================================
sheet.columns = [
 { width: 10 },   // A Logo
 { width: 22 },   // B
 { width: 18 },   // C
 { width: 18 },   // D
 { width: 18 },   // E
 { width: 18 },   // F
 { width: 12 },   // G Sun Logo
 { width: 8 },    // H EPC
{ width: 12 },   // I
{ width: 20 },   // J
{ width: 22 },   // K
{ width: 22 }    // L
];

    // =====================================================
    // ROW HEIGHT
    // =====================================================

    sheet.getRow(1).height = 48;
sheet.getRow(2).height = 34;
sheet.getRow(3).height = 18;
    sheet.getRow(4).height = 18;
    sheet.getRow(5).height = 22;
    sheet.getRow(6).height = 22;
    sheet.getRow(7).height = 12;


    // =====================================================
// PREMIUM HEADER
// =====================================================

// Dark Blue Background
const headerFill = {
  type: "pattern",
  pattern: "solid",
  fgColor: {
    argb: "0B2341"
  }
};

// Row Height
sheet.getRow(1).height = 40;
sheet.getRow(2).height = 24;
sheet.getRow(3).height = 26;


// Left Logo
const logoRes = await fetch(mainlogo);
const logoBlob = await logoRes.blob();
const logoBuffer = await logoBlob.arrayBuffer();

const leftLogo = workbook.addImage({
  buffer: logoBuffer,
  extension: "png"
});

sheet.addImage(leftLogo,{
   tl:{
   col:0.15,
row:0.10
},
    ext:{
        width:60,
        height:60
    }
});


// Right SUN Logo
const sunRes = await fetch(sunlogo);
const sunBlob = await sunRes.blob();
const sunBuffer = await sunBlob.arrayBuffer();

const rightLogo = workbook.addImage({
  buffer: sunBuffer,
  extension: "png"
});

sheet.addImage(rightLogo,{
    tl:{
        col:6.95,
        row:0.12
    },
    ext:{
        width:46,
        height:46
    }
});

// Merge
sheet.mergeCells("B1:F1");
sheet.mergeCells("B2:F2");

sheet.mergeCells("H1:L1");
sheet.mergeCells("H2:L2");


// Company
sheet.getCell("B1").value = "NLC INDIA LIMITED";

sheet.getCell("B1").font = {
    bold:true,
    size:19,
    color:{argb:"FF8C00"},
    name:"Calibri"
};

sheet.getCell("B2").font = {
    size:11,
    color:{argb:"FFFFFF"}
};

sheet.getCell("B1").alignment={
horizontal:"left",
vertical:"bottom"
};
sheet.getCell("B2").alignment={
horizontal:"left",
vertical:"top"
};


sheet.getCell("B2").value =
"4MW Rooftop & 1MW Floating Solar System | Online Monitoring";



sheet.getCell("B2").alignment = {
    horizontal: "left",
    vertical: "middle",
    indent: 0
};


// EPC

sheet.getCell("H1").value = "EPC BY";

sheet.getCell("H1").font = {
    bold: true,
    size: 9,
    color: { argb: "FFFFFF" }
};

sheet.getCell("H2").value =
"SUN Industrial Automations & Solutions Pvt Ltd";

sheet.getCell("H2").font = {
    bold: true,
    size: 13,
    color: { argb: "00FFE5" },
    name: "Calibri"
};

sheet.getCell("H1").alignment = {
    horizontal: "left",
    vertical: "bottom",
    indent: 0
};

sheet.getCell("H2").alignment = {
    horizontal: "left",
    vertical: "top",
    indent: 0
};

// Apply Header Background

for(let r=1;r<=2;r++){

    for(let c=1;c<=12;c++){

        const cell=sheet.getCell(r,c);

        cell.fill=headerFill;

        cell.border={};

    }

}
  

   

        // =====================================================
    // COMMON STYLES
    // =====================================================

    const labelFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "D9EAD3" }
    };

    const tableHeaderFill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1F4E78" }
    };

    const thinBorder = {
        top: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "thin" }
    };

    // =====================================================
    // INFORMATION SECTION
    // =====================================================

sheet.mergeCells("B5:C5");
sheet.mergeCells("B6:C6");

sheet.mergeCells("D5:G5");
sheet.mergeCells("D6:G6");

sheet.mergeCells("H5:I5");
sheet.mergeCells("H6:I6");

sheet.mergeCells("J5:L5");
sheet.mergeCells("J6:L6");

    sheet.getCell("B5").value="Campus"
    sheet.getCell("B6").value = "Date Range";

    sheet.getCell("D5").value = campus;

    sheet.getCell("D6").value =
        `${fromDate}  To  ${toDate}`;

    sheet.getCell("H5").value = "Building";

    sheet.getCell("H6").value = "Generated";

  sheet.getCell("J5").value =
    isCampusReport
        ? "All Buildings"
        : buildings.find(
            x => String(x.stationId) === String(building)
          )?.name || "";

    sheet.getCell("J6").value =
        new Date().toLocaleString();

   [
  "B5",
  "B6",
  "H5",
  "H6"
].forEach(cell => {

    sheet.getCell(cell).font = {
        bold: true
    };

    sheet.getCell(cell).fill = labelFill;

    sheet.getCell(cell).alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    sheet.getCell(cell).border = thinBorder;

});

   [
 "D5",
 "D6",
 "J5",
 "J6"
].forEach(cell=>{

        sheet.getCell(cell).alignment={
            horizontal:"left",
            vertical:"middle"
        };

        sheet.getCell(cell).border=thinBorder;

    });

    // =====================================================
    // SPACE
    // =====================================================

    sheet.getRow(7).height = 10;
    sheet.getRow(8).height = 10;
  

    // =====================================================
    // TABLE HEADER
    // =====================================================

    const tableStart = 10;

    sheet.getRow(tableStart).height = 24;

   const titles = isCampusReport
? [
    "S.No",
    "Building Name",
    "Total Generation (kWh)"
]
: [
    "S.No",
    "Date",
    "Generation (kWh)"
];

    titles.forEach((title,index)=>{

        const cell =
            sheet.getCell(tableStart,index+5) // E,F,G

        cell.value=title;

        cell.font={
            bold:true,
            color:{argb:"FFFFFF"},
            size:11
        };

       cell.fill = tableHeaderFill;

        cell.alignment={
            horizontal:"center",
            vertical:"middle"
        };

        cell.border={
            top:{style:"medium"},
            bottom:{style:"medium"},
            left:{style:"thin"},
            right:{style:"thin"}
        };

    });

    // =====================================================
    // START DATA ROW
    // =====================================================

    let currentRow = tableStart + 1;

        // =====================================================
    // DATA ROWS
    // =====================================================

   const rows =
    isCampusReport
        ? buildingSummary
        : excelData;

rows.forEach((item, index) => {

    sheet.getRow(currentRow).height = 22;

    sheet.getCell(`E${currentRow}`).value = index + 1;

    if (isCampusReport) {

        sheet.getCell(`F${currentRow}`).value = item.name;

        sheet.getCell(`G${currentRow}`).value =
            Number(item.total).toFixed(1);

    } else {

        sheet.getCell(`F${currentRow}`).value = item.date;

        sheet.getCell(`G${currentRow}`).value =
            Number(item.generation).toFixed(1);

    }

    ["E", "F", "G"].forEach(col => {

        const cell = sheet.getCell(`${col}${currentRow}`);

        cell.alignment = {
            horizontal: "center",
            vertical: "middle"
        };

        cell.border = thinBorder;

        cell.font = {
            size: 11
        };

        if (index % 2 === 0) {

            cell.fill = {
                type: "pattern",
                pattern: "solid",
                fgColor: {
                    argb: "F7F9FC"
                }
            };

        }

    });

    currentRow++;

});

   // =====================================================
// TOTAL ROW
// =====================================================

sheet.getRow(currentRow).height = 24;

// Empty S.No column
sheet.getCell(`E${currentRow}`).value = "";

// TOTAL GENERATION under Date column
sheet.getCell(`F${currentRow}`).value = "TOTAL GENERATION";

// Total value under Generation column
const grandTotal = isCampusReport
    ? campusTotalGeneration
    : totalGeneration;

sheet.getCell(`G${currentRow}`).value =
    grandTotal.toFixed(1) + " kWh";
// Style
["E", "F", "G"].forEach(col => {

    const cell = sheet.getCell(`${col}${currentRow}`);

    cell.font = {
        bold: true,
        size: 11,
        color: { argb: "FFFFFF" }
    };

    cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "1F4E78" }
    };

    cell.alignment = {
        horizontal: "center",
        vertical: "middle"
    };

    cell.border = {
        top: { style: "medium" },
        left: { style: "thin" },
        right: { style: "thin" },
        bottom: { style: "medium" }
    };

});

    // =====================================================
    // FOOTER
    // =====================================================

   currentRow += 3;

  sheet.mergeCells(`C${currentRow}:J${currentRow}`);

const footer = sheet.getCell(`C${currentRow}`);

    footer.value =
        "Generated by Solar Monitoring Dashboard | NLC India Limited | Confidential";

    footer.font = {
        italic:true,
        size:10,
        color:{
            argb:"777777"
        }
    };

    footer.alignment = {
        horizontal:"center"
    };

  
    // =====================================================
    // DOWNLOAD
    // =====================================================

    const excelBuffer =
        await workbook.xlsx.writeBuffer();

    saveAs(

        new Blob([excelBuffer]),

        `Solar_Report_${campus}_${fromDate}_to_${toDate}.xlsx`

    );

};

    const loadBuildings = async () => {

        try {

            const res = await axios.get(
                "http://localhost:5000/api/sub-buildings"
            );

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
                `http://localhost:5000/api/report/campus/${campus}?from=${fromDate}&to=${toDate}`
            );

            setCampusSummary(res.data);

            setBuildingReport([]);

        }

        // =====================================
        // INDIVIDUAL REPORT
        // =====================================

        else {

            const res = await axios.get(
                `http://localhost:5000/api/report/${building}?from=${fromDate}&to=${toDate}`
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

        <h3>Sun Industrial Automations & Solutions Pvt Ltd</h3>

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
    className="solarDownloadBtn"
    onClick={downloadExcel}
>
    📥 Download Excel
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
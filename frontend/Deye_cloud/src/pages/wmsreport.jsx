import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./WmsReport.css";
import MainLogo from "../assets/main logo.png";
import SunLogo from "../assets/sunlogo.png";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import API_BASE from './config'

export default function WmsReport() {

    const navigate = useNavigate();
const [campus, setCampus] = useState("NLCIL");
const [fromDate, setFromDate] = useState("");
const [toDate, setToDate] = useState("");
const [interval, setInterval] = useState("15");

const [reportData, setReportData] = useState([]);
const [loading, setLoading] = useState(false);
const [summary, setSummary] = useState({
    campus: "",
    date: "",
    records: 0,
    totalEnergy: 0
});

const showAlert = (
  message,
  type = "warning",
  title = "Attention"
) => {

  const oldAlert = document.querySelector(".wms-alert");

  if (oldAlert) {
    oldAlert.remove();
  }

  const alertBox = document.createElement("div");

  alertBox.className = `wms-alert ${type}`;

  const icon =
    type === "success"
      ? "✓"
      : type === "error"
      ? "!"
      : type === "info"
      ? "i"
      : "⚠";

  alertBox.innerHTML = `
    <div class="wms-alert-icon">
      ${icon}
    </div>

    <div class="wms-alert-content">
      <p class="wms-alert-title">
        ${title}
      </p>

      <p class="wms-alert-message">
        ${message}
      </p>
    </div>

    <button
      class="wms-alert-close"
      type="button"
    >
      ×
    </button>
  `;

  document.body.appendChild(alertBox);

  const closeBtn =
    alertBox.querySelector(".wms-alert-close");

  closeBtn.onclick = () => {
    alertBox.remove();
  };

  setTimeout(() => {

    if (alertBox) {
      alertBox.remove();
    }

  }, 4000);
};
const generateReport = async () => {

    if (!fromDate || !toDate) {

       showAlert(
  "Please select both From Date and To Date.",
  "warning",
  "Date Required"
);

        return;

    }

    try {

        setLoading(true);

       let res;

if (campus === "GII") {

   res = await axios.get(
    `${API_BASE}/weather/gii-report`,
    {
        params: {
            from: fromDate,
            to: toDate,
            interval
        }
    }
);

}
else {

   res = await axios.get(
    `${API_BASE}/weather/report/${campus}`,
    {
        params: {
            from: fromDate,
            to: toDate,
            interval
        }
    }
);

}

       setSummary(res.data.summary);

setReportData(res.data.rows);

    }

    catch (err) {

        console.log(err);

      showAlert(
  "Unable to load the report. Please try again.",
  "error",
  "Report Error"
);

    }

    finally {

        setLoading(false);

    }

};

const downloadPDF = () => {

    if (reportData.length === 0) {

       showAlert(
  "Please generate the report before downloading the PDF.",
  "info",
  "Report Not Ready"
);

        return;

    }

    const doc = new jsPDF("landscape");

//================================================
// HEADER
//================================================

// Navy Blue Header
doc.setFillColor(15,42,63);
doc.rect(0,0,297,28,"F");

// White Logo Background
doc.setFillColor(255,255,255);
doc.roundedRect(4,3,18,20,2,2,"F");

// NLC Logo
doc.addImage(
    MainLogo,
    "PNG",
    6,
    4,
    14,
    18
);

// Divider
doc.setDrawColor(90,120,150);
doc.line(24,2,24,26);

// Title
doc.setFont("helvetica","bold");
doc.setFontSize(15);
doc.setTextColor(255,255,255);

doc.text("NLC India Limited",30,10);

doc.setFont("helvetica","normal");
doc.setFontSize(8);

doc.text(
    "Weather Monitoring System",
    30,
    16
);

doc.text(
    "Environmental Monitoring Report",
    30,
    21
);

// Divider
doc.line(150,2,150,26);

// SUN Logo
doc.addImage(
    SunLogo,
    "PNG",
    156,
    5,
    12,
    12
);

// EPC
doc.setFont("helvetica","bold");
doc.setFontSize(7);
doc.setTextColor(210,210,210);

doc.text(
    "EPC BY",
    172,
    8
);

doc.setFontSize(10);
doc.setTextColor(0,255,220);

doc.text(
    "SUN Industrial Automation & Solutions Pvt Ltd",
    172,
    16
);

    //==========================
    // SUMMARY
    //==========================
//==========================
// SUMMARY CARDS
//==========================

// Campus
doc.setFillColor(46,134,222);
doc.roundedRect(8,34,62,18,3,3,"F");

doc.setFont("helvetica","bold");
doc.setFontSize(8);
doc.setTextColor(255);

doc.text("CAMPUS",12,40);

doc.setFontSize(12);
doc.text(
 campus === "GII"
    ? "NLC TA BUILDING"
    : summary.campus,
    12,
    48
);

// Date
doc.setFillColor(39,174,96);
doc.roundedRect(79,34,62,18,3,3,"F");

doc.setFontSize(8);
doc.text("DATE",83,40);

doc.setFontSize(11);
doc.text(summary.date,83,48);

// Records
doc.setFillColor(243,156,18);
doc.roundedRect(150,34,62,18,3,3,"F");

doc.setFontSize(8);
doc.text("TOTAL RECORDS",154,40);

doc.setFontSize(12);
doc.text(String(summary.records),154,48);

//==========================
// TOTAL ENERGY
//==========================

doc.setFillColor(155,89,182);
doc.roundedRect(221,34,68,18,3,3,"F");

doc.setFontSize(8);
doc.setTextColor(255);
doc.text("TOTAL ENERGY",225,40);

if (campus === "GII") {

    doc.setFontSize(9);

    doc.text(
        `Horizontal : ${summary.horizontalTotal} Wh/m²`,
        225,
        45
    );

    doc.text(
        `Inclined   : ${summary.inclinedTotal} Wh/m²`,
        225,
        50
    );

}
else{

    doc.setFontSize(11);

    doc.text(
        `${summary.totalEnergy} Wh/m²`,
        225,
        48
    );

}
   //==========================
// TABLE
//==========================

if (campus === "GII") {

    autoTable(doc, {

        startY: 58,

        head: [[
            "Date & Time",
            "Horizontal Irradiance (W/m²)",
            "Horizontal Cumulative (Wh/m²)",
            "Inclined Irradiance (W/m²)",
            "Inclined Cumulative (Wh/m²)",
            "Module Temperature (°C)"
        ]],

        body: reportData.map(r => [
            r.time,
            r.horizontal,
            r.horizontalCumulative,
            r.inclined,
            r.inclinedCumulative,
            r.temperature
        ]),

        theme: "grid",

        headStyles: {
            fillColor: [22, 90, 145],
            textColor: [255, 255, 255],
            fontSize: 9,
            halign: "center",
            valign: "middle"
        },

        alternateRowStyles: {
            fillColor: [245, 245, 245],
            textColor: [0, 0, 0]
        },

        styles: {
            fontSize: 8.5,
            cellPadding: 2,
            textColor: [0, 0, 0],
            fontStyle: "bold",
            lineColor: [225, 225, 225],
            lineWidth: 0.1,
            halign: "center",
            valign: "middle"
        }

    });

}

else{

    autoTable(doc,{

        startY:58,

        head:[[
            "Date & Time",
            "Irradiance(W/m²)",
            "Temperature(°C)",
            "Cumulative(W/m²)"
        ]],

        body:reportData.map(r=>[
            r.time,
            r.irradiance,
            r.temperature,
            r.cumulative
        ]),

        theme:"grid",

        headStyles:{
            fillColor:[22,90,145],
            textColor:[255,255,255],
            fontSize:10,
            halign:"center",
            valign:"middle"
        },

        alternateRowStyles:{
            fillColor:[245,245,245],
            textColor:[0,0,0]
        },

        styles:{
            fontSize:9.5,
            cellPadding:2,
            textColor:[0,0,0],
            fontStyle:"bold",
            lineColor:[225,225,225],
            lineWidth:0.1,
            halign:"center"
        }

    });

}

    //==========================
    // FOOTER
    //==========================

    const pageCount=doc.getNumberOfPages();

    for(let i=1;i<=pageCount;i++){

        doc.setPage(i);

        doc.setFontSize(9);

        doc.text(
            "Generated by SUN Industrial Automation & Solutions Pvt Ltd",
            10,
            205
        );

        doc.text(
            `Page ${i} of ${pageCount}`,
            280,
            205,
            {align:"right"}
        );

    }

    doc.save(
        `WMS_Report_${summary.campus}_${summary.date}.pdf`
    );

}

    return (

        <div className="wms-page">

        {/* ================= FIXED TOP HEADER ================= */}

<header className="wms-report-navbar">

    <div className="wms-report-nav-left">

        <div className="wms-report-logo-box">
            <img src={MainLogo} alt="" />
        </div>

        <div className="wms-report-title-box">
              <h2>NLC India Limited</h2>
            <span>Solar Dashboard</span>
        </div>

    </div>

    <div className="wms-report-divider"></div>

    <div className="wms-report-nav-center">

        <div className="wms-report-sun-box">
            <img src={SunLogo} alt="" />
        </div>

        <div className="wms-report-company">
            <small>EPC BY</small>
            <h4>SUN Industrial Automation & Solutions Pvt Ltd</h4>
        </div>

    </div>

    <div className="wms-report-nav-right">

        <div className="wms-report-live">
            <span className="wms-report-dot"></span>
            LIVE SYSTEM
        </div>

        <div className="wms-report-time">
            Updated: {new Date().toLocaleTimeString()}
        </div>

        <button
            className="wms-report-back-btn"
            onClick={() => navigate("/dashboard")}
        >
            ← ← Back
        </button>

    </div>

</header>

          

            {/* ================= FILTER ================= */}

            <div className="filter-card">

                <div className="filter-grid">

                    {/* Campus */}

                    <div className="filter-item">

                        <label>Campus</label>

                        <select
                            value={campus}
                            onChange={(e) =>
                                setCampus(e.target.value)
                            }
                        >

                            <option value="NLCIL">
                                NLCIL
                            </option>

                            <option value="NUPPL">
                                NUPPL
                            </option>

                            <option value="BTPS">
                                BTPS
                            </option>

                            <option value="GII">
                                 NLC TA BUILDING
                            </option>

                        </select>

                    </div>

                    {/* From */}

                    <div className="filter-item">

                        <label>From Date</label>

                        <input
                            type="date"
                            value={fromDate}
                            onChange={(e) =>
                                setFromDate(e.target.value)
                            }
                        />

                    </div>

                    {/* To */}

                    <div className="filter-item">

                        <label>To Date</label>

                        <input
                            type="date"
                            value={toDate}
                            onChange={(e) =>
                                setToDate(e.target.value)
                            }
                        />

                    </div>

                    <div className="filter-item">

    <label>Interval</label>

    <select
        value={interval}
        onChange={(e)=>setInterval(e.target.value)}
    >

       

        <option value="15">15 Minutes</option>

        <option value="30">30 Minutes</option>

        <option value="60">1 Hour</option>

    </select>

</div>

                    {/* Generate */}

                    <div className="filter-item btn-box">

                        <button
                            className="generate-btn"
                            onClick={generateReport}
                        >
                            📄 Generate Report
                        </button>

                    </div>

                </div>

            </div>

            <div className="GII_summary-grid">

  <div className="GII_summary-card">
    <h4>Campus</h4>

    <p>
       {
   campus === "GII"
    ? "NLC TA BUILDING"
    : summary.campus
}
    </p>
</div>

    <div className="GII_summary-card">
        <h4>Date</h4>
        <p>{summary.date}</p>
    </div>

    <div className="GII_summary-card">
        <h4>Total Records</h4>
        <p>{summary.records}</p>
    </div>

    <div className="GII_summary-card">
        <h4>Total Energy</h4>
        {
campus === "GII"
?
<div className="gii-total-box">

    <div className="gii-total horizontal">
        <span>Horizontal</span>
        <strong>{summary.horizontalTotal} Wh/m²</strong>
    </div>

    <div className="gii-total inclined">
        <span>Inclined</span>
        <strong>{summary.inclinedTotal} Wh/m²</strong>
    </div>

</div>

:

<p>{summary.totalEnergy} Wh/m²</p>
}
    </div>

</div>

            {/* ================= REPORT PREVIEW ================= */}

            <div className="preview-card">

                <div className="preview-header">

                    <h2>Report Preview</h2>

                   <button
    className="pdf-btn"
    onClick={downloadPDF}
>
    📄 Download PDF
</button>

                </div>

              {campus === "GII" ? (

<table className="report-table">

<thead>
<tr>
    <th>Date & Time</th>

    <th>
        Horizontal Irradiance
        <br />
        (W/m²)
    </th>

    <th>
        Horizontal Cumulative
        <br />
        (Wh/m²)
    </th>

    <th>
        Inclined Irradiance
        <br />
        (W/m²)
    </th>

    <th>
        Inclined Cumulative
        <br />
        (Wh/m²)
    </th>

    <th>
        Module Temperature
        <br />
        (°C)
    </th>
</tr>
</thead>

<tbody>

{
    reportData.map((row, index) => (

        <tr key={index}>

            <td>
                {row.time}
            </td>

            <td>
                {row.horizontal}
            </td>

            <td>
                {row.horizontalCumulative}
            </td>

            <td>
                {row.inclined}
            </td>

            <td>
                {row.inclinedCumulative}
            </td>

            <td>
                {row.temperature}
            </td>

        </tr>

    ))
}

</tbody>

</table>

) : (



    <table className="report-table">

        <thead>
            <tr>
                <th>Date & Time</th>

                <th>
                    Irradiance
                    <br />
                    (W/m²)
                </th>

                <th>
                    Temperature
                    <br />
                    (°C)
                </th>

                <th>
                    Cumulative
                    <br />
                    (Wh/m²)
                </th>
            </tr>
        </thead>

        <tbody>

            {reportData.map((row, index) => (

                <tr key={index}>

                    <td>
                        {row.time}
                    </td>

                    <td>
                        {row.irradiance}
                    </td>

                    <td>
                        {row.temperature}
                    </td>

                    <td>
                        {row.cumulative}
                    </td>

                </tr>

            ))}

        </tbody>

    </table>

)}

            </div>

        </div>

    );

}
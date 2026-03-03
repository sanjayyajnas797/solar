// import { useLocation, useNavigate } from "react-router-dom";
// import { useEffect, useState } from "react";
// import PowerGraph from "../graph/graph";
// import "../pages/Buildings.css";

// /* LOGO */
// import epcLogo from "../assets/sunlogo.png";
// import buildIcon from "../assets/tower.png";


// /* ========================= */
// /* CAPACITY MAP – TYPE3 */
// /* ========================= */

// const capacityMap = {
//   "TYPE3BLOCK125KW": 25,
//   "TYPE3BLOCK225KW": 25,
//   "TYPE3BLOCK325KW": 25,
//   "TYPE3BLOCK425KW": 25,
//   "TYPE3BLOCK525KW": 25,
//   "TYPE3BLOCK625KW": 25
// };

// /* NORMALIZE */
// const normalizeName = (name) =>
//   name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

// export default function Type3() {
  
//   const location = useLocation();
//   const navigate = useNavigate();

//   const buildings = location.state || [];

//   const [time, setTime] = useState("");
//   const [selectedBuilding, setSelectedBuilding] = useState(null);
//   const [graphType, setGraphType] = useState("today");

//   /* TIME */
//   useEffect(() => {
//     const updateTime = () => {
//       setTime(
//         new Date().toLocaleTimeString("en-IN", {
//           hour: "2-digit",
//           minute: "2-digit",
//           second: "2-digit"
//         })
//       );
//     };

//     updateTime();
//     const interval = setInterval(updateTime, 15000);
//     return () => clearInterval(interval);
//   }, []);

//   /* DEFAULT SELECT */
//   useEffect(() => {
//     if (buildings.length && !selectedBuilding) {
//       setSelectedBuilding(buildings[0]);
//     }
//   }, [buildings]);

//   /* TOTALS */
//   const totalToday =
//     buildings.reduce((sum, b) => sum + Number(b.today || 0), 0);

//   const totalYesterday =
//     buildings.reduce((sum, b) => sum + Number(b.yesterday || 0), 0);

//   const totalCurrent =
//     buildings.reduce((sum, b) => sum + Number(b.currentPower || 0), 0);

//   return (

// <div className="buildings-page">

// {/* HEADER */}
// <div className="second-header">

// <div className="secondheader-left">

// <div>
// <div className="second-company">
// Type 3 Quarters Monitoring
// </div>

// <div className="second-sub">
// Solar Dashboard
// </div>
// </div>

// <div className="header-supplier-block">

// <img src={epcLogo} className="second-logo"/>

// <div className="epc-text-block">
// <div className="epc-label">EPC BY</div>
// <div className="header-company epc-company">
// SUN Industrial Automations & Solutions Pvt Ltd
// </div>
// </div>

// </div>

// </div>

// <div className="secondheader-right">

// <div className="secondlive-box">
// ● LIVE SYSTEM
// </div>

// <div className="second-updated">
// Updated: {time}
// </div>

// <button
// className="back-btn"
// onClick={() => navigate(-1)}
// >
// ← Back
// </button>

// </div>

// </div>

// {/* SUMMARY */}
// <div className="summary">

// <div className="summary-card">
// <div className="summary-label">Total Buildings</div>
// <div className="summary-value">{buildings.length}</div>
// </div>

// <div className="summary-card">
// <div className="summary-label">Today Production</div>
// <div className="summary-value green">
// {totalToday.toFixed(1)} kWh
// </div>
// </div>

// <div className="summary-card">
// <div className="summary-label">Yesterday Production</div>
// <div className="summary-value blue">
// {totalYesterday.toFixed(1)} kWh
// </div>
// </div>

// <div className="summary-card current-card">
// <div className="summary-label">Total Live Power</div>
// <div className="summary-value current-text">
// {totalCurrent.toFixed(1)} kW
// </div>
// </div>

// </div>

// {/* BUILDINGS */}
// <div className="building-grid">

// {buildings.map(b => {

// const isActive = selectedBuilding?.id === b.id;

// const normalized = normalizeName(b.name);
// const clean = normalized.replace(/KW$/, "");

// /* capacity logic */
// let capacity =
//   capacityMap[normalized] ||
//   capacityMap[clean];

// /* fallback */
// const match = b.name.match(/(\d+)\s*kw/i);

// if (!capacity) {
//   capacity = match ? Number(match[1]) : 25;
// }

// return (

// <div
// key={b.id}
// onClick={() => setSelectedBuilding(b)}
// className={`building-card ${isActive ? "active" : ""}`}
// >

// <div className="card-header">
// <img src={buildIcon} className="card-icon"/>
// <div className="online">ONLINE</div>
// </div>

// <div className="building-name">

// <span className="building-title">
// {b.name}
// </span>

// <span className="capacity-inline">
// Plant Capacity {capacity} kW
// </span>

// </div>

// <div className="energy-row">

// <div>
// <div className="energy-label">TODAY</div>
// <div className="energy-value green">
// {Number(b.today || 0).toFixed(1)} kWh
// </div>
// </div>

// <div>
// <div className="energy-label">YESTERDAY</div>
// <div className="energy-value blue">
// {Number(b.yesterday || 0).toFixed(1)} kWh
// </div>
// </div>

// <div>
// <div className="energy-label">CUMULATIVE</div>
// <div className="energy-value cumulative">
// {Number(b.total || 0).toFixed(1)} kWh
// </div>
// </div>

// </div>

// <div className="card-footer">
// Last update: {time}
// <div className="current-live">
// Live Power: {Number(b.currentPower || 0).toFixed(1)} kW
// </div>
// </div>

// </div>

// );

// })}

// </div>

// {/* GRAPH */}
// {selectedBuilding && (

// <div className="graph-section">

// <div className="graph-title">
// Energy Trend - {selectedBuilding.name}
// </div>

// <div className="graph-buttons">

// <button
// className={`graph-btn ${graphType === "today" ? "active-btn" : ""}`}
// onClick={() => setGraphType("today")}
// >
// Today
// </button>

// <button
// className={`graph-btn ${graphType === "yesterday" ? "active-btn" : ""}`}
// onClick={() => setGraphType("yesterday")}
// >
// Yesterday
// </button>

// </div>

// <div className="graph-box">

// <PowerGraph
// stationId={selectedBuilding.id}
// type={graphType}
// buildingName={selectedBuilding.name}
// />

// </div>

// </div>

// )}

// </div>

//   );
// }
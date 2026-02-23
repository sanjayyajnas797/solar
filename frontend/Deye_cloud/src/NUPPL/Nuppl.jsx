import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../pages/Buildings.css";
import API_BASE from "../pages/config";

import Nuppl from "../assets/Nuppl.jpg";
import epcLogo from "../assets/sunlogo.png";
import buildIcon from "../assets/tower.png";

/* ========================= */
/* CAPACITY MAP */
/* ========================= */

const capacityMap = {
  "NUPPL GENERAL HOSPITAL": 122.04,
  "NUPPL ESTATE OFFICE": 30.51,
  "NUPPL ESTATE STORE": 10.17,
  "NUPPL SCHOOL": 134.47,
  "NUPPL TYPE 3 QUARTERS_5 BUILDINGS": 129.95,
  "NUPPL TYPE 4 QUARTERS_11 BUILDINGS": 298.32,
  "NUPPL TRAINING CENTRE": 80.23
};

/* ========================= */
/* DUMMY BUILDINGS */
/* ========================= */

const dummyBuildings = [
{ id:"dummy-1", name:"NUPPL General Hospital", isDummy:true },
{ id:"dummy-2", name:"NUPPL Estate Office", isDummy:true },
{ id:"dummy-3", name:"NUPPL Estate Store", isDummy:true },
{ id:"dummy-4", name:"NUPPL School", isDummy:true },
{ id:"dummy-5", name:"NUPPL Type 3 Quarters_5 Buildings", isDummy:true },
{ id:"dummy-6", name:"NUPPL Type 4 Quarters_11 Buildings", isDummy:true },
{ id:"dummy-7", name:"NUPPL Training Centre", isDummy:true }
];

/* FORMAT */
const formatBuildingName = (name) => {
if (!name) return "";
return name
.toLowerCase()
.split(" ")
.map(word =>
word === "nuppl"
? "NUPPL"
: word.charAt(0).toUpperCase() + word.slice(1)
)
.join(" ");
};

export default function NupplPage(){

const navigate = useNavigate();

const [buildings,setBuildings] = useState([]);
const [selectedBuilding,setSelectedBuilding] = useState(null);
const [time,setTime] = useState("");

useEffect(() => {

  if (localStorage.getItem("AUTO_MODE") === "false") return;

  // 👉 SCROLL
  const scrollTimer = setTimeout(() => {
    const graph = document.querySelector(".graph-section");
    if (graph) {
      graph.scrollIntoView({ behavior: "smooth" });
    }
  }, 4000);

  // 👉 BACK TO DASHBOARD
  const backTimer = setTimeout(() => {
    navigate("/dashboard");
  }, 10000);

  return () => {
    clearTimeout(scrollTimer);
    clearTimeout(backTimer);
  };

}, []);
useEffect(()=>{

const fetchBuildings = async()=>{

try{

const res = await fetch(`${API_BASE}/sub-buildings`);
const data = await res.json();

const real =
data.filter(b=>b.name.toUpperCase().includes("NUPPL"));

const combined = [
...real,
...dummyBuildings.slice(0,7-real.length)
];

setBuildings(combined);

if(!selectedBuilding && combined.length){
setSelectedBuilding(combined[0]);
}

setTime(
new Date().toLocaleTimeString("en-IN",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
);

}
catch(err){
console.log(err);
}

};

fetchBuildings();
const interval = setInterval(fetchBuildings,15000);
return ()=>clearInterval(interval);

},[]);


/* ========================= */
/* TOTALS */
/* ========================= */

const totalToday = 0;
const totalYesterday = 0;
const totalCurrent = 0;


/* ========================= */
/* UI */
/* ========================= */

return(

<div className="buildings-page">

{/* HEADER */}
<div className="second-header">

<div className="secondheader-left">

<img src={Nuppl} className="second-logo"/>

<div>
<div className="second-company">
NUPPL RTS-0.8MW Monitoring
</div>
<div className="second-sub">
Solar Dashboard
</div>
</div>

<div className="header-supplier-block">
<img src={epcLogo} className="second-logo"/>
<div className="epc-text-block">
<div className="epc-label">EPC BY</div>
<div className="header-company epc-company">
SUN Industrial Automations & Solutions Pvt Ltd
</div>
</div>
</div>

</div>

<div className="secondheader-right">
<div className="secondlive-box">● LIVE SYSTEM</div>
<div className="second-updated">Updated: {time}</div>
<button className="back-btn" onClick={()=>navigate("/dashboard")}>
← Back
</button>
</div>

</div>


{/* SUMMARY */}
<div className="summary">

<div className="summary-card">
<div className="summary-label">Total Buildings</div>
<div className="summary-value">{buildings.length}</div>
</div>

<div className="summary-card">
<div className="summary-label">Today Production</div>
<div className="summary-value">0.0 kWh</div>
</div>

<div className="summary-card">
<div className="summary-label">Yesterday Production</div>
<div className="summary-value">0.0 kWh</div>
</div>

{/* ❌ PEAK CARD REMOVED */}

<div className="summary-card">
<div className="summary-label">Live Power</div>
<div className="summary-value">0.0 kW</div>
</div>

</div>


{/* BUILDINGS */}
<div className="building-grid">

{buildings.map(b=>{

const capacity =
capacityMap[b.name.toUpperCase()];

const isActive =
selectedBuilding?.id===b.id;

return(

<div
key={b.id}
onClick={()=>setSelectedBuilding(b)}
className={`building-card ${isActive?"active":""}`}
>

<div className="card-header">
<img src={buildIcon} className="card-icon"/>
<div className="not-connected">NOT CONNECTED</div>
</div>

<div className="building-name">

<span className="building-title">
{formatBuildingName(b.name)}
</span>

{capacity &&
<span className="capacity-inline">
Plant Capacity {capacity} kW
</span>
}

</div>

{/* ✅ CUMULATIVE ADDED */}
<div className="energy-row">

<div>
<div className="energy-label">TODAY</div>
<div className="energy-value">0.0 kWh</div>
</div>

<div>
<div className="energy-label">YESTERDAY</div>
<div className="energy-value">0.0 kWh</div>
</div>

<div>
<div className="energy-label">CUMULATIVE</div>
<div className="energy-value cumulative">0.0 kWh</div>
</div>

</div>

<div className="card-footer">
Last update: {time}
<div className="current-live">Live Power: 0.0 kW</div>
</div>

</div>

);

})}

</div>

</div>

);

}
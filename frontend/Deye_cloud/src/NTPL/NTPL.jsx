import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GaugeComponent from "react-gauge-component";
import "../pages/Buildings.css";

import API_BASE from "../pages/config";

/* CLIENT LOGO */
import Ntpl from "../assets/Ntpl.jpg";

/* EPC LOGO */
import epcLogo from "../assets/sunlogo.png";

/* ICONS */

import education from '../assets/pump.png';
import switchyard from '../assets/parking.jpg'
import office from "../assets/office.png";

import { useDispatch, useSelector } from "react-redux";
import { fetchdata } from "../store/createslice";

import { FaBuilding, FaBolt } from "react-icons/fa";
import { WiDaySunny } from "react-icons/wi";
import { FaHistory } from "react-icons/fa";

/* ========================= */
/* CAPACITY MAP */
/* ========================= */

const capacityMap = {
  "NTPLPUMPHOUSE20KW": 112,
  "NTPLPARKINGSHED": 118,
  "NTPLAOBUILDING":123,
  "NTPLSERVICEBUILDING":110.74
}

/* ========================= */
/* NORMALIZE */
/* ========================= */

const normalizeName = (name)=>
name?.toUpperCase().replace(/[^A-Z0-9]/g,"");


/* ========================= */
/* FORMAT NAME */
/* ========================= */

const formatBuildingName = (name)=>{

if(!name) return "";

if(name.toUpperCase().includes("NTPL STORM WATER")){
return "NTPL Pump House 20kW"
}

return name
.toLowerCase()
.split(" ")
.map(word=>{

if(word==="ntpl") return "NTPL";

return word.charAt(0).toUpperCase()+word.slice(1);

})
.join(" ");

};


/* ========================= */
/* ICON MAP */
/* ========================= */

const getNtplIcon = (name)=>{

const n = normalizeName(name);

if(n.includes("PARKING")) return switchyard;

if(n.includes("SERVICE")) return office;

if(n.includes("ADMINISTRATIVE")) return office;


  if(n.includes("PUMP") || n.includes("PUMPHOUSE"))
    return education;

     return education; // ✅ fallback
};



export default function NtplPage(){

const dispatch = useDispatch();
const navigate = useNavigate();

const data = useSelector((state)=>state.userinfo.list);

const [buildings,setBuildings] = useState([]);


const [displayToday,setDisplayToday] = useState(0);
const [displayYesterday,setDisplayYesterday] = useState(0);
const [displayLive,setDisplayLive] = useState(0);





const [time,setTime] = useState("");

const [currentMap,setCurrentMap] = useState({});


/* ========================= */
/* FETCH DATA */
/* ========================= */

useEffect(()=>{

dispatch(fetchdata());

const interval = setInterval(()=>{
dispatch(fetchdata());
},15000);

return ()=>clearInterval(interval);

},[dispatch]);


/* ========================= */
/* FILTER + DUMMY */
/* ========================= */

useEffect(()=>{

if(!data || data.length===0) return;

const realBuildings =
data.filter(
b=>b.name.toUpperCase().includes("NTPL")
);

const combined = realBuildings


setBuildings(combined);



const map={};

combined.forEach(b=>{
map[b.id]=Number(b.currentPower||0);
});

setCurrentMap(map);

setTime(
new Date().toLocaleTimeString(
"en-IN",
{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
}
)
);

},[data]);


/* ========================= */
/* TOTALS */
/* ========================= */

const totalToday =
buildings.reduce(
(sum,b)=>sum+Number(b.today||0),
0
);

const totalYesterday =
buildings.reduce(
(sum,b)=>sum+Number(b.yesterday||0),
0
);

const totalCurrent =
Object.values(currentMap)
.reduce((sum,val)=>sum+val,0);


/* ========================= */
/* ANIMATION */
/* ========================= */

useEffect(()=>{

let start=0;
const duration=900;

const animate=()=>{

start+=16;

const progress =
Math.min(start/duration,1);

setDisplayToday(
(totalToday*progress).toFixed(1)
);

setDisplayYesterday(
(totalYesterday*progress).toFixed(1)
);

setDisplayLive(
(totalCurrent*progress).toFixed(1)
);

if(progress<1)
requestAnimationFrame(animate);

};

animate();

},[totalToday,totalYesterday,totalCurrent]);


/* ========================= */
/* UI */
/* ========================= */

return(

<div className="buildings-page">

{/* HEADER */}

<div className="second-header">

<div className="secondheader-left">

<img src={Ntpl} className="second-logo"/>

<div>

<div className="second-company">
NTPL RTS-0.3MW Monitoring
</div>

<div className="second-sub">
Solar Dashboard
</div>

</div>

<div className="header-supplier-block">

<img src={epcLogo} className="second-logo"/>

<div className="epc-text-block">

<div className="epc-label">
EPC BY
</div>

<div className="header-company epc-company">
SUN Industrial Automations & Solutions Pvt Ltd
</div>

</div>

</div>

</div>


<div className="secondheader-right">

<div className="secondlive-box">
<div className="live-dot-buildings"></div>
<span>LIVE SYSTEM</span>
</div>

<div className="second-updated">
Updated: {time}
</div>

<button
className="back-btn"
onClick={()=>navigate("/dashboard")}
>
← Back
</button>

</div>

</div>


{/* SUMMARY */}

<div className="summary">


<div className="summary-card buildings-card">

<div className="summary-left">

<div className="summary-icon">
<FaBuilding/>
</div>

<div className="summary-label">
Total Buildings
</div>

<div className="summary-number building-count">
{buildings.length}
</div>

</div>

<div className="summary-right skyline-box">

<div className="skyline">

<div className="sky-building b1"></div>
<div className="sky-building b2"></div>
<div className="sky-building b3"></div>

</div>

<div className="power-line"></div>

</div>

</div>



<div className="summary-card">

<div className="summary-left">

<div className="summary-header">

<div className="summary-icon">
<WiDaySunny/>
</div>

<div className="summary-label">
Today Production
</div>

</div>

<div className="summary-number">
{displayToday} kWh
</div>

</div>


<div className="summary-right">

<GaugeComponent
type="semicircle"
value={totalToday}
minValue={0}
maxValue={1500}
arc={{
subArcs:[
{limit:500,color:"#ff3d00"},
{limit:1000,color:"#FFC107"},
{limit:1500,color:"#00e676"}
]
}}
pointer={{
color:"#ffffff",
length:0.7,
width:8
}}
labels={{
valueLabel:{formatTextValue:()=>""}
}}
/>

</div>

</div>



<div className="summary-card">

<div className="summary-left">

<div className="summary-header">

<div className="summary-icon">
<FaHistory/>
</div>

<div className="summary-label">
Yesterday Production
</div>

</div>

<div className="summary-number">
{displayYesterday} kWh
</div>

</div>


<div className="summary-right">

<GaugeComponent
type="semicircle"
value={totalYesterday}
minValue={0}
maxValue={1500}
arc={{
subArcs:[
{limit:500,color:"#EA4228"},
{limit:1000,color:"#F5CD19"},
{limit:1500,color:"#2196f3"}
]
}}
labels={{
valueLabel:{formatTextValue:()=>""}
}}
/>

</div>

</div>



<div className="summary-card current-card">

<div className="summary-left">

<div className="summary-header">

<div className="summary-icon">
<FaBolt/>
</div>

<div className="summary-label">
Total Live Power
</div>

</div>

<div className="summary-number">
{displayLive} kW
</div>

</div>


<div className="summary-right">

<GaugeComponent
type="semicircle"
value={totalCurrent}
minValue={0}
maxValue={100}
arc={{
subArcs:[
{limit:20,color:"#EA4228"},
{limit:60,color:"#F5CD19"},
{limit:100,color:"#00e676"}
]
}}
labels={{
valueLabel:{formatTextValue:()=>""}
}}
/>

</div>

</div>

</div>



{/* BUILDINGS */}

<div className="building-grid">

{buildings.map(b=>{

const capacity =
capacityMap[normalizeName(formatBuildingName(b.name))];
const current = Number(currentMap[b.id] || 0);

// ✅ REAL STATUS FROM BACKEND
const isOffline =
  b.status === "OFFLINE";

  const isAlert =
  b.status === "ALERT";


return(

<div
key={b.id}
onClick={() =>{
   navigate(`/building/${b.id}`, {
  state: {
   name: formatBuildingName(b.name),
    today: b.today,
    yesterday: b.yesterday,
    cumulative: b.total,
    currentPower: current,
    capacity: capacity
  }
});
}}
className="building-card"
>

<div className="card-header">

<img
src={getNtplIcon(b.name)}
className="card-icon"
/>

{b.isDummy?

<div className="not-connected">
NOT CONNECTED
</div>

:

<div
  className={`online
  ${isOffline ? "offline" : ""}
  ${isAlert ? "alert" : ""}`}
>

  {
    isAlert
      ? "ALERT"
      : isOffline
      ? "OFFLINE"
      : "ONLINE"
  }

</div>
}

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


<div className="energy-row">

<div>

<div className="energy-label">TODAY</div>

<div className="energy-value green">
{Number(b.today||0).toFixed(1)} kWh
</div>

</div>


<div>

<div className="energy-label">YESTERDAY</div>

<div className="energy-value blue">
{Number(b.yesterday||0).toFixed(1)} kWh
</div>

</div>


<div>

<div className="energy-label">CUMULATIVE</div>

<div className="energy-value cumulative">
{Number(b.total||0).toFixed(1)} kWh
</div>

</div>

</div>


<div className="card-footer">

Last update: {time}

<div className="current-live">
Live Power: {(currentMap[b.id]||0).toFixed(1)} kW
</div>

</div>

</div>

);

})}

</div>





</div>

);

}
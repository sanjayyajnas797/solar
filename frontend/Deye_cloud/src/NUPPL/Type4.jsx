import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import GaugeComponent from "react-gauge-component";

import "../pages/Buildings.css";

/* LOGO */
import epcLogo from "../assets/sunlogo.png";
import type from '../assets/type.jpg'

/* ICONS */
import { FaBuilding, FaBolt } from "react-icons/fa";
import { WiDaySunny } from "react-icons/wi";
import { FaHistory } from "react-icons/fa";

/* CAPACITY MAP */
const capacityMap = {
  "TYPE4BLOCK825KW": 27.12,
  "TYPE4BLOCK925KW": 27.12,
  "TYPE4BLOCK1125KW": 27.12,
  "TYPE4BLOCK1025KW": 27.12,
  "TYPE4BLOCK725KW": 27.12,
  "TYPE4BLOCK225KW": 27.12,
  "TYPE4BLOCK125KW": 27.12,
  "TYPE4BLOCK325KW": 27.12,
  "TYPE4BLOCK4": 27.12,
  "TYPE4BLOCK5": 27.12,
  "TYPE4BLOCK6": 27.12
};

/* NORMALIZE */
const normalizeName = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function Type4(){

const location = useLocation();
const navigate = useNavigate();

const buildings = location.state || [];




const [time,setTime] = useState("");

const [displayToday,setDisplayToday] = useState(0);
const [displayYesterday,setDisplayYesterday] = useState(0);
const [displayLive,setDisplayLive] = useState(0);


/* TIME */
useEffect(()=>{

const update=()=>{

setTime(
new Date().toLocaleTimeString("en-IN",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
);

};

update();

const interval=setInterval(update,15000);

return()=>clearInterval(interval);

},[]);





/* TOTALS */

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
buildings.reduce(
(sum,b)=>sum+Number(b.currentPower||0),
0
);


/* ANIMATION */

useEffect(()=>{

let start=0;
const duration=900;

const animate=()=>{

start+=16;

const progress=Math.min(start/duration,1);

setDisplayToday((totalToday*progress).toFixed(1));
setDisplayYesterday((totalYesterday*progress).toFixed(1));
setDisplayLive((totalCurrent*progress).toFixed(1));

if(progress<1){
requestAnimationFrame(animate);
}

};

animate();

},[totalToday,totalYesterday,totalCurrent]);

const getBtpsIcon = (name) => {

const n = normalizeName(name);

if(n.includes("TYPE")) return type;


return type;

};


return(

<div className="buildings-page">


{/* HEADER */}

<div className="second-header">

<div className="secondheader-left">

<div>

<div className="second-company">
Type 4 Quarters Monitoring
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
onClick={()=>navigate(-1)}
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



const current = Number(b.currentPower || 0);

// ✅ REAL STATUS FROM BACKEND
const isOffline =
  b.status === "OFFLINE";

  const isAlert = b.status === "ALERT";
const normalized = normalizeName(b.name);

const clean = normalized.replace(/KW$/,"");

let capacity =
capacityMap[normalized] ||
capacityMap[clean];

const match =
b.name.match(/(\d+)\s*kw/i);

if(!capacity){
capacity = match ? Number(match[1]) : 25;
}

return(

<div
key={b.id}
onClick={() => {
  navigate(`/building/${b.id}`, {
    state: {
      name: b.name,
      today: b.today,
      yesterday: b.yesterday,
      cumulative: b.total,
      livePower: b.currentPower,
       currentPower: current,
      capacity: capacity
    }
  });
}}
className="building-card"
>

<div className="card-header">

<img
src={getBtpsIcon(b.name)}
className="card-icon"
/>

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

</div>


<div className="building-name">

<span className="building-title">
{b.name}
</span>

<span className="capacity-inline">
Plant Capacity {capacity} kW
</span>

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
Live Power: {Number(b.currentPower||0).toFixed(1)} kW
</div>

</div>

</div>

);

})}

</div>


</div>

);

}
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GaugeComponent from "react-gauge-component";
import "../pages/Buildings.css";

import API_BASE from "../pages/config";

/* LOGOS */
import Nuppl from "../assets/Nuppl.jpg";
import epcLogo from "../assets/sunlogo.png";
import buildIcon from "../assets/group.png";
import estateoffice from '../assets/estateoffice.jpg'
import estatestore from '../assets/estatestore.jpg'
import school from '../assets/school.jpg'
import hospital from '../assets/hospital.jpg'

/* REDUX */
import { useDispatch, useSelector } from "react-redux";
import { fetchdata } from "../store/createslice";

/* ICONS */
import { FaBuilding, FaBolt } from "react-icons/fa";
import { WiDaySunny } from "react-icons/wi";
import { FaHistory } from "react-icons/fa";

/* ========================= */
/* CAPACITY MAP */
/* ========================= */

const capacityMap = {
  "NUPPLESTATEOFFICE": 30.51,
  "NUPPLESTATESTORE": 10,
  "NUPPLSCHOOL40KW": 40,
  "NUPPLSCHOOL100KW": 100,
  "NUPPLGENERALHOSPITAL": 75,
  "NUPPLTRAININGCENTER": 60
};

const normalizeName = name =>
name?.toUpperCase().replace(/[^A-Z0-9]/g,"");

const formatBuildingName = name => {

if(!name) return "";

return name
.toLowerCase()
.split(" ")
.map(word =>
word==="nuppl"
? "NUPPL"
: word.charAt(0).toUpperCase()+word.slice(1)
)
.join(" ");

};


const getBuildingImage = (name) => {

const n = normalizeName(name);

if (n.includes("ESTATEOFFICE")) {
  return estateoffice;
}

if (n.includes("ESTATESTORE")) {
  return estatestore;
}

if (n.includes("SCHOOL")) {
  return school;
}

if (n.includes("HOSPITAL")) {
  return hospital;
}

return buildIcon;

};


export default function NupplPage(){

const dispatch = useDispatch();
const navigate = useNavigate();

const [list,setList] = useState(()=>{
  const cache = localStorage.getItem("nupplCache");
  return cache ? JSON.parse(cache) : [];
});
const [selected,setSelected] = useState(null);
 const [selectedDate, setSelectedDate] = useState("");
const [displayToday,setDisplayToday] = useState(0);
const [displayYesterday,setDisplayYesterday] = useState(0);
const [displayLive,setDisplayLive] = useState(0);



const [time,setTime] = useState("");

const [currentMap,setCurrentMap] = useState(()=>{
  const cache = localStorage.getItem("nupplCurrentCache");
  return cache ? JSON.parse(cache) : {};
});


/* ========================= */
/* FETCH DATA */
/* ========================= */

const fetchBuildings = async()=>{

try{

const res = await fetch(`${API_BASE}/sub-buildings`);
const data = await res.json();

/* TYPE4 */
const type4 =
data.filter(b =>
normalizeName(b.name).includes("TYPE4")
);

/* TYPE3 */
const type3 =
data.filter(b => {
  const n = normalizeName(b.name);

  return (
    n.includes("TYPE3") ||
    n.includes("TYPEIII")
  );
});

/* OTHERS */
const others =
data.filter(b =>
normalizeName(b.name).includes("NUPPL")
&& !normalizeName(b.name).includes("TYPE4")
&& !normalizeName(b.name).includes("TYPE")
);


/* GROUP OBJECTS */

const type4Group = {
id:"TYPE4_GROUP",
name:"Type 4 Quarters 11 Buildings",
isGroup:true,
type:"TYPE4",
children:type4
};

const type3Group = {
id:"TYPE3_GROUP",
name:"Type 3 Quarters 5 Buildings",
isGroup:true,
type:"TYPE3",
children:type3
};

const finalList = [
type4Group,
type3Group,
...others
];

setList(finalList);
localStorage.setItem("nupplCache", JSON.stringify(finalList));


/* CURRENT MAP */

const map={};

data.forEach(b=>{
map[b.id] = Number(b.currentPower||0);
});

setCurrentMap(map);
localStorage.setItem("nupplCurrentCache", JSON.stringify(map));

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

}
catch(e){
console.log(e);
}

};


useEffect(()=>{

fetchBuildings();

const i=setInterval(fetchBuildings,15000);

return ()=>clearInterval(i);

},[]);



/* ========================= */
/* TOTALS */
/* ========================= */

const totalToday =
list.reduce((sum,b)=>{

if(b.isGroup){
return sum +
b.children.reduce((s,x)=>
s+Number(x.today||0),0);
}

return sum + Number(b.today||0);

},0);


const totalYesterday =
list.reduce((sum,b)=>{

if(b.isGroup){
return sum +
b.children.reduce((s,x)=>
s+Number(x.yesterday||0),0);
}

return sum + Number(b.yesterday||0);

},0);


const totalCurrent =
Object.values(currentMap)
.reduce((a,b)=>a+b,0);


/* ========================= */
/* COUNTER ANIMATION */
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

const groups = list.filter(b => b.isGroup);
const others = list.filter(b => !b.isGroup);


return(

<div className="buildings-page nuppl-page">


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
{list.length}
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



{/* 🔥 GROUPS TOP ROW */}
<div className="nuppl-group-row">
  {groups.map(b => {

    let today =
      b.children.reduce((s,x)=>s+Number(x.today||0),0);

    let yesterday =
      b.children.reduce((s,x)=>s+Number(x.yesterday||0),0);

    let total =
      b.children.reduce((s,x)=>s+Number(x.total||0),0);

    let current =
      b.children.reduce((s,x)=>s+Number(x.currentPower||0),0);

    return(
      <div
        key={b.id}
        onClick={()=>{
          if(b.id==="TYPE4_GROUP"){
            navigate("/type4",{state:b.children});
          } else if(b.id==="TYPE3_GROUP"){
            navigate("/type3",{state:b.children});
          }
        }}
        className="building-card group-card nuppl-group-card"
      >

        <div className="card-header">
          <img src={buildIcon} className="card-icon"/>
          <div className="online">GROUP</div>
        </div>

    <div className="building-name">

  <span className="building-title">
    {formatBuildingName(b.name)}
  </span>

</div>

        <div className="energy-row">
          <div>
            <div className="energy-label">TODAY</div>
            <div className="energy-value green">{today.toFixed(1)} kWh</div>
          </div>

          <div>
            <div className="energy-label">YESTERDAY</div>
            <div className="energy-value blue">{yesterday.toFixed(1)} kWh</div>
          </div>

          <div>
            <div className="energy-label">CUMULATIVE</div>
            <div className="energy-value cumulative">{total.toFixed(1)} kWh</div>
          </div>
        </div>

        <div className="current-live">
          Live Power: {current.toFixed(1)} kW
        </div>

      </div>
    );
  })}
</div>


{/* 🔥 OTHER BUILDINGS */}
<div className="building-grid">
  {others.map(b => {
      const capacity =
  capacityMap[
    normalizeName(b.name)
  ] || 0;
    let today=Number(b.today||0);
    let yesterday=Number(b.yesterday||0);
    let total=Number(b.total||0);
    let current=Number(b.currentPower||0);
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
    src={getBuildingImage(b.name)}
    className="card-icon"
  />

  <div
  className={`
    online
    ${isOffline ? "offline" : ""}
    ${isAlert ? "alert" : ""}
  `}
>
  {
    isOffline
      ? "OFFLINE"
      : isAlert
      ? "ALERT"
      : "ONLINE"
  }
</div>
</div>

        

       <div className="building-name">

  <span className="building-title">
    {formatBuildingName(b.name)}
  </span>

  {capacity > 0 && (
    <span className="capacity-inline">
      Plant Capacity {capacity} kW
    </span>
  )}

</div>

        <div className="energy-row">
          <div>
            <div className="energy-label">TODAY</div>
            <div className="energy-value green">{today.toFixed(1)} kWh</div>
          </div>

          <div>
            <div className="energy-label">YESTERDAY</div>
            <div className="energy-value blue">{yesterday.toFixed(1)} kWh</div>
          </div>

          <div>
            <div className="energy-label">CUMULATIVE</div>
            <div className="energy-value cumulative">{total.toFixed(1)} kWh</div>
          </div>
        </div>

        <div className="card-footer">
          <div className="current-live">
            Live Power: {current.toFixed(1)} kW
          </div>
        </div>

      </div>
    );
  })}
</div>


</div>

);

}
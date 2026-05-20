import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GaugeComponent from "react-gauge-component";
import "../pages/Buildings.css";

import API_BASE from "../pages/config";


/* CLIENT LOGO */
import logo from "../assets/main logo.png";

/* EPC LOGO */
import epcLogo from "../assets/sunlogo.png";

import library from '../assets/lik.png';
import education from '../assets/educationicon.png'
import switchyard from '../assets/swichyard.png'
import office from '../assets/office.png'
import pstc from '../assets/pstc.png'
import canteen from '../assets/canteen.webp'
import screen1 from '../assets/screen1.png'
import screen2 from '../assets/screen.avif'
import Tps from '../assets/tps.jpg'

import { useDispatch, useSelector } from "react-redux";
import { fetchdata } from "../store/createslice";
import { FaBuilding, FaBolt } from "react-icons/fa";
import { WiDaySunny } from "react-icons/wi";
import { FaHistory } from "react-icons/fa";




const capacityMap = {

  "NLCILLIBRARY50KWONGRID": 50.85,
  "NLCILEDUCATIONOFFICE": 23.73,
  "NLCILLDCOFFICEINV225KW": 145,

  /* ✅ TPS-2 ADDED */
  "NLCILTPS2EXPSWITCHYARD40KW": 35.03,
  "NLCILPSTCBUILDING":122.04,
  "NLCILTPS1EXPCANTEEN": 33.90,
  "NLCILLDCOFFICEINV1":145,
  "NLCILTPS2EXPSCREENHOUSEA":97.18,
  "NLCILTPS2EXPSCREENHOUSEB":73.45,
  "NLCILTPS2EXPASHHANDLING": 40
  

};



const normalizeName = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");


/* ========================= */
/* FORMAT BUILDING NAME */
/* ========================= */

const formatBuildingName = (name) => {

  if (!name) return "";

  /* ✅ CUSTOM NAME FIX */
  if (name.toUpperCase().includes("TPS-2 EXPENSTION")) {
    return "Tps-2 Expe Switch Yard";
  }

  return name
    .toLowerCase()
    .split(" ")
    .map((word) => {

      if (word === "nlcil") return "NLCIL";
       

      if (word.includes("&")) return word.toUpperCase();

      if (word.includes("inv")) return word.toUpperCase();

      return word.charAt(0).toUpperCase() + word.slice(1);

    })
    .join(" ");

};

const getBuildingIcon = (name) => {

const n = normalizeName(name);

if(n.includes("LIBRARY")) return library;

if(n.includes("EDUCATION")) return education;

if(n.includes("OFFICE")) return office;

if(n.includes("SWITCHYARD")) return switchyard

if(n.includes("PSTC"))return pstc

if(n.includes("CANTEEN")) return canteen;

if(n.includes("SCREENHOUSEA")) return screen1;

if(n.includes("SCREENHOUSEB")) return screen2;

if(n.includes("TPS2EXPNBUILDINGASHHANDLING")) return Tps

return Tps

};


export default function Buildings() {


  const dispatch=useDispatch()
  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  

  const [displayToday,setDisplayToday] = useState(0)
const [displayYesterday,setDisplayYesterday] = useState(0)
const [displayLive,setDisplayLive] = useState(0)

 

  const [time, setTime] = useState("");

  const [currentMap, setCurrentMap] = useState({});

 

 


const data=useSelector((state)=>state.userinfo.list)

      /* ✅ SINGLE SOURCE FETCH */
  useEffect(() => {

    dispatch(fetchdata());

    const interval = setInterval(() => {
      dispatch(fetchdata());
    }, 15000);

    return () => clearInterval(interval);

  }, [dispatch]);


  /* ✅ FILTER + MAP */
  useEffect(() => {

    if (!data || data.length === 0) return;

    const filtered = data.filter(b => {

      const name = b.name.toUpperCase();

      return (
        name.includes("NLCIL") ||
        name.includes("TPS-2") ||
        name.includes("NEYVELI")
      );

    });

    setBuildings(filtered);


   


    const map = {};

    filtered.forEach(b => {
      map[b.id] = Number(b.currentPower || 0);
    });

    setCurrentMap(map);


    setTime(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    );

  }, [data]);
  /* ========================= */
  /* FETCH PEAK */
  /* ========================= */





 

  const totalToday =
    buildings.reduce(
      (sum, b) =>
        sum + Number(b.today || 0),
      0
    );


  const totalYesterday =
    buildings.reduce(
      (sum, b) =>
        sum + Number(b.yesterday || 0),
      0
    );


  const totalCurrent =
    Object.values(currentMap)
      .reduce(
        (sum, val) =>
          sum + val,
        0
      );
useEffect(()=>{

let start = 0
const duration = 900

const animate = () => {

start += 16
const progress = Math.min(start/duration,1)

setDisplayToday((totalToday * progress).toFixed(1))
setDisplayYesterday((totalYesterday * progress).toFixed(1))
setDisplayLive((totalCurrent * progress).toFixed(1))

if(progress < 1){
requestAnimationFrame(animate)
}

}

animate()

},[totalToday,totalYesterday,totalCurrent])




  return (

<div className="buildings-page">


{/* HEADER */}
<div className="second-header">

<div className="secondheader-left">

<img src={logo} className="second-logo"/>

<div>

<div className="second-company">
NLCIL RTS-2.5MW Monitoring
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
onClick={() => navigate("/dashboard")}
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

{/* ❌ PEAK CARD REMOVED */}

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
maxValue={50}
arc={{
subArcs:[
{limit:10,color:"#EA4228"},
{limit:30,color:"#F5CD19"},
{limit:50,color:"#00e676"}
]
}}
labels={{
valueLabel:{formatTextValue:()=>""}
}}
/>

</div>

</div>

</div>



<div className="building-grid">

{buildings.map(b => {

const current = Number(currentMap[b.id] || 0);

// ✅ REAL STATUS FROM BACKEND
const isOffline =
  b.status === "OFFLINE";

  const isAlert =
  b.status === "ALERT";

const today = isOffline ? 0 : Number(b.today || 0);
const live = isOffline ? 0 : current;

const yesterday = Number(b.yesterday || 0);
const total = Number(b.total || 0);

const capacity =
capacityMap[
normalizeName(formatBuildingName(b.name))
]


return (

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

{/* CARD HEADER */}
<div className="card-header">

<img
src={getBuildingIcon(b.name)}
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


{/* BUILDING NAME */}
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


{/* ENERGY ROW */}
<div className="energy-row">

<div>
<div className="energy-label">TODAY</div>
<div className="energy-value green">
{today.toFixed(1)} kWh
</div>
</div>

<div>
<div className="energy-label">YESTERDAY</div>
<div className="energy-value blue">
{yesterday.toFixed(1)} kWh
</div>
</div>

<div>
<div className="energy-label">CUMULATIVE</div>
<div className="energy-value cumulative">
{total.toFixed(1)} kWh
</div>
</div>

</div>




{/* FOOTER */}
<div className="card-footer">

Last update: {time}

<div className="current-live">
Live Power: {live.toFixed(1)} kW
</div>

</div>

</div>

);

})}

</div>




</div>

);

}
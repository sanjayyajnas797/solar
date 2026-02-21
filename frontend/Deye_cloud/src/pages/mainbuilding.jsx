import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Mainbuilding.css";

import logo from "../assets/sunlogo.png";
import campusIcon from "../assets/building.png";

import mainlogo from "../assets/main logo.png";
import Ntpl from "../assets/Ntpl.jpg";
import Nuppl from "../assets/Nuppl.jpg";

import {
  WiDaySunny,
  WiThermometer
} from "react-icons/wi";

import API_BASE from "./config";

export default function Mainbuilding(){

const navigate = useNavigate();

const [campusList,setCampusList] = useState([]);
const [weatherData,setWeatherData] = useState({});
const [updateTime,setUpdateTime] = useState("");

const handleLogout=()=>{
  localStorage.removeItem("token");
  navigate("/");
};

const getCampusLogo = (name)=>{
switch(name){
case "NLCIL":
case "NLCIC":
case "BTPS":
return mainlogo;
case "NTPL":
return Ntpl;
case "NUPPL":
return Nuppl;
default:
return campusIcon;
}
};

// WEATHER FETCH
const fetchWeather = async(campus)=>{
try{
const res = await fetch(`${API_BASE}/weather/${campus}`);
return await res.json();
}catch{
return {irradiance:0,ambientTemp:0};
}
};

// FETCH DATA
const fetchData = async()=>{
try{

const resSub = await fetch(`${API_BASE}/sub-buildings`);
const buildings = await resSub.json();

const summary={
NLCIL:{today:0,yesterday:0,total:0,count:0},
NLCIC:{today:0,yesterday:0,total:0,count:0},
NTPL:{today:0,yesterday:0,total:0,count:0},
NUPPL:{today:0,yesterday:0,total:0,count:0},
BTPS:{today:0,yesterday:0,total:0,count:0}
};

/* ========================= */
/* OLD LOOP (UNCHANGED) */
/* ========================= */
buildings.forEach(b=>{
const n=b.name?.toUpperCase()||"";

if(n.includes("BTPS")){
summary.BTPS.today+=Number(b.today||0);
summary.BTPS.yesterday+=Number(b.yesterday||0);
summary.BTPS.total+=Number(b.total||0);
summary.BTPS.count++;
}
else if(n.includes("NLCIC")){
summary.NLCIC.today+=Number(b.today||0);
summary.NLCIC.yesterday+=Number(b.yesterday||0);
summary.NLCIC.total+=Number(b.total||0);
summary.NLCIC.count++;
}
else if(n.includes("NTPL")){
summary.NTPL.today+=Number(b.today||0);
summary.NTPL.yesterday+=Number(b.yesterday||0);
summary.NTPL.total+=Number(b.total||0);
summary.NTPL.count++;
}
else if(n.includes("NUPPL")){
summary.NUPPL.today+=Number(b.today||0);
summary.NUPPL.yesterday+=Number(b.yesterday||0);
summary.NUPPL.total+=Number(b.total||0);
summary.NUPPL.count++;
}
else{
summary.NLCIL.today+=Number(b.today||0);
summary.NLCIL.yesterday+=Number(b.yesterday||0);
summary.NLCIL.total+=Number(b.total||0);
summary.NLCIL.count++;
}
});

/* ========================= */
/* ✅ NEW CORRECT LOGIC (ADD ONLY) */
/* ========================= */

const getSum = (list) => ({
  today: list.reduce((s,b)=>s+Number(b.today||0),0),
  yesterday: list.reduce((s,b)=>s+Number(b.yesterday||0),0),
  total: list.reduce((s,b)=>s+Number(b.total||0),0),
  count: list.length
});

/* ✅ PERFECT FILTERING */
const NLCIL_list = buildings.filter(b => {
  const n = b.name?.toUpperCase() || "";
  return (
    (n.includes("NLCIL") && !n.includes("NLCIC")) ||
    n.includes("TPS-2")
  );
});

const NLCIC_list = buildings.filter(b =>
  b.name?.toUpperCase().includes("NLCIC")
);

const NTPL_list = buildings.filter(b =>
  b.name?.toUpperCase().includes("NTPL")
);

const NUPPL_list = buildings.filter(b =>
  b.name?.toUpperCase().includes("NUPPL")
);

const BTPS_list = buildings.filter(b =>
  b.name?.toUpperCase().includes("BTPS")
);

/* ✅ FINAL SUMMARY */
summary.NLCIL = getSum(NLCIL_list);
summary.NLCIC = getSum(NLCIC_list);
summary.NTPL = getSum(NTPL_list);
summary.NUPPL = getSum(NUPPL_list);
summary.BTPS = getSum(BTPS_list);

/* ========================= */
/* FINAL LIST */
/* ========================= */

const list=[
{
name:"NLCIL",
display:"NLCIL RTS",
mw:"2.5MW",
mwClass:"mw-uniform",
today:summary.NLCIL.today,
yesterday:summary.NLCIL.yesterday,
total:summary.NLCIL.total,
path:"/buildings"
},
{
name:"NLCIC",
display:"NLCIL FTS",
mw:"1.0MW",
mwClass:"mw-uniform",
today:summary.NLCIC.today,
yesterday:summary.NLCIC.yesterday,
total:summary.NLCIC.total,
path:"/nlcic"
},
{
name:"NTPL",
display:"NTPL RTS",
mw:"0.3MW",
mwClass:"mw-uniform",
today:summary.NTPL.today,
yesterday:summary.NTPL.yesterday,
total:summary.NTPL.total,
path:"/ntpl"
},
{
name:"NUPPL",
display:"NUPPL RTS",
mw:"0.8MW",
mwClass:"mw-uniform",
today:summary.NUPPL.today,
yesterday:summary.NUPPL.yesterday,
total:summary.NUPPL.total,
path:"/nuppl"
},
{
name:"BTPS",
display:"BTPS RTS",
mw:"0.4MW",
mwClass:"mw-uniform",
today:summary.BTPS.today,
yesterday:summary.BTPS.yesterday,
total:summary.BTPS.total,
path:"/btps"
}
];

const w={};
for(const c of list){
w[c.name]=await fetchWeather(c.name);
}

setWeatherData(w);
setCampusList(list);

setUpdateTime(
new Date().toLocaleTimeString("en-IN",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
);

}catch(e){
console.log("Mainbuilding error:",e);
}
};

useEffect(()=>{
fetchData();
const t=setInterval(fetchData,10000);
return ()=>clearInterval(t);
},[]);

return(

<div className="dashboard">

<div className="header">

<div className="header-left-new">

<img src={mainlogo} className="header-logo-left"/>

<div className="header-text-block">
<div className="header-client-name">
NLC India Limited
</div>
<div className="header-title">
4MW Rooftop & 1MW Floating Solar System
<span className="header-separator"> | </span>
Online Monitoring
</div>
</div>

<div className="header-supplier-block">
<img src={logo} className="header-logo-left"/>
<div className="epc-text-block">
<div className="epc-label">EPC BY</div>
<div className="header-company epc-company">
SUN Industrial Automations & Solutions Pvt Ltd
</div>
</div>
</div>

</div>

<div className="header-right">

<div className="live-container">
<span className="live-dot"></span>
<span className="live-text">LIVE SYSTEM</span>
</div>

<div className="update-container">
<div className="update-label">LAST UPDATE</div>
<div className="update-time">{updateTime}</div>
</div>

<button className="logout" onClick={handleLogout}>
Logout
</button>

</div>

<div className="header-energy-flow"></div>

</div>

<div className="scada-container">

{campusList.map((c,i)=>{

const w=weatherData[c.name]||{};

return(

<div className="scada-row" key={i}>

<div className="panel campus-card" onClick={()=>navigate(c.path)}>
<img src={getCampusLogo(c.name)} />
<div>
<div className="value cyan">
{c.display}
<span className={c.mwClass}> {c.mw}</span>
</div>
</div>
</div>

<div className="flow-line"></div>

<div className="panel">
<div className="label">TODAY</div>
<div className="value green">{c.today.toFixed(1)} kWh</div>

<div className="label">YESTERDAY</div>
<div className="value blue">{c.yesterday.toFixed(1)} kWh</div>
</div>

<div className="flow-line"></div>

<div className="panel">
<div className="label">CUMULATIVE</div>
<div className="value cyan">{c.total.toLocaleString()} kWh</div>
</div>

<div className="flow-line"></div>

<div className="panel">

<div className="weather-row">
<WiDaySunny className="icon sun"/>
<div>
<div className="label">IRRADIANCE</div>
<div className="value green">{w.irradiance} W/m²</div>
</div>
</div>

<div className="weather-row">
<WiThermometer className="icon temp"/>
<div>
<div className="label">TEMPERATURE</div>
<div className="value blue">{w.ambientTemp} °C</div>
</div>
</div>

</div>

</div>

);

})}

</div>

</div>

);

}
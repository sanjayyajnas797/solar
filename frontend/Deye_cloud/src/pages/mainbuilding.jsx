import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Mainbuilding.css";

import logo from "../assets/sunlogo.png";
import campusIcon from "../assets/building.png";

import { WiDaySunny, WiThermometer, WiStrongWind } from "react-icons/wi";

import API_BASE from './config';   // ✅ ADD THIS


export default function Mainbuilding(){

const navigate = useNavigate();

const [campusList,setCampusList] = useState([]);
const [weatherData,setWeatherData] = useState({});
const [updateTime,setUpdateTime] = useState("");


// LOGOUT
const handleLogout=()=>{
localStorage.removeItem("token");
navigate("/");
};


// FETCH WEATHER
const fetchWeather = async(campus)=>{

try{

const res = await fetch(
`${API_BASE}/weather/${campus}`
);

return await res.json();

}catch{

return {
irradiance:0,
ambientTemp:0,
windSpeed:0
};

}

};


// FETCH DATA
const fetchData = async()=>{

try{

// MAIN BUILDING
const resMain = await fetch(
`${API_BASE}/main-building`
);

const mainData = await resMain.json();


// SUB BUILDINGS
const resSub = await fetch(
`${API_BASE}/sub-buildings`
);

const buildings = await resSub.json();


// GROUPING
const summary={

NLCIC:{today:0,yesterday:0,total:0,count:0},
NTPL:{today:0,yesterday:0,total:0,count:0},
NUPPL:{today:0,yesterday:0,total:0,count:0},
BTPS:{today:0,yesterday:0,total:0,count:0}

};


buildings.forEach(b=>{

const n=b.name?.toUpperCase()||"";

if(n.includes("BTPS")){

summary.BTPS.today+=b.today;
summary.BTPS.yesterday+=b.yesterday;
summary.BTPS.total+=b.total;
summary.BTPS.count++;

}

else if(n.includes("NLCIC")){

summary.NLCIC.today+=b.today;
summary.NLCIC.yesterday+=b.yesterday;
summary.NLCIC.total+=b.total;
summary.NLCIC.count++;

}

else if(n.includes("NTPL")){

summary.NTPL.today+=b.today;
summary.NTPL.yesterday+=b.yesterday;
summary.NTPL.total+=b.total;
summary.NTPL.count++;

}

else if(n.includes("NUPPL")){

summary.NUPPL.today+=b.today;
summary.NUPPL.yesterday+=b.yesterday;
summary.NUPPL.total+=b.total;
summary.NUPPL.count++;

}

});


// FINAL CAMPUS LIST
const list=[

{
name:"NLCIL",
display:"NLCIL CAMPUS",
today:mainData.today,
yesterday:mainData.yesterday,
total:mainData.total,
hasBuilding:true,
path:"/buildings"
},

{
name:"NLCIC",
display:"NLCIC",
...summary.NLCIC,
hasBuilding:summary.NLCIC.count>0,
path:"/nlcic"
},

{
name:"NTPL",
display:"NTPL",
...summary.NTPL,
hasBuilding:summary.NTPL.count>0,
path:"/ntpl"
},

{
name:"NUPPL",
display:"NUPPL",
...summary.NUPPL,
hasBuilding:summary.NUPPL.count>0,
path:"/nuppl"
},

{
name:"BTPS",
display:"BTPS",
...summary.BTPS,
hasBuilding:summary.BTPS.count>0,
path:"/btps"
}

];


// WEATHER FETCH
const w={};

for(const c of list){

w[c.name]=await fetchWeather(c.name);

}

setWeatherData(w);
setCampusList(list);


// UPDATED TIME
setUpdateTime(
new Date().toLocaleTimeString("en-IN",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
);

}catch(e){

console.log(e);

}

};


// AUTO REFRESH
useEffect(()=>{

fetchData();

const t=setInterval(fetchData,10000);

return ()=>clearInterval(t);

},[]);


// UI
return(

<div className="dashboard">

{/* HEADER */}
<div className="header">

<div className="header-left">

<img src={logo} className="logo"/>

<div>

<div className="company">
Sun Industrial Automations & Solutions Pvt Ltd
</div>

<div className="subtitle">
Enterprise Solar Monitoring System
</div>

</div>

</div>


<div className="header-right">

<div className="live-container">

<span className="live-dot"></span>

<span className="live-text">
LIVE SYSTEM
</span>

</div>


<div className="update-container">

<div className="update-label">
LAST UPDATE
</div>

<div className="update-time">
{updateTime}
</div>

</div>


<button
className="logout"
onClick={handleLogout}
>
Logout
</button>

</div>

<div className="header-energy-flow"></div>

</div>


{/* BODY */}
<div className="scada-container">

{campusList.map((c,i)=>{

const w=weatherData[c.name]||{};

return(

<div className="scada-row" key={i}>

<div
className="panel campus-card"
onClick={()=>navigate(c.path)}>

<img src={campusIcon}/>

<div>

<div className="label">
CAMPUS
</div>

<div className="value cyan">
{c.display}
</div>

</div>

</div>


<div className="flow-line"></div>


<div className="panel">

<div className="label">
TODAY
</div>

<div className="value green">
{c.today?.toFixed(1)} kWh
</div>


<div className="label">
YESTERDAY
</div>

<div className="value blue">
{c.yesterday?.toFixed(1)} kWh
</div>

</div>


<div className="flow-line"></div>


<div className="panel">

<div className="label">
CUMULATIVE
</div>

<div className="value cyan">
{c.total?.toLocaleString()} kWh
</div>

</div>


<div className="flow-line"></div>


<div className="panel">

<div className="weather-row">

<WiDaySunny className="icon sun"/>

<div>

<div className="label">
IRRADIANCE
</div>

<div className="value green">
{w.irradiance} W/m²
</div>

</div>

</div>


<div className="weather-row">

<WiThermometer className="icon temp"/>

<div>

<div className="label">
TEMPERATURE
</div>

<div className="value blue">
{w.ambientTemp} °C
</div>

</div>

</div>


<div className="weather-row">

<WiStrongWind className="icon wind"/>

<div>

<div className="label">
WIND SPEED
</div>

<div className="value cyan">
{w.windSpeed} km/h
</div>

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

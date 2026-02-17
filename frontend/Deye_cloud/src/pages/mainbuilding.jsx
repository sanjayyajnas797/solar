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


// LOGOUT
const handleLogout=()=>{
  localStorage.removeItem("token");
  navigate("/");
};


// GET CAMPUS LOGO FUNCTION
const getCampusLogo = (name)=>{

switch(name){

case "NLCIL":
return mainlogo;

case "NLCIC":
return mainlogo;

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
ambientTemp:0
};

}

};


// FETCH DATA
const fetchData = async()=>{

try{

const resSub =
await fetch(`${API_BASE}/sub-buildings`);

const buildings =
await resSub.json();


// SUMMARY
const summary={

NLCIL:{today:0,yesterday:0,total:0,count:0},
NLCIC:{today:0,yesterday:0,total:0,count:0},
NTPL:{today:0,yesterday:0,total:0,count:0},
NUPPL:{today:0,yesterday:0,total:0,count:0},
BTPS:{today:0,yesterday:0,total:0,count:0}

};


// GROUPING
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


// FINAL LIST
const list=[

{
name:"NLCIL",
display:"NLCIC,RTS-2.5MW",
today:summary.NLCIL.today,
yesterday:summary.NLCIL.yesterday,
total:summary.NLCIL.total,
path:"/buildings"
},

{
name:"NLCIC",
display:"NLCIC,FTS-1.0MW",
today:summary.NLCIC.today,
yesterday:summary.NLCIC.yesterday,
total:summary.NLCIC.total,
path:"/nlcic"
},

{
name:"NTPL",
display:"NTPL,RTS-0.3MW",
today:summary.NTPL.today,
yesterday:summary.NTPL.yesterday,
total:summary.NTPL.total,
path:"/ntpl"
},

{
name:"NUPPL",
display:"NUPPL,RTS-0.8MW",
today:summary.NUPPL.today,
yesterday:summary.NUPPL.yesterday,
total:summary.NUPPL.total,
path:"/nuppl"
},

{
name:"BTPS",
display:"BTPS,RTS-0.4MW",
today:summary.BTPS.today,
yesterday:summary.BTPS.yesterday,
total:summary.BTPS.total,
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


// TIME
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

<div className="header-left-new">

  {/* CLIENT LOGO */}
  <img src={mainlogo} className="header-logo-left"/>


  {/* TEXT BLOCK */}
  <div className="header-text-block">

    <div className="header-title">
      4MW ROOFTOP & 1MW FLOATING SOLAR SYSTEM | ONLINE MONITORING
    </div>


    {/* SUPPLIER ROW */}
    <div className="header-supplier-row">

      <span className="header-supplied-label">
        Supplied, Installed & Commissioned By
      </span>

      <img src={logo} className="header-logo-supplier"/>

      <span className="header-company">
        SUN Industrial Automations & Solutions Pvt Ltd, Chennai – 600096.
      </span>

    </div>

  </div>

</div>



  {/* RIGHT SECTION */}
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




{/* BODY */}
<div className="scada-container">

{campusList.map((c,i)=>{

const w=weatherData[c.name]||{};

return(

<div className="scada-row" key={i}>


{/* LOGO REPLACED HERE */}
<div
className="panel campus-card"
onClick={()=>navigate(c.path)}>

<img src={getCampusLogo(c.name)} />

<div>

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
{c.today.toFixed(1)} kWh
</div>


<div className="label">
YESTERDAY
</div>

<div className="value blue">
{c.yesterday.toFixed(1)} kWh
</div>

</div>


<div className="flow-line"></div>


<div className="panel">

<div className="label">
CUMULATIVE
</div>

<div className="value cyan">
{c.total.toLocaleString()} kWh
</div>

</div>


<div className="flow-line"></div>


{/* WEATHER */}
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

</div>


</div>

);

})}

</div>

</div>

);

}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../pages/Buildings.css";
import PowerGraph from "../graph/graph";
import API_BASE from "../pages/config";

/* CLIENT LOGO */
import Ntpl from "../assets/Ntpl.jpg";

/* EPC LOGO */
import epcLogo from "../assets/sunlogo.png";

import buildIcon from "../assets/tower.png";



/* CAPACITY MAP — NTPL */
const capacityMap = {
  "NTPL STROM WATER PUMP HOUSE": 20.34,
  "NTPL PARKING SHED 1 TO 6": 118.65,
  "NTPL SERVICE BUILDING": 110.74,
  "NTPL ADMINISTRATIVE BUILDING": 50.85
};


/* ✅ DUMMY BUILDINGS */
const dummyBuildings = [

{
id:"dummy-1",
name:"NTPL Parking Shed 1 to 6",
today:0,
yesterday:0,
currentPower:0,
isDummy:true
},

{
id:"dummy-2",
name:"NTPL Service Building",
today:0,
yesterday:0,
currentPower:0,
isDummy:true
},

{
id:"dummy-3",
name:"NTPL Administrative Building",
today:0,
yesterday:0,
currentPower:0,
isDummy:true
}

];



/* FORMAT NAME */
const formatBuildingName = (name) => {

if (!name) return "";

return name
.toLowerCase()
.split(" ")
.map(word => {

if (word === "ntpl") return "NTPL";

if (word.includes("&")) return word.toUpperCase();

if (word.includes("inv")) return word.toUpperCase();

return word.charAt(0).toUpperCase() + word.slice(1);

})
.join(" ");

};



export default function NtplPage(){

const navigate = useNavigate();

const [buildings,setBuildings] = useState([]);

const [selectedBuilding,setSelectedBuilding] = useState(null);

const [graphType,setGraphType] = useState("today");

const [time,setTime] = useState("");

const [currentMap,setCurrentMap] = useState({});

const [peak,setPeak] = useState({
value:0,
name:"--",
time:"--"
});



/* FETCH BUILDINGS */
const fetchBuildings = async()=>{

try{

const res =
await fetch(`${API_BASE}/sub-buildings`);

const data =
await res.json();


/* ONLY NTPL REAL BUILDINGS */
const realBuildings =
data.filter(
b=>b.name.toUpperCase().includes("NTPL")
);


/* ✅ ADD DUMMY BUILDINGS */
const combined =
[
...realBuildings,
...dummyBuildings.slice(
0,
Math.max(0,4-realBuildings.length)
)
];


setBuildings(combined);


/* AUTO SELECT */
setSelectedBuilding(prev=>{

if(!prev && combined.length)
return combined[0];

const updated =
combined.find(
b=>b.id===prev?.id
);

return updated || combined[0];

});


/* CURRENT MAP */
const map={};

combined.forEach(b=>{

map[b.id]=Number(b.currentPower||0);

});

setCurrentMap(map);


/* CLOCK */
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
catch(err){

console.log(err);

}

};



/* FETCH PEAK */
const fetchPeak = async()=>{

if(!selectedBuilding) return;

/* ✅ DUMMY BUILDING PEAK = 0 */
if(selectedBuilding.isDummy){

setPeak({
value:0,
name:formatBuildingName(selectedBuilding.name),
time:"--"
});

return;

}

try{

const res =
await fetch(
`${API_BASE}/graph/${graphType}/${selectedBuilding.id}`
);

const graph =
await res.json();

if(!graph.length){

setPeak({
value:0,
name:formatBuildingName(selectedBuilding.name),
time:"--"
});

return;

}


let max=0;
let peakTime="--";


graph.forEach(point=>{

const power =
Number(point.power)/1000;

if(power>max){

max=power;

peakTime =
new Date(point.time)
.toLocaleTimeString(
"en-IN",
{
hour:"2-digit",
minute:"2-digit"
}
);

}

});


setPeak({
value:max,
name:formatBuildingName(selectedBuilding.name),
time:peakTime
});

}
catch(err){

console.log(err);

}

};



/* AUTO REFRESH */
useEffect(()=>{

fetchBuildings();

const interval =
setInterval(fetchBuildings,15000);

return ()=>clearInterval(interval);

},[]);



useEffect(()=>{

if(selectedBuilding)
fetchPeak();

},[selectedBuilding,graphType]);



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
Object.values(currentMap)
.reduce(
(sum,val)=>sum+val,
0
);



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
● LIVE SYSTEM
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

<div className="summary-card">
<div className="summary-label">
Total Buildings
</div>
<div className="summary-value">
{buildings.length}
</div>
</div>


<div className="summary-card">
<div className="summary-label">
Today Production
</div>
<div className="summary-value green">
{totalToday.toFixed(1)} kWh
</div>
</div>


<div className="summary-card">
<div className="summary-label">
Yesterday Production
</div>
<div className="summary-value blue">
{totalYesterday.toFixed(1)} kWh
</div>
</div>





<div className="summary-card current-card">

<div className="summary-label">
Live Power
</div>

<div className="summary-value current-text">
{totalCurrent.toFixed(1)} kW
</div>

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
onClick={() => {
  setSelectedBuilding(b);
}}
className={`building-card ${isActive?"active":""}`}
>
<div className="card-header">

<img src={buildIcon} className="card-icon"/>

{b.isDummy ? (

<div className="not-connected">
NOT CONNECTED
</div>

) : (

<div className="online">
ONLINE
</div>

)}

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
{Number(b.total || 0).toFixed(1)} kWh
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



{/* GRAPH */}
{selectedBuilding && !selectedBuilding.isDummy && (

<div className="graph-section">

<div className="graph-title">
Energy Trend - {formatBuildingName(selectedBuilding.name)}
</div>

<div className="graph-buttons">

<button
className={`graph-btn ${graphType==="today"?"active-btn":""}`}
onClick={()=>setGraphType("today")}
>
Today
</button>

<button
className={`graph-btn ${graphType==="yesterday"?"active-btn":""}`}
onClick={()=>setGraphType("yesterday")}
>
Yesterday
</button>

<button
className={`graph-btn ${graphType==="monthly"?"active-btn":""}`}
onClick={()=>setGraphType("monthly")}
>
Monthly
</button>

</div>


<div className="graph-box">

<PowerGraph
stationId={selectedBuilding.id}
type={graphType}
buildingName={formatBuildingName(selectedBuilding.name)}
/>

</div>

</div>

)}

</div>

);

}

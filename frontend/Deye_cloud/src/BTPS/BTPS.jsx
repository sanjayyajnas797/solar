import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../pages/Buildings.css";
import PowerGraph from "../graph/graph";
import API_BASE from "../pages/config";

import logo from "../assets/main logo.png";
import epcLogo from "../assets/sunlogo.png";   // ✅ EPC LOGO ADDED
import buildIcon from "../assets/tower.png";


/* CAPACITY MAP */
const capacityMap = {

  "NLCBTPSOHCBUILDING": 23.73,
  "NLCBTPSOFFICERSCLUB": 27.12,
  "NLCBTPSTAOFFICE": 23.73,
  "NLCBTPSNEWSCHOOLBUILDING": 149.16

};


/* NORMALIZE */
const normalizeName = name =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

       const formatBtpsName = (name) => {

  if (!name) return "";

  let formatted = name;

  formatted = formatted.replace(/,\s*/g, ", ");

  if (formatted.toUpperCase().startsWith("NLC BTPS")) {

    const prefix = "NLC BTPS";

    let rest = formatted.slice(prefix.length);

    rest = rest
      .toLowerCase()
      .split(" ")
      .map(word => {

        if (!word) return "";

        /* ✅ FORCE TA CAPITAL */
        if (word.toLowerCase() === "ta")
          return "TA";

        return word.charAt(0).toUpperCase() + word.slice(1);

      })
      .join(" ");

    formatted = prefix + rest;
  }

  return formatted;

};

export default function Btps(){

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

      const btps =
        data.filter(b =>
          b.name.toUpperCase().includes("BTPS")
        );

      setBuildings(btps);


      setSelectedBuilding(prev=>{

        if(!prev && btps.length)
          return btps[0];

        const updated =
          btps.find(b=>b.id===prev?.id);

        return updated || btps[0];

      });


      const map = {};

      btps.forEach(b=>{
        map[b.id] =
          Number(b.currentPower || 0);
      });

      setCurrentMap(map);


      setTime(
        new Date().toLocaleTimeString("en-IN",{
          hour:"2-digit",
          minute:"2-digit",
          second:"2-digit"
        })
      );

    }
    catch(err){
      console.log("BTPS fetch error:",err);
    }

  };


  /* FETCH PEAK */
  const fetchPeak = async()=>{

    if(!selectedBuilding) return;

    try{

      const res =
        await fetch(
          `${API_BASE}/graph/${graphType}/${selectedBuilding.id}`
        );

      const graph =
        await res.json();

      if(!Array.isArray(graph) || !graph.length){

        setPeak({
          value:0,
          name:formatBtpsName(selectedBuilding.name),
          time:"--"
        });

        return;

      }

      let max = 0;
      let peakTime = "--";

      graph.forEach(point=>{

        const power =
          Number(point.power || 0)/1000;

        if(power > max){

          max = power;

          const date =
            new Date(point.time);

          if(!isNaN(date))
            peakTime =
              date.toLocaleTimeString("en-IN",{
                hour:"2-digit",
                minute:"2-digit"
              });

        }

      });

      setPeak({
        value:max,
        name:formatBtpsName(selectedBuilding.name),
        time:peakTime
      });

    }
    catch(err){
      console.log("Peak error:",err);
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
      (sum,b)=>sum+Number(b.today||0),0
    );

  const totalYesterday =
    buildings.reduce(
      (sum,b)=>sum+Number(b.yesterday||0),0
    );

  const totalCurrent =
    Object.values(currentMap)
    .reduce((sum,val)=>sum+val,0);


  return(

<div className="buildings-page">


{/* HEADER */}
<div className="second-header">

<div className="secondheader-left">

{/* CLIENT LOGO */}
<img src={logo} className="second-logo"/>

<div>

<div className="second-company">
BTPS RTS-0.4MW Monitoring
</div>

<div className="second-sub">
Solar Dashboard
</div>

</div>


{/* ✅ EPC SECTION ADDED */}
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
<div className="summary-label">Total Buildings</div>
<div className="summary-value">
{buildings.length}
</div>
</div>


<div className="summary-card">
<div className="summary-label">Today Production</div>
<div className="summary-value green">
{totalToday.toFixed(1)} kWh
</div>
</div>


<div className="summary-card">
<div className="summary-label">Yesterday Production</div>
<div className="summary-value blue">
{totalYesterday.toFixed(1)} kWh
</div>
</div>





<div className="summary-card current-card">

<div className="summary-label">
Total Live Power
</div>

<div className="summary-value current-text">
{totalCurrent.toFixed(1)} kW
</div>

</div>

</div>



{/* BUILDINGS */}
<div className="building-grid">

{buildings.map(b=>{

const normalized =
normalizeName(b.name);

const capacity =
capacityMap[normalized];

const isActive =
selectedBuilding?.id === b.id;


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

<div className="online">ONLINE</div>

</div>


<div className="building-name">

<span className="building-title">
{formatBtpsName(b.name)}
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
Live Power: {(currentMap[b.id] || 0).toFixed(1)} kW
</div>

</div>

</div>

);

})}

</div>



{/* GRAPH */}
{selectedBuilding &&(

<div className="graph-section">

<div className="graph-title">
Energy Trend - {formatBtpsName(selectedBuilding.name)}
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
buildingName={formatBtpsName(selectedBuilding.name)}
/>

</div>

</div>

)}

</div>

);

}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../pages/Buildings.css";
import PowerGraph from "../graph/graph";
import API_BASE from "../pages/config";

/* LOGOS */
import Nuppl from "../assets/Nuppl.jpg";
import epcLogo from "../assets/sunlogo.png";
import buildIcon from "../assets/merger.png";
import { useDispatch, useSelector } from "react-redux";
import { fetchdata } from "../store/createslice";

/* CAPACITY */
const capacityMap = {
  "NUPPLGENERALHOSPITAL": 122.04,
  "NUPPLESTATEOFFICE": 30.51,
  "NUPPLESTATESTORE": 10.17,
  "NUPPLSCHOOL": 134.47,
  "NUPPLTYPE3QUARTERS5BUILDINGS": 129.95,
  "NUPPLTYPE4QUARTERS11BUILDINGS": 298.32,
  "NUPPLTRAININGCENTRE": 80.23
};

const normalizeName = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

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



export default function NupplPage() {
  
  const navigate = useNavigate();

  const [list, setList] = useState([]);
  const [selected, setSelected] = useState(null);

  const [graphType, setGraphType] = useState("today");
  const [time, setTime] = useState("");
  const [currentMap, setCurrentMap] = useState({});

 

   /* FETCH */
   const fetchBuildings = async () => {
     try {
      const res = await fetch(`${API_BASE}/sub-buildings`);
      const data = await res.json();

      /* TYPE4 */
      const type4 = data.filter(b =>
        normalizeName(b.name).includes("TYPE4")
      );
      const type3 = data.filter(b =>
  normalizeName(b.name).includes("TYPE3")
);

      /* OTHERS */
      const others = data.filter(b =>
        normalizeName(b.name).includes("NUPPL") &&
        !normalizeName(b.name).includes("TYPE4")&&
        !normalizeName(b.name).includes("TYPE3")
      );

      /* GROUP CARD */
      const type4Group = {
        id: "TYPE4_GROUP",
        name: "Type 4 Quarters 11 Buildings",
        isGroup: true,
        type: "TYPE4",
        children: type4
      };
       
       /* ✅ NEW TYPE3 GROUP */
const type3Group = {
  id: "TYPE3_GROUP",
  name: "Type 3 Quarters 5 Buildings",
  isGroup: true,
  type: "TYPE3",
  children: type3
};
      const finalList = [type4Group, type3Group, ...others];

      setList(finalList);

      /* CURRENT MAP */
      const map = {};
      data.forEach(b => {
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

    } catch (e) {
      console.log(e);
    }
  };

  useEffect(() => {
    fetchBuildings();
    const i = setInterval(fetchBuildings, 15000);
    return () => clearInterval(i);
  }, []);

  /* TOTALS */
  const totalToday = list.reduce((sum, b) => {
    if (b.isGroup) {
      return sum + b.children.reduce((s, x) => s + Number(x.today || 0), 0);
    }
    return sum + Number(b.today || 0);
  }, 0);

  const totalYesterday = list.reduce((sum, b) => {
    if (b.isGroup) {
      return sum + b.children.reduce((s, x) => s + Number(x.yesterday || 0), 0);
    }
    return sum + Number(b.yesterday || 0);
  }, 0);

  const totalCurrent = Object.values(currentMap).reduce((a, b) => a + b, 0);

  return (

<div className="buildings-page">

{/* HEADER */}
<div className="second-header">

<div className="secondheader-left">
<img src={Nuppl} className="second-logo"/>

<div>
<div className="second-company">
NUPPL RTS-0.8MW Monitoring
</div>
<div className="second-sub">Solar Dashboard</div>
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

<button className="back-btn" onClick={() => navigate("/dashboard")}>
← Back
</button>
</div>

</div>

{/* SUMMARY */}
<div className="summary">

<div className="summary-card">
<div className="summary-label">Total Buildings</div>
<div className="summary-value">{list.length}</div>
</div>

<div className="summary-card">
<div className="summary-label">Today</div>
<div className="summary-value green">{totalToday.toFixed(1)} kWh</div>
</div>

<div className="summary-card">
<div className="summary-label">Yesterday</div>
<div className="summary-value blue">{totalYesterday.toFixed(1)} kWh</div>
</div>

<div className="summary-card current-card">
<div className="summary-label">Live Power</div>
<div className="summary-value current-text">
{totalCurrent.toFixed(1)} kW
</div>
</div>

</div>

{/* CARDS */}
<div className="building-grid">

{list.map(b => {

let today = 0, yesterday = 0, total = 0, current = 0;

if (b.isGroup) {
  today = b.children.reduce((s,x)=>s+Number(x.today||0),0);
  yesterday = b.children.reduce((s,x)=>s+Number(x.yesterday||0),0);
  total = b.children.reduce((s,x)=>s+Number(x.total||0),0);
  current = b.children.reduce((s,x)=>s+Number(x.currentPower||0),0);
} else {
  today = Number(b.today || 0);
  yesterday = Number(b.yesterday || 0);
  total = Number(b.total || 0);
  current = Number(b.currentPower || 0);
}

const isActive = selected?.id === b.id;

return (

<div
key={b.id}
onClick={() => {
  if (b.isGroup) {

    if (b.id === "TYPE4_GROUP") {
      navigate("/type4", { state: b.children });
    }

    /* ✅ TYPE3 ROUTE */
    else if (b.id === "TYPE3_GROUP") {
      navigate("/type3", { state: b.children });
    }

  } else {
    setSelected(b);
  }
}}
className={`building-card 
  ${b.isGroup ? "group-card" : ""} 
  ${isActive ? "active" : ""}`
}
>

<div className="card-header">
<img src={buildIcon} className="card-icon"/>
<div className="online">
{b.isGroup ? "GROUP" : "ONLINE"}
</div>
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

<div className="card-footer">
Last update: {time}
<div className="current-live">
Live Power: {current.toFixed(1)} kW
</div>
</div>

</div>

);

})}

</div>

{/* GRAPH */}
{selected && !selected.isGroup && (

<div className="graph-section">

<div className="graph-title">
Energy Trend - {formatBuildingName(selected.name)}
</div>

<div className="graph-buttons">

<button
className={`graph-btn ${graphType === "today" ? "active-btn" : ""}`}
onClick={() => setGraphType("today")}
>
Today
</button>

<button
className={`graph-btn ${graphType === "yesterday" ? "active-btn" : ""}`}
onClick={() => setGraphType("yesterday")}
>
Yesterday
</button>

</div>

<div className="graph-box">
<PowerGraph
stationId={selected.id}
type={graphType}
buildingName={formatBuildingName(selected.name)}
/>
</div>

</div>

)}

</div>

  );
}
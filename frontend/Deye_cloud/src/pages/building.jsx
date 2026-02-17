import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../pages/Buildings.css";
import PowerGraph from "../graph/graph";
import API_BASE from "../pages/config";

import logo from "../assets/main logo.png";
import buildIcon from "../assets/tower.png";


/* CAPACITY MAP */
const capacityMap = {
  "NLCIL LIBRARY": 50.85,
  "NLCIL Education office": 23.73,
  "NLCIL L&DC office (INV-2)": 145
};


export default function Buildings() {

  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [graphType, setGraphType] = useState("today");

  const [time, setTime] = useState("");

  const [currentMap, setCurrentMap] = useState({});

  const [peak, setPeak] = useState({
    value: 0,
    name: "--",
    time: "--"
  });


  /* FETCH BUILDINGS */
  const fetchBuildings = async () => {

    try {

      const res = await fetch(`${API_BASE}/sub-buildings`);
      const data = await res.json();

      const filtered =
        data.filter(
          b => !b.name.toUpperCase().includes("BTPS")
        );

      setBuildings(filtered);

      setSelectedBuilding(prev => {

        if (!prev && filtered.length)
          return filtered[0];

        const updated =
          filtered.find(
            b => b.id === prev?.id
          );

        return updated || filtered[0];

      });


      const map = {};

      filtered.forEach(b => {

    map[b.id] =
        Number(b.currentPower || 0);

});


      setCurrentMap(map);


      setTime(
        new Date().toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          }
        )
      );

    }
    catch (err) {

      console.log(err);

    }

  };


  /* ✅ FIXED PEAK FETCH (USES SAME GRAPH API) */
  const fetchPeak = async () => {

    if (!selectedBuilding) return;

    try {

      const res =
        await fetch(
          `${API_BASE}/graph/${graphType}/${selectedBuilding.id}`
        );

      const graph =
        await res.json();

      if (!graph.length) {

        setPeak({
          value: 0,
          name: selectedBuilding.name,
          time: "--"
        });

        return;
      }


      let max = 0;
      let peakTime = "--";


      graph.forEach(point => {

        const power =
          Number(point.power) / 1000;

        if (power > max) {

          max = power;

          peakTime =
            new Date(point.time)
              .toLocaleTimeString(
                "en-IN",
                {
                  hour: "2-digit",
                  minute: "2-digit"
                }
              );

        }

      });


      setPeak({

        value: max,
        name: selectedBuilding.name,
        time: peakTime

      });

    }
    catch (err) {

      console.log("Peak fetch error:", err);

    }

  };


  /* AUTO REFRESH BUILDINGS */
  useEffect(() => {

    fetchBuildings();

    const interval =
      setInterval(
        fetchBuildings,
        15000
      );

    return () =>
      clearInterval(interval);

  }, []);


  /* FETCH PEAK WHEN BUILDING OR TYPE CHANGE */
  useEffect(() => {

    if (selectedBuilding)
      fetchPeak();

  }, [selectedBuilding, graphType]);


  /* TOTALS */

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
onClick={() => navigate("/dashboard")}
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


{/* PEAK CARD */}

<div className="summary-card peak-card">

<div className="summary-label">
Peak Power
</div>

<div className="summary-value peak-text">
{peak.value.toFixed(1)} kW
</div>

<div className="peak-time">
{peak.name}
</div>

<div className="peak-time">
Peak Time: {peak.time}
</div>

</div>


<div className="summary-card current-card">

<div className="summary-label">
Total Current
</div>

<div className="summary-value current-text">
{totalCurrent.toFixed(1)} kW
</div>

</div>

</div>



{/* BUILDING GRID */}

<div className="building-grid">

{buildings.map(b => {

const capacity =
capacityMap[b.name];

const isActive =
selectedBuilding?.id === b.id;

const isPeak =
peak.name === b.name;


return (

<div
key={b.id}
onClick={()=>setSelectedBuilding(b)}
className={`building-card ${isActive?"active":""}`}
>

<div className="card-header">

<img src={buildIcon} className="card-icon"/>

<div className="online">ONLINE</div>

</div>


<div className="building-name">

<span className="building-title">
{b.name}
</span>

{capacity &&
<span className="capacity-inline">
{capacity} kW
</span>
}

</div>



<div className="energy-row">

<div>
<div className="energy-label">TODAY</div>
<div className="energy-value green">
{Number(b.today).toFixed(1)} kWh
</div>
</div>

<div>
<div className="energy-label">YESTERDAY</div>
<div className="energy-value blue">
{Number(b.yesterday).toFixed(1)} kWh
</div>
</div>

</div>


<div className="card-footer">

Last update: {time}

<div className="current-live">
Current: {currentMap[b.id]?.toFixed(1)} kW
</div>

</div>

</div>


);

})}

</div>



{/* GRAPH */}

{selectedBuilding && (

<div className="graph-section">

<div className="graph-title">
Energy Trend - {selectedBuilding.name}
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


<button
className={`graph-btn ${graphType === "monthly" ? "active-btn" : ""}`}
onClick={() => setGraphType("monthly")}
>
Monthly
</button>

</div>


<div className="graph-box">

<PowerGraph

stationId={selectedBuilding.id}

type={graphType}

buildingName={selectedBuilding.name}

/>

</div>

</div>

)}


</div>

);

}

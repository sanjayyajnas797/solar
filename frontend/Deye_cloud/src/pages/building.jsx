import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Buildings.css";
import PowerGraph from "../graph/graph";
import API_BASE from "./config";

import logo from "../assets/sunlogo.png";
import buildIcon from "../assets/tower.png";

/* ✅ CAPACITY MAP (CLIENT DATA) */
const capacityMap = {

  "NLCIL LIBRARY": 50.85,

  "NLCIL Education office": 23.73,

  "NLCIL L&DC office (INV-2)": 145.00

};

export default function Buildings() {

  const [buildings, setBuildings] = useState([]);
  const [time, setTime] = useState("");

  const [selectedBuilding, setSelectedBuilding] = useState(null);

  /* ✅ GRAPH TYPE STATE */
  const [graphType, setGraphType] = useState("today");

  const [currentMap, setCurrentMap] = useState({});

  const [peakPower, setPeakPower] = useState(0);

  const [performance, setPerformance] = useState({
    totalCurrent: 0,
    avgPower: 0,
    bestBuilding: "-"
  });

  const [userSelected, setUserSelected] = useState(false);

  const navigate = useNavigate();


  /* FETCH BUILDINGS */
  const fetchBuildings = async () => {

    try {

      const res =
        await fetch(`${API_BASE}/sub-buildings`);

      const data = await res.json();

      setBuildings(data);

      setTime(new Date().toLocaleTimeString());

      setSelectedBuilding(prev => {

        if (!userSelected && !prev && data.length)
          return data[0];

        if (userSelected && prev) {

          const updated =
            data.find(b => b.id === prev.id);

          return updated || prev;

        }

        return prev;

      });

      const map = {};

      data.forEach(b => {

        map[b.id] =
          Number(b.currentPower || 0);

      });

      setCurrentMap(map);

      calculatePerformance(map, data);

    }
    catch (err) {

      console.log(err);

    }

  };


  /* PERFORMANCE */
  const calculatePerformance = (map, buildingData) => {

    const values = Object.values(map);

    if (!values.length) return;

    const total =
      values.reduce((a, b) => a + b, 0);

    const avg =
      total / values.length;

    let best = "-";
    let max = 0;

    buildingData.forEach(b => {

      if (map[b.id] > max) {

        max = map[b.id];
        best = b.name;

      }

    });

    setPerformance({

      totalCurrent: total.toFixed(1),

      avgPower: avg.toFixed(1),

      bestBuilding: best

    });

  };


  /* PEAK POWER */
  const fetchPeakPower = async () => {

    if (!selectedBuilding) return;

    try {

      const res =
        await fetch(
          `${API_BASE}/graph/today/${selectedBuilding.id}`
        );

      const graph =
        await res.json();

      if (!graph.length) return;

      let max = 0;

      graph.forEach(g => {

        const power =
          Number(g.power) / 1000;

        if (power > max)
          max = power;

      });

      setPeakPower(max.toFixed(1));

    }
    catch {}

  };


  useEffect(() => {

    fetchBuildings();

    const interval =
      setInterval(fetchBuildings, 30000);

    return () => clearInterval(interval);

  }, []);


  useEffect(() => {

    fetchPeakPower();

  }, [selectedBuilding]);


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


  return (

    <div className="buildings-page">


      {/* HEADER */}

      <div className="second-header">

        <div className="secondheader-left">

          <img
            src={logo}
            className="second-logo"
          />

          <div>

            <div className="second-company">
              Sun Industrial Automations & Solutions Private Limited
            </div>

            <div className="second-sub">
              Enterprise Solar Monitoring Platform
            </div>

          </div>

        </div>


        <div className="secondheader-right">

          <div className="secondlive-box">
            LIVE SYSTEM
          </div>

          <div className="second-updated">
            Updated: {time}
          </div>

          <button
            className="back-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            ← Back to Dashboard
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
            Total Today Production
          </div>

          <div className="summary-value green">
            {totalToday.toFixed(1)} kWh
          </div>

        </div>


        <div className="summary-card">

          <div className="summary-label">
            Total Yesterday Production
          </div>

          <div className="summary-value blue">
            {totalYesterday.toFixed(1)} kWh
          </div>

        </div>


        <div className="summary-card peak-card">

          <div className="summary-label">
            Max Unit Power
          </div>

          <div className="summary-value peak-value">
            {peakPower} kW
          </div>

        </div>


        <div className="summary-card performance-card">

          <div className="summary-label">
            Live System Performance
          </div>

          <div className="perf-main">

            Current:
            <span className="green">
              {performance.totalCurrent} kW
            </span>

            Average:
            <span className="blue">
              {performance.avgPower} kW
            </span>

          </div>

        </div>

      </div>



      {/* BUILDING GRID */}

      <div className="building-grid">

        {buildings.map((b, index) => {

          const capacity =
            capacityMap[b.name];

          return (

            <div

              key={b.id}

              onClick={() => {

                setSelectedBuilding(b);

                setUserSelected(true);

              }}

              className={`building-card color-${index % 5}
              ${selectedBuilding?.id === b.id ? "active" : ""}`}

            >

              <div className="card-header">

                <img
                  src={buildIcon}
                  className="card-icon"
                />

                <div className="online">
                  ONLINE
                </div>

              </div>


              <div className="building-name">
                {b.name}
              </div>


              {/* CAPACITY BADGE */}

              {capacity && (

                <div className="capacity-badge">

                  CAPACITY

                  <span>
                    {capacity} kW
                  </span>

                </div>

              )}


              <div className="energy-row">

                <div>

                  <div className="energy-label">
                    TODAY
                  </div>

                  <div className="energy-value green">
                    {Number(b.today).toFixed(1)} kWh
                  </div>

                </div>


                <div>

                  <div className="energy-label">
                    YESTERDAY
                  </div>

                  <div className="energy-value blue">
                    {Number(b.yesterday).toFixed(1)} kWh
                  </div>

                </div>

              </div>


              <div className="card-footer">

                Last update: {time}

                <div className="current-live">

                  Current:

                  {currentMap[b.id]
                    ? ` ${Number(currentMap[b.id]).toFixed(1)} kW`
                    : " --"}

                </div>

              </div>

            </div>

          );

        })}

      </div>



      {/* GRAPH */}

      <div className="graph-section">

        <div className="graph-title">

          Energy Trend

          {selectedBuilding &&
            ` - ${selectedBuilding.name}`}

        </div>


        <div className="graph-box">


          {/* ✅ TODAY / YESTERDAY BUTTONS */}

          <div className="graph-buttons">

            <button
              className={`graph-btn ${graphType === "today" ? "active-btn" : ""}`}
              onClick={() =>
                setGraphType("today")
              }
            >
              Today
            </button>

            <button
              className={`graph-btn ${graphType === "yesterday" ? "active-btn" : ""}`}
              onClick={() =>
                setGraphType("yesterday")
              }
            >
              Yesterday
            </button>

            <button
              className={`graph-btn ${graphType === "monthly" ? "active-btn" : ""}`}
              onClick={() =>
                setGraphType("monthly")
              }
            >
              Monthly
            </button>

          </div>



          {/* GRAPH */}

          {selectedBuilding && (

            <PowerGraph

              stationId={selectedBuilding.id}

              type={graphType}

              buildingName={selectedBuilding.name}

            />

          )}

        </div>

      </div>

    </div>

  );

}

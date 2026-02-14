import React from "react";
import "./Dashboard.css";

import solar from "./assets/solar-panel.png";
import inverter from "./assets/inverter.png";
import load from "./assets/skyscraper.png";
import grid from "./assets/tower.png";
import meter from "./assets/gauge.png";
import battery from "./assets/battery.png";

export default function Dashboard() {

  return (
    <div className="dashboard">

      {/* HEADER */}
      <div className="header">

        <div className="box">
          <div className="title">Energy</div>
          <div>Today: 5.36 kWh</div>
          <div>Month: 232.02 kWh</div>
        </div>

        <div className="box">
          <div className="title">Solar Yield</div>
          <div className="green">531.67 kWh</div>
        </div>

        <div className="box">
          <div className="title">Solar Status</div>
          <div className="red blink">Plant Offline</div>
        </div>

        <div className="box">
          <div className="title">Grid</div>
          <div>-520 W</div>
        </div>

        <div className="box">
          <div className="title">Load</div>
          <div>4.38 kW</div>
        </div>

        <div className="box">
          <div className="title">Savings</div>
          <div>₹ 1,536</div>
        </div>

      </div>


      {/* MIDDLE */}
      <div className="middle">

    {/* FLOW DIAGRAM */}
<div className="flow">

  <div className="flow-item solar-item">
    <img src={solar}/>
    <div>Solar</div>
  </div>

  <div className="flow-item inverter-item">
    <img src={inverter}/>
    <div>Inverter</div>
  </div>

  <div className="flow-item meter1-item">
    <img src={meter}/>
    <div>Meter</div>
  </div>

  <div className="flow-item home-item">
    <img src={load}/>
    <div>Building</div>
  </div>

  <div className="flow-item meter3-item">
    <img src={meter}/>
    <div>Meter</div>
  </div>

  <div className="flow-item grid-item">
    <img src={grid}/>
    <div>Grid</div>
  </div>


  {/* LINES */}

  <div className="line solar-inverter"></div>

  <div className="line inverter-meter1"></div>

  <div className="line meter-home"></div>

  <div className="line home-meter3"></div>

  <div className="line meter3-grid"></div>

</div>



        {/* RIGHT GRAPH PANEL */}
        <div className="monthly">

          <div className="monthly-top">

            <div className="info-box">
              <div className="info-title">Max Unit Power</div>
              <div className="info-value green">4.38 kW</div>
              <div className="info-sub">Today</div>
            </div>

            <div className="info-box">
              <div className="info-title">CO₂ Saved</div>
              <div className="info-value green">520 kg</div>
              <div className="info-sub">Total</div>
            </div>

            <div className="info-box">
              <div className="info-title">Performance</div>
              <div className="info-value">98.6%</div>
              <div className="info-sub">Efficiency</div>
            </div>

          </div>


          <div className="graph-title">Monthly Energy</div>

          <div className="bars">

            <div className="bar">
              <span>320</span>
              <div className="h1"></div>
              <span>Jan</span>
            </div>

            <div className="bar">
              <span>480</span>
              <div className="h2"></div>
              <span>Feb</span>
            </div>

            <div className="bar">
              <span>290</span>
              <div className="h3"></div>
              <span>Mar</span>
            </div>

            <div className="bar">
              <span>410</span>
              <div className="h4"></div>
              <span>Apr</span>
            </div>

            <div className="bar">
              <span>250</span>
              <div className="h5"></div>
              <span>May</span>
            </div>

          </div>

        </div>

      </div>


      {/* POWER GRAPH */}
      <div className="bottom">

        <div className="graph-title">Power Graph</div>

        <div className="power-graph">

          {/* GRID LINES */}
          <div className="grid-lines">
            <span></span>
            <span></span>
            <span></span>
            <span></span>
            <span></span>
          </div>

          {/* SVG GRAPH */}
          <svg className="power-svg" viewBox="0 0 800 200">

            <defs>
              <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#66bb6a" stopOpacity="0.8"/>
                <stop offset="100%" stopColor="#66bb6a" stopOpacity="0.1"/>
              </linearGradient>
            </defs>

            {/* AREA */}
            <path
              d="
              M0,180
              L50,160
              L100,170
              L150,120
              L200,140
              L250,60
              L300,130
              L350,40
              L400,150
              L450,80
              L500,160
              L550,90
              L600,170
              L650,110
              L700,150
              L750,120
              L800,160
              L800,200
              L0,200
              Z"
              fill="url(#powerGradient)"
            />

            {/* LINE */}
            <path
              d="
              M0,180
              L50,160
              L100,170
              L150,120
              L200,140
              L250,60
              L300,130
              L350,40
              L400,150
              L450,80
              L500,160
              L550,90
              L600,170
              L650,110
              L700,150
              L750,120
              L800,160"
              stroke="#2e7d32"
              strokeWidth="3"
              fill="none"
            />

          </svg>

        </div>

      </div>

    </div>
  );
}

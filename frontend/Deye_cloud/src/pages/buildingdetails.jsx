import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import PowerGraph from "../graph/graph";
import "../pages/buildingdetails.css";
import API_BASE from "../pages/config";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  ComposedChart,
  ReferenceLine
} from "recharts";

import solarpanel from "../assets/sol.webp";
import inverter from "../assets/inverter.png";
import grid from "../assets/sanj.png";
import epc from '../assets/sunlogo.png'
import btps from '../assets/nlc.png'

export default function BuildingDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [graphType, setGraphType] = useState("today");
  const [selectedDate, setSelectedDate] = useState("");

  const [weatherData, setWeatherData] = useState({
  irradiance: 0,
  temperature: 0
});
const [weatherGraph, setWeatherGraph] = useState([]);

const [tooltip, setTooltip] = useState({
  visible: false,
  x: 0,
  y: 0,
  value: "",
});

  const buildingName = location.state?.name || "Building";

  const weatherCampus = buildingName
  .toUpperCase()
  .includes("BTPS")
  ? "BTPS"
  : buildingName
      .toUpperCase()
      .includes("NTPL")
  ? "NTPL"
  : buildingName
      .toUpperCase()
      .includes("NUPPL")
  ? "NUPPL"
  : buildingName
      .toUpperCase()
      .includes("NLCIC")
  ? "NLCIC"
  : "NLCIL";


 const today = Number(location.state?.today || 0);
const yesterday = Number(location.state?.yesterday || 0);
  const cumulative = location.state?.cumulative || "--";
  const livePower = location.state?.currentPower || "--";

const MAX_BAR_HEIGHT = 220;

// 🔥 FIXED SCALE (IMPORTANT)
const SCALE_MAX = Math.max(today, yesterday) * 1.2;
// 👈 little headroom (20%)

const safeMax = SCALE_MAX === 0 ? 1 : SCALE_MAX;

// calculate heights
const finalYesterdayHeight =
  (yesterday / safeMax) * MAX_BAR_HEIGHT;

const finalTodayHeight =
  (today / safeMax) * MAX_BAR_HEIGHT;
  useEffect(() => {
    const fetchWeather = async () => {
      try {
       const res = await fetch(
  `${API_BASE}/weather/${weatherCampus}`
);
        const data = await res.json();

        const irradiance = Number(data.irradiance ?? 0);
        const temperature = Number(
          data.temperature ?? data.ambientTemp ?? 0
        );

        setWeatherData({
          irradiance,
          temperature
        });

        setWeatherGraph((prev) => {
  const updated = [
    ...prev,
    {
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      }),

      // graph visible ah fluctuation kaaga
      irradiance:
        irradiance +
        Math.random() * 1.5 -
        0.7,

      temperature:
        temperature +
        Math.random() * 0.8 -
        0.4
    }
  ];

  return updated.slice(-25);
});

      } catch (err) {
        console.log("Weather fetch error:", err);
      }
    };

    fetchWeather();

    const interval = setInterval(fetchWeather, 5000);

    return () => clearInterval(interval);
  }, [buildingName]);


const TEMP_MIN = 0;
const TEMP_MAX = 100;

// 🔥 RAW MQTT VALUE
const rawIrr =
  Number(weatherData.irradiance || 0);

// 🔥 AUTO DETECT
const isScaledSite =
  rawIrr <= 15;

// 🔥 FINAL DISPLAY VALUE
const displayIrradiance =
  isScaledSite
    ? rawIrr * 125
    : rawIrr;

// 🔥 SCALE
const IRR_MIN = 0;

const IRR_MAX =
  isScaledSite
    ? 1000
    : 1200;

// 🔥 SCALE CALCULATION
const tempPercent =
  (weatherData.temperature - TEMP_MIN) /
  (TEMP_MAX - TEMP_MIN);

const TRACK_HEIGHT = 250;

const tempHeight =
  Math.max(0, Math.min(TRACK_HEIGHT, tempPercent * TRACK_HEIGHT));

const irrPercent =
  (displayIrradiance - IRR_MIN) /
  (IRR_MAX - IRR_MIN);

const IRR_TRACK = 250;

const irrHeight =
  Math.max(0, Math.min(IRR_TRACK, irrPercent * IRR_TRACK));
    // 🔥 TEMP COLOR LOGIC
const getTempColor = (temp) => {
  if (temp < 25) return "#4da3ff";     // cold
  if (temp < 35) return "#ffe933";     // normal
  return "#ff5f5f";                    // hot
};

const tempColor = getTempColor(weatherData.temperature);

const max = Math.max(today, yesterday) || 1;
const [animatedPercent, setAnimatedPercent] = useState(0);

useEffect(() => {
  const target = (today / max) * 100;

  let start = animatedPercent;

  const interval = setInterval(() => {
    start += (target - start) * 0.1; // smooth easing

    if (Math.abs(target - start) < 0.3) {
      start = target;
      clearInterval(interval);
    }

    setAnimatedPercent(start);
  }, 30);

  return () => clearInterval(interval);
}, [today]);


  const avgHeight = (irrHeight + tempHeight) / 2;

  const getEnergyColor = (irr, temp) => {
  if (irr > 10 && temp < 35) return "#ffe933";   // perfect sun
  if (temp >= 35) return "#ff5f5f";              // hot
  if (irr < 5) return "#4da3ff";                 // low sunlight
  return "#ffb347";                              // balanced
};

const energyColor = getEnergyColor(
  weatherData.irradiance,
  weatherData.temperature
);




  const capacityMap = {
  "NLCILLIBRARY50KWONGRID": 50.85,
  "NLCILEDUCATIONOFFICE": 23.73,
  "NLCILLDCOFFICEINV225KW": 145,
  "NLCILTPS2EXPSWITCHYARD40KW": 35.03,
  "NLCILPSTCBUILDING": 122.04,
  "NLCILTPS1EXPCANTEEN": 33.90,
  "NLCILLDCOFFICEINV1": 145,
  "NLCILTPS2EXPSCREENHOUSEA": 97.18,
  "NLCILTPS2EXPSCREENHOUSEB": 73.45,
  "NLCILTPS2EXPASHHANDLING": 40
};
  const normalize = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

const capacity =
  Number(location.state?.capacity || 0);


const normalizedIrradiance =
  displayIrradiance;

const expected =
  capacity *
  (normalizedIrradiance / 1000);



const actualPower =
  Number(location.state?.currentPower || livePower || 0);

  // 🔥 PERFORMANCE COLOR
const getPerfColor = (val) => {

  if (val >= 80) return "#00ffc3";

  if (val >= 50) return "#ffe933";

  return "#ff5f5f";

};



const performance =
  expected > 0

  
    ? Math.min(
        ((actualPower / expected) * 100),
        100
      ).toFixed(1)
    : 0;

    const perfColor =
  getPerfColor(Number(performance));

const [animatedPerf, setAnimatedPerf] = useState(0);

useEffect(() => {
  let start = 0;
  const target = performance;

  const interval = setInterval(() => {
    start += (target - start) * 0.1;

    if (Math.abs(target - start) < 0.2) {
      start = target;
      clearInterval(interval);
    }

    setAnimatedPerf(start.toFixed(1));
  }, 30);

  return () => clearInterval(interval);
}, [performance]);

  return (
    <div className="building-details-page">

      {/* HEADER */}
      <div className="bd-header">

  {/* LEFT SECTION */}
  <div className="bd-header-left-side">

    {/* LOGO */}
    <div className="bd-company-logo">
      <img
  src={btps}
  alt="btps"
/>
    </div>

    {/* TITLE */}
    <div className="bd-title-box">
     <h2 className="bd-main-title">
  {buildingName}
</h2>

      <p className="bd-sub-title">
        Solar Dashboard
      </p>
    </div>

    {/* DIVIDER */}
    <div className="bd-header-divider"></div>

    {/* EPC */}
    <div className="bd-epc-box">

      <div className="bd-epc-logo">
       <img
  src={epc}
  alt="epc"
/>
      </div>

      <div>
        <p className="epc-label">
          EPC BY
        </p>

        <h3 className="epc-company">
          SUN Industrial Automations & Solutions Pvt Ltd
        </h3>
      </div>

    </div>

  </div>

  {/* RIGHT SECTION */}
  <div className="bd-header-right">

    <div className="live-system-pill">
      <span className="live-dot"></span>
      LIVE SYSTEM
    </div>

    <div className="updated-pill">
      ⏱ Updated: {new Date().toLocaleTimeString()}
    </div>

    <button
      className="bd-back-btn"
      onClick={() => navigate(-1)}
    >
      ← Back
    </button>

  </div>

</div>

      {/* TOP SECTION */}
      <div className="bd-top-section">

        {/* LEFT */}
        <div className="bd-left">
          <p className="bd-box-title">Flow Graph</p>

          <div className="bd-flow-box">

           <div className="bd-flow-item solar-node">
              <img src={solarpanel} alt="solar" />
            </div>

            <div className="bd-flow-line">
              <span className="bd-dot"></span>
              <span className="bd-dot delay1"></span>
              <span className="bd-dot delay2"></span>
            </div>

          <div className="bd-flow-item bd-inverter">
  <img src={inverter} alt="inverter" />

  {/* 🔥 VALUE BELOW IMAGE */}
  <div className="bd-inverter-value">
    {livePower}
  </div>
</div>

            <div className="bd-flow-line">
              <span className="bd-dot"></span>
              <span className="bd-dot delay1"></span>
              <span className="bd-dot delay2"></span>
            </div>

          <div className="bd-flow-item grid-node">
              <img src={grid} alt="grid" />
            </div>

          </div>
        </div>

       
     {/* MIDDLE - FULL CARD */}
<div className="bd-middle">

  <div className="bd-production-card">

    <p className="bd-production-title">
      Daily Production
    </p>
     
    <div className="bd-production-bars">

     
     
      {/* Yesterday */}
<div className="bd-bar-block">

  <div className="bd-bar-wrapper">

    {/* VALUE */}
    <div className="bar-label yesterday-value">
      {yesterday}
    </div>

    <div
      className="bd-bar yesterday-glass"
      style={{ height: `${finalYesterdayHeight}px` }}

      onMouseMove={(e) => {
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          value: `yesterday: ${yesterday}`,
        });

        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateX = ((y / rect.height) - 0.5) * 20;
        const rotateY = ((x / rect.width) - 0.5) * -20;

        e.currentTarget.style.transform =
          `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
      }}

      onMouseLeave={(e) => {
        setTooltip({ ...tooltip, visible: false });

        e.currentTarget.style.transform =
          "rotateX(8deg) rotateY(0deg) scale(1)";
      }}
    >
      {/* GLASS */}
      <div className="glass-body yesterday-glass-body">

        <div
          className="liquid-fill yesterday-liquid"
          style={{
            height: "100%" // 🔥 full fill like reference image
          }}
        >
          <div className="liquid-wave yesterday-wave"></div>
          <div className="liquid-particles yesterday-particles"></div>
        </div>

        <div className="glass-shine"></div>

      </div>
    </div>

  </div>

  <span className="bar-name yesterday-text">
    Yesterday
  </span>

</div>

     {/* Today */}
<div className="bd-bar-block">

  <div className="bd-bar-wrapper">

    {/* ✅ VALUE INSIDE (IMPORTANT FIX) */}
    <div className="bar-label today-value">
      {today}
    </div>

    <div
      className="bd-bar today-glass"
      style={{ height: `${finalTodayHeight}px` }}

      onMouseMove={(e) => {
        // 🔥 tooltip
        setTooltip({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          value: `today: ${today}`,
        });

        // 🔥 tilt effect
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const rotateX = ((y / rect.height) - 0.5) * 20;
        const rotateY = ((x / rect.width) - 0.5) * -20;

        e.currentTarget.style.transform =
          `rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
      }}

      onMouseLeave={(e) => {
        setTooltip({ ...tooltip, visible: false });

        e.currentTarget.style.transform =
          "rotateX(8deg) rotateY(0deg) scale(1)";
      }}
    >
      {/* GLASS */}
      <div className="glass-body">

        <div
          className="liquid-fill"
          style={{ height: `${animatedPercent}%` }}
        >
          <div className="liquid-wave"></div>
          <div className="liquid-particles"></div>
          <div className="energy-lines"></div>
        </div>

        <div className="glass-shine"></div>

      </div>
    </div>

  </div>

  <span className="bar-name today-text">
    Today
  </span>

</div>

  


    </div>

  </div>

</div>
          
  
 


        {/* RIGHT */}
      


  
{/* RIGHT SIDE */}
<div className="bd-right-big">

  <div className="bd-right-header">
    <p className="bd-right-title">Solar & Utilization</p>
  </div>

  {/* WEATHER BOX */}
  <div className="bd-weather-graph-box">

    {/* SUN */}
    <div className="solar-energy-line"></div>

    <div
      className="bd-center-sun"
      style={{
        top: `${250 - avgHeight}px`,
        left: "50%",
        transform: "translateX(-50%)"
      }}
    >
      <div
        className="bd-center-sun-cores"
        style={{
          background: `radial-gradient(circle, ${energyColor}, #ff9800)`,
          boxShadow: `0 0 40px ${energyColor}, 0 0 80px ${energyColor}`
        }}
      ></div>

      <span className="center-ray ray1"></span>
      <span className="center-ray ray2"></span>
      <span className="center-ray ray3"></span>
      <span className="center-ray ray4"></span>
      <span className="center-ray ray5"></span>
      <span className="center-ray ray6"></span>
      <span className="center-ray ray7"></span>
      <span className="center-ray ray8"></span>
    </div>

    {/* METERS */}
    <div className="bd-dual-meter-container">

      {/* IRRADIANCE */}
      <div className="bd-meter-block">
        <p className="bd-meter-label yellow-text">Irradiance</p>

        <div className="bd-meter-track">
          <div className="irr-scale">
            
           <span>1200</span>
<span>1000</span>
<span>800</span>
<span>600</span>
<span>400</span>
<span>200</span>
<span>0</span>
          </div>

          <div
            className="irr-top-box"
            style={{ bottom: `${irrHeight + 10}px` }}
          >
           {displayIrradiance.toFixed(0)}
          </div>

          <div
            className="bd-meter-fill irradiance-fill elite-glow"
            style={{
              height: `${irrHeight}px`,
              boxShadow: `0 0 ${irrHeight / 5}px rgba(249,255,77,0.8)`
            }}
          ></div>
        </div>
      </div>

      {/* TEMP */}
      <div className="bd-meter-block">
        <p className="bd-meter-label red-text">Temp</p>

        <div className="bd-meter-track">
          <div className="bd-scale-numbers">
            <span>100</span><span>75</span>
            <span>50</span><span>25</span><span>0</span>
          </div>

          <div
            className="bd-meter-fill temp-fill elite-heat"
            style={{
              height: `${tempHeight}px`,
              background: `linear-gradient(to top, rgba(255,95,95,0.2), ${tempColor})`,
              boxShadow: `0 0 25px ${tempColor}`
            }}
          >
            <div
              className="temp-top-box"
              style={{ bottom: `${tempHeight + 10}px` }}
            >
              {weatherData.temperature}°C
            </div>
          </div>
        </div>
      </div>

    </div>

   

  </div>

</div>
  







          

  


      </div>






     {/* GRAPH */}
<div className="bd-graph-section">

  {/* 🔥 TITLE */}
  <div className="bd-graph-header">
    <h3 className="bd-graph-title">Energy Trend</h3>
  </div>

  {/* 🔥 PREMIUM TABS */}
  <div className="bd-graph-buttons premium-tabs">

    <button
      className={`tab-btn ${graphType === "today" ? "active" : ""}`}
      onClick={() => {
        setGraphType("today");
        setSelectedDate("");
      }}
    >
      Today
    </button>

    <button
      className={`tab-btn ${graphType === "yesterday" ? "active" : ""}`}
      onClick={() => {
        setGraphType("yesterday");
        setSelectedDate("");
      }}
    >
      Yesterday
    </button>

    <input
      type="date"
      value={selectedDate}
      onChange={(e) => {
        setSelectedDate(e.target.value);
        setGraphType("custom");
      }}
      className="premium-date"
    />

  </div>

  {/* 🔥 GRAPH CARD */}
  <div className="bd-graph-box premium-graph-card">
    <PowerGraph
      stationId={id}
      type={graphType}
      selectedDate={selectedDate}
      buildingName={buildingName}
    />
  </div>

</div>

{/* 🔥 CURSOR TOOLTIP */}
{tooltip.visible && (
  <div
    className="cursor-tooltip"
    style={{
      left: tooltip.x + 10,
      top: tooltip.y - 30,
    }}
  >
    {tooltip.value}
  </div>
)}
    </div>
  );
}

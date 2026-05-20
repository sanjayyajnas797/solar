import { useEffect, useState } from "react";
import API_BASE from "../pages/config";

import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ReferenceDot
} from "recharts";

/* ========================= */
/* CAPACITY MAP */
/* ========================= */

const capacityMap = {
  "NLCILLIBRARY50KWONGRID": 50.85,
  "NLCILEDUCATIONOFFICE": 23.73,
  "NLCILLDCOFFICEINV225KW": 145,
  "NLCILPSTCBUILDING125KW":122.04,
  "NLCILTPS1EXPNCANTEEN": 33.90,
  "TPS2EXPESWITCHYARD": 35.03,
  "NLCILTPS2EXPSCREENHOUSEA":97.18,
  "NLCILTPS2EXPASHHANDLING": 40,
  "NTPLAOBUILDING":123,
  "NTPLSERVICEBUILDING":110.74
};

const normalizeName = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");

export default function PowerGraph({ stationId, type, selectedDate, buildingName }) {

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const normalized = normalizeName(buildingName);
  const clean = normalized.replace(/KW$/, "");

  let capacity =
    capacityMap[normalized] ||
    capacityMap[clean];

  const match = buildingName.match(/(\d+)\s*kw/i);
  if (!capacity) {
    capacity = match ? Number(match[1]) : 0;
  }

  const formatTime = (utcTime) => {
    if (!utcTime) return "";
    const date = new Date(utcTime);
    if (isNaN(date)) return "";

    return date.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    });
  };

  /* ========================= */
  /* LOADING PROGRESS */
  /* ========================= */

  useEffect(() => {

    if (!loading) return;

    let value = 0;

    const interval = setInterval(() => {

      value += Math.floor(Math.random() * 10) + 5;

      if (value >= 95) value = 95;

      setProgress(value);

    }, 120);

    return () => clearInterval(interval);

  }, [loading]);

  /* ========================= */
  /* FETCH DATA */
  /* ========================= */

 useEffect(() => {
  if (!stationId) return;

  setLoading(true);
  setProgress(0);

  let url = "";

  if (type === "custom") {
    url = `${API_BASE}/graph/${stationId}?date=${selectedDate}`;
  } else {
    url = `${API_BASE}/graph/${type}/${stationId}`;
  }

  fetch(url)
    .then(res => res.json())
    .then(graph => {
      const formatted = graph.map(item => ({
        time: formatTime(item.time),
        power: Number((item.power / 1000).toFixed(2))
      }));

      setData(formatted);
      setProgress(100);
      setTimeout(() => setLoading(false), 400);
    })
    .catch(() => {
      setData([]);
      setLoading(false);
    });

}, [stationId, type, selectedDate]); // ✅ ADD THIS

  /* ========================= */
  /* LOADING UI (🔥 WHEEL + BAR) */
  /* ========================= */

       
   if (loading) {
  return (
    <div style={{
      height: "350px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#000"
    }}>

      <div className="loader-container">

        {/* 🔴 OUTER ARC */}
        <svg className="arc arc1" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="grad1">
              <stop offset="0%" stopColor="#ff3b3b"/>
              <stop offset="100%" stopColor="#ff6a00"/>
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r="48"
            stroke="url(#grad1)"
            strokeWidth="5"
            fill="none"
            strokeDasharray="301"
            strokeDashoffset={301 - (progress / 100) * 301}
            strokeLinecap="round"
          />
        </svg>

        {/* 🟣 INNER ARC */}
        <svg className="arc arc2" viewBox="0 0 120 120">
          <defs>
            <linearGradient id="grad2">
              <stop offset="0%" stopColor="#7b61ff"/>
              <stop offset="100%" stopColor="#00eaff"/>
            </linearGradient>
          </defs>

          <circle
            cx="60"
            cy="60"
            r="38"
            stroke="url(#grad2)"
            strokeWidth="4"
            fill="none"
            strokeDasharray="238"
            strokeDashoffset={238 - (progress / 100) * 238}
            strokeLinecap="round"
          />
        </svg>

        {/* 🔢 PERCENT */}
        <div className="percent">
          {progress}%
        </div>

      </div>

      <style>{`
        .loader-container {
          position: relative;
          width: 140px;
          height: 140px;
        }

        .arc {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          transform: rotate(-90deg);
        }

        .arc1 {
          animation: spin1 2s linear infinite;
          filter: drop-shadow(0 0 10px #ff3b3b);
        }

        .arc2 {
          animation: spin2 1.5s linear infinite;
          filter: drop-shadow(0 0 10px #7b61ff);
        }

        @keyframes spin1 {
          0% { transform: rotate(-90deg); }
          100% { transform: rotate(270deg); }
        }

        @keyframes spin2 {
          0% { transform: rotate(270deg); }
          100% { transform: rotate(-90deg); }
        }

        .percent {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 24px;
          font-weight: bold;
          color: #ffffff;
          text-shadow: 0 0 10px #00eaff;
        }
      `}</style>

    </div>
  );
}
  /* ========================= */
  /* CALCULATIONS */
  /* ========================= */

  const current = data.length ? data[data.length - 1].power : 0;
  const peak = data.length ? Math.max(...data.map(d => d.power)) : 0;
  const avg = data.length
    ? data.reduce((s, d) => s + d.power, 0) / data.length
    : 0;

  const yMax = capacity
    ? Math.ceil(capacity * 1.2)
    : Math.ceil((peak || 1) * 1.2);

  const peakPoint = data.find(d => d.power === peak);

  /* ========================= */
  /* GRAPH UI */
  /* ========================= */

  return (
    <div style={{
      width: "100%",
      height: "100%",
      background: "linear-gradient(180deg,#061a2b,#04121d)",
      borderRadius: "16px",
      padding: "20px",
      boxShadow: "0 0 40px rgba(0,255,255,0.08)"
    }}>

      <h3 style={{ color: "#00eaff" }}>
        ⚡ Power Trend
      </h3>

      <div style={{
        display: "flex",
        gap: "20px",
        marginBottom: "10px",
        fontSize: "14px"
      }}>
        <span style={{ color: "#00ffaa" }}>
          Current: {current.toFixed(1)} kW
        </span>

        <span style={{ color: "#4da3ff" }}>
          Peak: {peak.toFixed(1)} kW
        </span>

        <span style={{ color: "#ff9f43" }}>
          Avg: {avg.toFixed(1)} kW
        </span>

        {capacity > 0 && (
          <span style={{ color: "#ffd32a" }}>
            Capacity: {capacity} kW
          </span>
        )}
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={data}>

          <defs>
            <linearGradient id="areaGlow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00eaff" stopOpacity={0.4}/>
              <stop offset="100%" stopColor="#000" stopOpacity={0}/>
            </linearGradient>

            <linearGradient id="lineColor" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#00eaff"/>
              <stop offset="50%" stopColor="#ff6600"/>
              <stop offset="100%" stopColor="#ffd32a"/>
            </linearGradient>
          </defs>

          <CartesianGrid stroke="#12344a" strokeDasharray="3 3" />
          <XAxis dataKey="time" stroke="#ccc" />
          <YAxis stroke="#ccc" domain={[0, yMax]} />

          <Tooltip
  formatter={(value) => `${value} kW`}
  labelFormatter={(label) => `Time: ${label}`}
  contentStyle={{
    background: "#04121d",
    border: "1px solid #00eaff",
    color: "white"
  }}
/>
<Area
  type="monotone"
  dataKey="power"
  fill="url(#areaGlow)"
  stroke="none"
  tooltipType="none"   // 🔥 THIS LINE ADD PANNU
/>
          {capacity > 0 && (
            <ReferenceLine y={capacity} stroke="#ffd32a" strokeDasharray="5 5"/>
          )}

          {peakPoint && (
            <ReferenceDot
              x={peakPoint.time}
              y={peakPoint.power}
              r={6}
              fill="#ff3b3b"
              stroke="white"
            />
          )}

          <Line
            type="monotone"
            dataKey="power"
            stroke="url(#lineColor)"
            strokeWidth={3}
            dot={false}
            style={{
              filter: "drop-shadow(0 0 10px #00eaff)"
            }}
          />

        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
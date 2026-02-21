import { useEffect, useState } from "react";
import API_BASE from "../pages/config";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";


/* ========================= */
/* CAPACITY MAP — UPDATED */
/* ========================= */

const capacityMap = {

  /* NLCIL */
  "NLCILLIBRARY": 50.85,
  "NLCILEDUCATIONOFFICE": 23.73,
  "NLCILLDCOFFICEINV2": 145,

  "NLCBTPSOHCBUILDING": 23.73,
  "NLCBTPSOFFICERSCLUB": 27.12,
  "NLCBTPSTAOFFICE": 23.73,

  /* ✅ NTPL ADDED */
  "NTPLSTROMWATERPUMPHOUSE": 20.34,
  "TPS2EXPESWITCHYARD": 35.03,
  "NLCBTPSNEWSCHOOLBUILDING":80.23

};


/* ========================= */
/* NORMALIZE NAME */
/* ========================= */

const normalizeName = (name) =>
  name?.toUpperCase().replace(/[^A-Z0-9]/g, "");



export default function PowerGraph({
  stationId,
  type,
  buildingName
}) {

  const [data, setData] = useState([]);

  const normalized = normalizeName(buildingName);

  /* ✅ NOW NTPL capacity also works */
  const capacity = capacityMap[normalized] || 0;



  /* ========================= */
  /* IST TIME FORMAT */
  /* ========================= */

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
  /* FETCH GRAPH DATA */
  /* ========================= */

  useEffect(() => {

    if (!stationId) return;

    fetch(`${API_BASE}/graph/${type}/${stationId}`)
      .then(res => res.json())
      .then(graph => {

        if (!Array.isArray(graph)) {

          setData([]);
          return;

        }

        const formatted =
          graph.map(item => {

            const powerKW =
              Number(item.power || 0) / 1000;

            return {

              time: formatTime(item.time),

              fullTime: item.time,

              power: Number(powerKW.toFixed(2))

            };

          })
          .filter(d => d.time !== "");

        setData(formatted);

      })
      .catch(() => {

        setData([]);

      });

  }, [stationId, type]);



  /* ========================= */
  /* CALCULATIONS */
  /* ========================= */

  const current =
    data.length
      ? data[data.length - 1].power
      : 0;


  const peak =
    data.length
      ? Math.max(...data.map(d => d.power))
      : 0;


  const avg =
    data.length
      ? data.reduce((sum, d) => sum + d.power, 0) / data.length
      : 0;


  const yMax =
    capacity
      ? Math.ceil(capacity * 1.2)
      : Math.ceil((peak || 1) * 1.2);



  return (

    <div style={{

      width: "100%",
      height: "380px",

      background:
        "linear-gradient(180deg,#0b1d2c,#081824)",

      borderRadius: "14px",

      padding: "20px",

      boxShadow:
        "inset 0 0 40px rgba(0,255,170,0.05)"

    }}>



      {/* TITLE */}

      <h3 style={{

        color: "white",

        marginBottom: "8px",

        fontWeight: "600"

      }}>
        Power Trend
      </h3>



      {/* ========================= */}
      {/* INFO BAR — COLORS FIXED */}
      {/* ========================= */}

      <div style={{

        display: "flex",

        gap: "25px",

        flexWrap: "wrap",

        marginBottom: "10px",

        fontSize: "14px"

      }}>

        {/* ✅ CURRENT — GREEN */}
        <span style={{ color: "#00ffaa" }}>
          Current: {current.toFixed(1)} kW
        </span>

        {/* ✅ PEAK — BLUE */}
        <span style={{ color: "#4da3ff" }}>
          Peak: {peak.toFixed(1)} kW
        </span>

        {/* AVERAGE */}
        <span style={{ color: "#ffb84d" }}>
          Average: {avg.toFixed(1)} kW
        </span>

        {/* CAPACITY */}
        {capacity > 0 && (

          <span style={{ color: "#FFD700" }}>
            Capacity: {capacity} kW
          </span>

        )}

      </div>



      {/* ========================= */}
      {/* GRAPH */}
      {/* ========================= */}

      <ResponsiveContainer width="100%" height="85%">

        <LineChart
          data={data}
          margin={{
            top: 10,
            right: 25,
            left: 0,
            bottom: 25
          }}
        >

          <CartesianGrid
            stroke="#1f3b55"
            strokeDasharray="3 3"
          />


          {/* X AXIS */}

          <XAxis
            dataKey="time"
            stroke="#ffffff"
            tick={{
              fill: "#ffffff",
              fontSize: 12
            }}
            interval="preserveStartEnd"
            minTickGap={40}
          />


          {/* Y AXIS */}

          <YAxis
            stroke="#ffffff"
            tick={{
              fill: "#ffffff",
              fontSize: 12
            }}
            domain={[0, yMax]}
          />


          {/* TOOLTIP */}

          <Tooltip
            labelFormatter={(label) => `Time: ${label}`}
            contentStyle={{
              background: "#0b1d2c",
              border: "1px solid #00ffaa",
              color: "white"
            }}
            labelStyle={{
              color: "#00ffaa"
            }}
          />


          {/* ========================= */}
          {/* CAPACITY LINE — NOW WORKS FOR NTPL */}
          {/* ========================= */}

          {capacity > 0 && (

            <ReferenceLine
              y={capacity}
              stroke="#FFD700"
              strokeDasharray="5 5"
              label={{
                value: "Capacity",
                fill: "#FFD700",
                position: "insideTopRight"
              }}
            />

          )}


          {/* POWER LINE */}

          <Line
            type="monotone"
            dataKey="power"
            stroke="#00ffaa"
            strokeWidth={2.5}
            dot={false}
            isAnimationActive={true}
          />

        </LineChart>

      </ResponsiveContainer>

    </div>

  );

}

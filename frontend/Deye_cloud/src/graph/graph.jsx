import { useEffect, useState } from "react";
import API_BASE from '../pages/config'

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


/* CAPACITY MAP */
const capacityMap = {

  "NLCIL LIBRARY": 50.85,

  "NLCIL Education office": 23.73,

  "NLCIL L&DC office (INV-2)": 145.00

};


export default function PowerGraph({ stationId, type, buildingName }) {

  const [data, setData] = useState([]);

  const capacity =
    capacityMap[buildingName] || 0;

      useEffect(() => {

  fetch(`${API_BASE}/graph/${type}/${stationId}`)
    .then(res => res.json())
    .then(graph => {

      if (!graph || graph.length === 0) {
        setData([]);
        return;
      }

      const formatted = graph.map((item) => {

        let timeLabel = "";
        let fullTime = "";

        if (type === "monthly") {

          const date = new Date(item.time);

          timeLabel =
            date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short"
            });

          fullTime =
            date.toLocaleString("en-IN");

        }
        else {

          const date = new Date(item.time);

          if (!isNaN(date)) {

            // ✅ convert properly to Indian time

            timeLabel =
              date.toLocaleTimeString("en-IN", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Asia/Kolkata"
              });

            fullTime =
              date.toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata"
              });

          }

        }

        return {

          time: timeLabel,
          fullTime: fullTime,
          power: Number(item.power || 0) / 1000

        };

      });

      setData(formatted);

    });

}, [stationId, type, buildingName]);


  /* CALCULATIONS */

  const currentPower =
    data.length
      ? data[data.length - 1].power
      : 0;


  const peakPower =
    data.length
      ? Math.max(...data.map(d => d.power))
      : 0;


  const avgPower =
    data.length
      ? data.reduce((sum, d) => sum + d.power, 0)
        / data.length
      : 0;


  const lastUpdate =
    new Date().toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });


  /* Y AXIS SCALE BASED ON CAPACITY */

  const yMax =
    capacity
      ? Math.ceil(capacity * 1.1)
      : Math.ceil(peakPower * 1.2);


  return (

    <div style={{
      width: "100%",
      height: "340px",
      background: "#0b1d2c",
      borderRadius: "12px",
      padding: "15px"
    }}>


      {/* TITLE */}

      <h3 style={{
        color: "white",
        marginBottom: "5px"
      }}>

        {type === "today" && "Today Power Graph"}
        {type === "yesterday" && "Yesterday Power Graph"}
        {type === "monthly" && "Monthly Power Graph"}

      </h3>



      {/* INFO BAR */}

      <div style={{
        display: "flex",
        gap: "25px",
        color: "#ccc",
        fontSize: "13px",
        marginBottom: "10px",
        flexWrap: "wrap"
      }}>

        <div>
          Current:
          <span style={{ color: "#00ffaa", marginLeft: "5px" }}>
            {currentPower.toFixed(1)} kW
          </span>
        </div>


        <div>
          Peak:
          <span style={{ color: "#4da3ff", marginLeft: "5px" }}>
            {peakPower.toFixed(1)} kW
          </span>
        </div>


        <div>
          Average:
          <span style={{ color: "#ffb84d", marginLeft: "5px" }}>
            {avgPower.toFixed(1)} kW
          </span>
        </div>


        {capacity > 0 && (

          <div>
            Capacity:
            <span style={{ color: "#FFD700", marginLeft: "5px" }}>
              {capacity} kW
            </span>
          </div>

        )}


        <div>
          Last Update:
          <span style={{ marginLeft: "5px" }}>
            {lastUpdate}
          </span>
        </div>

      </div>



      {/* GRAPH */}

      <ResponsiveContainer width="100%" height="85%">

        <LineChart data={data}>

          <CartesianGrid stroke="#1f3b55" />


          {/* ✅ PERFECT CLIENT TIME AXIS */}

          <XAxis
            dataKey="time"
            stroke="#aaa"
            interval="preserveStartEnd"
            minTickGap={45}
            angle={-35}
            textAnchor="end"
            height={60}
          />


          <YAxis
            stroke="#aaa"
            domain={[0, yMax]}
          />


          {/* ✅ TOOLTIP WITH EXACT TIME */}

          <Tooltip
            labelFormatter={(label, payload) => {

              if (payload && payload.length)
                return payload[0].payload.fullTime;

              return label;

            }}
            formatter={(value) =>
              `${value.toFixed(1)} kW`
            }
          />


          {/* CAPACITY LINE */}

          {capacity > 0 && (

            <ReferenceLine
              y={capacity}
              stroke="gold"
              strokeDasharray="5 5"
              label="Capacity"
            />

          )}


          {/* POWER LINE */}

          <Line
            type="monotone"
            dataKey="power"
            stroke="#00ffaa"
            strokeWidth={2}
            dot={false}
          />


        </LineChart>

      </ResponsiveContainer>

    </div>

  );

}

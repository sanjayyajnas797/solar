import { useEffect, useState } from "react";
import API_BASE from '../pages/config'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";

export default function PowerGraph({ stationId, type }) {

  const [data, setData] = useState([]);

  useEffect(() => {

    fetch(`${API_BASE}/graph/${type}/${stationId}`)
      .then(res => res.json())
      .then(graph => {

        const formatted = graph.map((item, index) => ({

          time:
            type === "monthly"
              ? `Day ${index + 1}`
              : `${index}:00`,

          power: Number(item.power)

        }));

        setData(formatted);

      });

  }, [stationId, type]);


  // ✅ CALCULATIONS (NEW)

  const currentPower =
    data.length > 0
      ? data[data.length - 1].power / 1000
      : 0;

  const peakPower =
    data.length > 0
      ? Math.max(...data.map(d => d.power)) / 1000
      : 0;

  const avgPower =
    data.length > 0
      ? data.reduce((sum, d) => sum + d.power, 0)
          / data.length / 1000
      : 0;

  const lastUpdate =
    new Date().toLocaleTimeString();


  return (

    <div style={{
      width: "100%",
      height: "320px",
      background: "#0b1d2c",
      borderRadius: "12px",
      padding: "15px"
    }}>

      <h3 style={{ color: "white", marginBottom: "5px" }}>
        {type === "today" && "Today Power Graph"}
        {type === "yesterday" && "Yesterday Power Graph"}
        {type === "monthly" && "Monthly Power Graph"}
      </h3>


      {/* ✅ NEW INFO BAR (NO UI CHANGE) */}

      <div style={{
        display: "flex",
        gap: "25px",
        color: "#ccc",
        fontSize: "13px",
        marginBottom: "10px"
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

        <div>
          Last Update:
          <span style={{ marginLeft: "5px" }}>
            {lastUpdate}
          </span>
        </div>

      </div>


      <ResponsiveContainer width="100%" height="85%">

        <LineChart data={data}>

          <CartesianGrid stroke="#1f3b55" />

          <XAxis dataKey="time" stroke="#aaa" />

          <YAxis stroke="#aaa" />

          <Tooltip />

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

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import "../NLCIC/Fts.css"
import API_BASE from "../pages/config";

import mainlogo from "../assets/main logo.png";
import epcLogo from "../assets/sunlogo.png";
import buildIcon from "../assets/solar inverter 1.png";

/* CAPACITY MAP */
const capacityMap = {
  "INV-1": 120,
  "INV-2": 85,
  "INV-3": 60
};

/* DUMMY BUILDINGS */
const dummyBuildings = [
  { id: "inv-1", name: "INV-1", isDummy: true },
  { id: "inv-2", name: "INV-2", isDummy: true },
  { id: "inv-3", name: "INV-3", isDummy: true }
];

/* FORMAT */
const formatBuildingName = (name) => {
  if (!name) return "";
  return name
    .toLowerCase()
    .split(" ")
    .map(word =>
      word === "nlcic"
        ? "NLCIC"
        : word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(" ");
};

export default function NlcicPage() {

  const navigate = useNavigate();

  const [buildings, setBuildings] = useState([]);
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [time, setTime] = useState("");

  useEffect(() => {

    const fetchBuildings = async () => {

      try {

        const res = await fetch(`${API_BASE}/sub-buildings`);
        const data = await res.json();

        const real =
          data.filter(b =>
            b.name.toUpperCase().includes("NLCIC")
          );

        const combined = [
          ...real,
          ...dummyBuildings.slice(0, 3 - real.length)
        ];

        setBuildings(combined);

        if (!selectedBuilding && combined.length) {
          setSelectedBuilding(combined[0]);
        }

        setTime(
          new Date().toLocaleTimeString("en-IN", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
          })
        );

      } catch (err) {
        console.log(err);
      }

    };

    fetchBuildings();
    const interval = setInterval(fetchBuildings, 15000);
    return () => clearInterval(interval);

  }, []);

  /* TOTALS */
  const totalToday = 0;
  const totalYesterday = 0;
  const totalCurrent = 0;

  return (

    <div className="fts-page">

      {/* HEADER */}
      <div className="second-header">

        <div className="secondheader-left">

          <img src={mainlogo} className="second-logo" />

          <div>
            <div className="second-company">
              NLCIC FTS-1.0MW Monitoring
            </div>
            <div className="second-sub">
              Solar Dashboard
            </div>
          </div>

          <div className="header-supplier-block">
            <img src={epcLogo} className="second-logo" />
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

          <button
            className="back-btn"
            onClick={() => navigate("/dashboard")}
          >
            ← Back
          </button>
        </div>

      </div>

      {/* SUMMARY */}
      <div className="fts-summary">

       <div className="fts-summary-card">
          <div className="summary-label">Total Buildings</div>
          <div className="summary-value">{buildings.length}</div>
        </div>

       <div className="fts-summary-card">
          <div className="summary-label">Today Production</div>
          <div className="summary-value">0.0 kWh</div>
        </div>

       <div className="fts-summary-card">
          <div className="summary-label">Yesterday Production</div>
          <div className="summary-value">0.0 kWh</div>
        </div>

        {/* ❌ PEAK CARD REMOVED */}

       <div className="fts-summary-card">
          <div className="summary-label">Live Power</div>
          <div className="summary-value">0.0 kW</div>
        </div>

      </div>

      {/* BUILDINGS */}
      <div className="fts-grid">

        {buildings.map(b => {

          const capacity =
            capacityMap[b.name.toUpperCase()];

          const isActive =
            selectedBuilding?.id === b.id;

          return (

            <div
              key={b.id}
             onClick={() => {
  navigate(`/fts-show/${b.id}`)
}}
              className={`fts-card ${isActive ? "active" : ""}`}
            >

              <div className="fts-card-header">
                <img src={buildIcon} className="fts-card-icon" />
                <div className="fts-not-connected">NOT CONNECTED</div>
              </div>

              <div className="fts-name">

                <div className="fts-title">
  {b.name}
</div>

<div className="fts-subtitle">
  Solar Inverter Monitoring
</div>

                {capacity &&
                 <span className="fts-capacity">
                    Plant Capacity {capacity} kW
                  </span>
                }

              </div>

              {/* ✅ CUMULATIVE ADDED */}
              <div className="fts-energy-row">

  <div>
    <div className="fts-energy-label">TODAY</div>
    <div className="fts-energy-value today">
      202.8 kWh
    </div>
  </div>

  <div>
    <div className="fts-energy-label">YESTERDAY</div>
    <div className="fts-energy-value yesterday">
      272.8 kWh
    </div>
  </div>

  <div>
    <div className="fts-energy-label">CUMULATIVE</div>
    <div className="fts-energy-value cumulative">
      32650.1 kWh
    </div>
  </div>

</div>

 

<div className="fts-extra">



  <div className="fts-live-power">
    Live Power : 0.0 kW
  </div>

</div>

            </div>

          );

        })}

      </div>

    </div>

  );

}
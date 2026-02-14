import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Mainbuilding.css";

import API_BASE from "./config";   // ✅ CONFIG IMPORT

import logo from "../assets/sunlogo.png";
import campusIcon from "../assets/building.png";
import inverterIcon from "../assets/inverter.png";
import energyIcon from "../assets/solar-panel.png";
import solar from "../assets/solar-panel.png";
import load from "../assets/solar-house.png";
import grid from "../assets/tower.png";

export default function Mainbuilding() {

  const navigate = useNavigate();

  const [main, setMain] = useState({
    today: 0,
    yesterday: 0,
    inverter: 0,
    online: 0,
    offline: 0
  });

  const [time, setTime] = useState("");

  const [weather] = useState({
    temp: "26°C",
    condition: "Mostly Sunny"
  });


  const handleLogout = () => {

    localStorage.removeItem("token");

    navigate("/");

  };


  const fetchData = async () => {

    try {

      // ✅ CONFIG USED HERE

      const res =
        await fetch(`${API_BASE}/main-building`);

      const data =
        await res.json();

      setMain(data);

      setTime(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })
      );

    }
    catch (err) {

      console.log(err);

    }

  };


  useEffect(() => {

    fetchData();

    const interval =
      setInterval(fetchData, 1000);

    return () =>
      clearInterval(interval);

  }, []);



  return (

    <div className="dashboard">


      {/* HEADER */}

      <div className="main-header">


        {/* LEFT */}

        <div className="main-header-left">

          <img
            src={logo}
            className="main-logo"
          />

          <div>

            <div className="main-title">

              Sun Industrial Automations & Solutions Private Limited

            </div>

            <div className="main-subtitle">

              Enterprise Solar Monitoring System

            </div>

          </div>

        </div>



        {/* RIGHT */}

        <div className="main-header-right">


          <div className="main-live">

            <span className="main-live-dot"></span>

            LIVE SYSTEM

          </div>


          <div className="main-time">

            {time}

          </div>


          <div className="main-weather">

            {weather.temp}

            <span>

              {weather.condition}

            </span>

          </div>


          <button
            className="main-logout"
            onClick={handleLogout}
          >

            Logout

          </button>


        </div>


      </div>



      {/* KPI GRID */}

      <div className="kpi-grid">


        {/* ENERGY */}

        <div className="kpi-card">

          <img src={energyIcon}/>

          <div>

            <div className="kpi-label">

              ENERGY TODAY

            </div>

            <div className="kpi-value">

              {main.today.toFixed(1)} kWh

            </div>

            <div className="kpi-sub">

              Yesterday {main.yesterday.toFixed(1)}

            </div>

          </div>

        </div>



        {/* INVERTER */}

        <div className="kpi-card">

          <img src={inverterIcon}/>

          <div>

            <div className="kpi-label">

              INVERTERS

            </div>

            <div className="kpi-value">

              {main.online} Online

            </div>

            <div className="kpi-sub red">

              {main.offline} Offline

            </div>

          </div>

        </div>



        {/* SYSTEM HEALTH */}

        <div className="kpi-card">

          <div>

            <div className="kpi-label">

              SYSTEM HEALTH

            </div>

            <div className="kpi-value">

              Operational

            </div>

            <div className="kpi-sub">

              All devices functioning normally

            </div>

          </div>

        </div>



        {/* WEATHER */}

        <div className="kpi-card">

          <div>

            <div className="kpi-label">

              WEATHER

            </div>

            <div className="kpi-value">

              {weather.temp}

            </div>

            <div className="kpi-sub">

              {weather.condition}

            </div>

          </div>

        </div>


      </div>



      {/* CAMPUS */}

      <div
        className="campus-hero"
        onClick={() =>
          navigate("/buildings")
        }
      >

        <img src={campusIcon}/>

        <div>

          <div className="campus-title">

            NLCIL BUILDINGS

          </div>

          <div className="campus-energy">

            {main.today.toFixed(1)} kWh Generated Today

          </div>

          <div className="campus-click">

            Click to open campus →

          </div>

        </div>

      </div>



      {/* POWER FLOW */}

      <div className="powerflow">

        <div className="flow-box">

          <img src={solar}/>

          Solar

        </div>


        <div className="flow-line"></div>


        <div className="flow-box">

          <img src={inverterIcon}/>

          Inverter

        </div>


        <div className="flow-line"></div>


        <div className="flow-box">

          <img src={load}/>

          Load

        </div>


        <div className="flow-line"></div>


        <div className="flow-box">

          <img src={grid}/>

          Grid

        </div>


      </div>



      {/* INFO PANEL */}

      <div className="info-panel">

        <div className="info-title">

          NLC Solar Power Plant Monitoring

        </div>


        <div className="info-grid">


          <div>

            Capacity

            <span>500 kW</span>

          </div>


          <div>

            Active Inverters

            <span>

              {main.online}

            </span>

          </div>


          <div>

            Total Generation Today

            <span>

              {main.today.toFixed(1)} kWh

            </span>

          </div>


          <div>

            System Status

            <span className="green">

              Operational

            </span>

          </div>


        </div>


      </div>


    </div>

  );

}

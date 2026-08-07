import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../NLCIC/Ftsdetails.css";
import mainlogo from "../assets/main logo.png";
import epcLogo from "../assets/sunlogo.png";

export default function FtsInverterDetails() {

  const { id } = useParams();
  const navigate = useNavigate();

  const [time, setTime] = useState("");

useEffect(() => {
  const updateTime = () => {
    setTime(
      new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      })
    );
  };

  updateTime();

  const interval = setInterval(updateTime, 1000);

  return () => clearInterval(interval);
}, []);

  const inverterMap = {
    "inv-1": {
      name: "INV-1",
      mfm: "MFM-1",
      capacity: 120
    },
    "inv-2": {
      name: "INV-2",
      mfm: "MFM-2",
      capacity: 85
    },
    "inv-3": {
      name: "INV-3",
      mfm: "MFM-3",
      capacity: 60
    }
  };

  const inv = inverterMap[id];

  if (!inv) return <h2>Invalid Inverter</h2>;

  return (
    <div className="ftsd-page">

      {/* HEADER */}
        

        <div className="second-header">
        
                <div className="secondheader-left">
        
                  <img src={mainlogo} className="second-logo" />
        
                  <div>
                    <div className="second-company">
                      {inv.name}
                    </div>
                    <div className="second-sub">
                       Inverter Monitoring & Diagnostics
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
                    onClick={() => navigate(-1)}
                  >
                    ← Back
                  </button>
                </div>
        
              </div>
   


      {/* KPI */}

       <div className="ftsd-kpi-grid">

  <div className="ftsd-kpi-card">
    <div className="kpi-icon efficiency-icon"></div>

  <span>Efficiency</span>
  <h2 className="ftsd-green">98.5%</h2>
  </div>

  <div className="ftsd-kpi-card">
    <div className="kpi-icon power-icon"></div>

    <span>Live Power</span>
    <h2>78.5 kW</h2>
  </div>

  <div className="ftsd-kpi-card">
    <div className="kpi-icon yield-icon">
    <div className="yield-bar y1"></div>
    <div className="yield-bar y2"></div>
    <div className="yield-bar y3"></div>
</div>

<span>Today Yield</span>
<h2 className="ftsd-green">202.8 kWh</h2>
  </div>

  <div className="ftsd-kpi-card">
    <div className="kpi-icon energy-icon"></div>

    <span>Total Energy</span>
    <h2 className="ftsd-cyan">32650.1 kWh</h2>
  </div>

</div>

     

      {/* POWER FLOW */}
       
       <div className="ftsd-scada-flow">

      <div className="ftsd-node solar">
  <div className="node-icon solar-icon"></div>

  <span>SOLAR ARRAY</span>
  <span>850 VDC</span>
  <span>120 A</span>
</div>

<div className="ftsd-flow-line"></div>

<div className="ftsd-node inverter">
  <div className="node-icon inverter-icon"></div>

  <span>{inv.name}</span>
  <span>78.5 kW</span>
  <span>98.5 %</span>
</div>

<div className="ftsd-flow-line"></div>

<div className="ftsd-node breaker">
  <div className="node-icon breaker-icon"></div>

  <span>VCB</span>
</div>

<div className="ftsd-flow-line"></div>

<div className="ftsd-node grid">
  <div className="node-icon grid-icon"></div>

  <span>GRID</span>
  <span>415 V</span>
  <span>50.02 Hz</span>
</div>

</div>
      

      

      {/* VCB + MFM */}

      <div className="ftsd-main-grid">
        

        <div className="ftsd-panel">

  <h3>VCB STATUS</h3>

    <div className="ftsd-vcb-grid">

  

  <div className="vcb-metric breaker-off">
    <div className="vcb-mini-icon off-state"></div>
    <span>BREAKER Status</span>
    <h3>OFF</h3>
  </div>

  <div className="vcb-metric service-card">
    <div className="vcb-mini-icon service-gear"></div>
    <span>Service</span>
    <h3>ACTIVE</h3>
  </div>

  <div className="vcb-metric test-card">
    <div className="vcb-mini-icon test-pulse"></div>
    <span>Test</span>
    <h3>READY</h3>
  </div>

  <div className="vcb-metric isolated-card">
    <div className="vcb-mini-icon isolate-lock"></div>
    <span>Isolated</span>
    <h3>NO</h3>
  </div>

  <div className="vcb-metric spring-card">
    <div className="vcb-mini-icon spring-charge"></div>
    <span>Spring Charged</span>
    <h3>YES</h3>
  </div>

  <div className="vcb-metric remote-card">
    <div className="vcb-mini-icon remote-signal"></div>
    <span>Local / Remote</span>
    <h3>REMOTE</h3>
  </div>

  <div className="vcb-metric emergency-card">
    <div className="vcb-mini-icon emergency-stop"></div>
    <span>Emergency Stop</span>
    <h3>NORMAL</h3>
  </div>

  <div className="vcb-metric health-card">
    <div className="vcb-mini-icon health-shield"></div>
    <span>Trip Circuit Health</span>
    <h3>HEALTHY</h3>
  </div>

</div>

  

</div>
            

        <div className="ftsd-panel">

  <div className="mfm-header">
   <div className="mfm-title">
      {inv.mfm}
   </div>

   <div className="mfm-live">
      ● LIVE METER
   </div>
</div>

      <div className="ftsd-mfm-grid">

  {/* VOLTAGE */}

  <div className="mfm-card voltage-card">
    <div className="mfm-head">
      <div className="mfm-icon voltage-icon"></div>
      <span>RY Voltage</span>
    </div>
    <h3>415 V</h3>
  </div>

  <div className="mfm-card voltage-card">
    <div className="mfm-head">
      <div className="mfm-icon voltage-icon"></div>
      <span>YB Voltage</span>
    </div>
    <h3>414 V</h3>
  </div>

  <div className="mfm-card voltage-card">
    <div className="mfm-head">
      <div className="mfm-icon voltage-icon"></div>
      <span>BR Voltage</span>
    </div>
    <h3>416 V</h3>
  </div>


  {/* CURRENT */}

  <div className="mfm-card ftsd-current-card">
    <div className="mfm-head">
      <div className="mfm-icon current-icon"></div>
      <span>R Current</span>
    </div>
    <h3>110 A</h3>
  </div>

  <div className="mfm-card ftsd-current-card">
    <div className="mfm-head">
      <div className="mfm-icon current-icon"></div>
      <span>Y Current</span>
    </div>
    <h3>109 A</h3>
  </div>

 <div className="mfm-card ftsd-current-card">
    <div className="mfm-head">
      <div className="mfm-icon current-icon"></div>
      <span>B Current</span>
    </div>
    <h3>111 A</h3>
  </div>


  {/* PF */}

  <div className="mfm-card pf-card">
    <div className="mfm-head">
      <div className="mfm-icon pf-icon"></div>
      <span>Power Factor</span>
    </div>
    <h3>0.99</h3>
  </div>


  {/* FREQUENCY */}

  <div className="mfm-card freq-card">
    <div className="mfm-head">
      <div className="mfm-icon freq-icon"></div>
      <span>Frequency</span>
    </div>
    <h3>50.02 Hz</h3>
  </div>


  {/* ACTIVE POWER */}

  <div className="mfm-card power-card">
    <div className="mfm-head">
      <div className="mfm-icon power-meter-icon"></div>
      <span>Active Power</span>
    </div>
    <h3>78.5 kW</h3>
  </div>

</div>
     

</div>

       

        

      </div>

      <div className="ftsd-panel ftsd-vcb-values-panel">

  <h3>VCB ELECTRICAL PARAMETERS</h3>

  <div className="ftsd-mfm-grid">

    <div className="mfm-card voltage-card">
      <span>VOLT_RY</span>
      <h3>415 V</h3>
    </div>

    <div className="mfm-card voltage-card">
      <span>VOLT_YB</span>
      <h3>414 V</h3>
    </div>

    <div className="mfm-card voltage-card">
      <span>VOLT_BR</span>
      <h3>416 V</h3>
    </div>

    <div className="mfm-card ftsd-current-card">
      <span>CUR_R</span>
      <h3>110 A</h3>
    </div>

    <div className="mfm-card ftsd-current-card">
      <span>CUR_Y</span>
      <h3>109 A</h3>
    </div>

    <div className="mfm-card ftsd-current-card">
      <span>CUR_B</span>
      <h3>111 A</h3>
    </div>

    <div className="mfm-card power-card">
      <span>TTL_ACT_PWR</span>
      <h3>78.5 kW</h3>
    </div>

    <div className="mfm-card power-card">
      <span>REST_PWR</span>
      <h3>0.0 kW</h3>
    </div>

    <div className="mfm-card freq-card">
      <span>FREQ</span>
      <h3>50.02 Hz</h3>
    </div>

    <div className="mfm-card pf-card">
      <span>PF</span>
      <h3>0.99</h3>
    </div>

    <div className="mfm-card power-card">
      <span>PWR_EXPORT</span>
      <h3>78.5 kW</h3>
    </div>

    <div className="mfm-card voltage-card">
      <span>EXPORT_KWH</span>
      <h3>32650</h3>
    </div>

    <div className="mfm-card voltage-card">
      <span>TTL_IMPORT</span>
      <h3>0</h3>
    </div>

    <div className="mfm-card voltage-card">
      <span>TODAY_IMP</span>
      <h3>0</h3>
    </div>

  </div>

</div>

    </div>
  );
}
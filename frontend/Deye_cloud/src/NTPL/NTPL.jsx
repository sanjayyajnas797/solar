import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../pages/Buildings.css";

import Ntpl from "../assets/Ntpl.jpg";
import buildIcon from "../assets/tower.png";

export default function NtplPage(){

const navigate = useNavigate();
const [time,setTime] = useState("");

useEffect(()=>{

const updateClock=()=>{

setTime(
new Date().toLocaleTimeString("en-IN",{
hour:"2-digit",
minute:"2-digit",
second:"2-digit"
})
);

};

updateClock();
const interval=setInterval(updateClock,1000);
return ()=>clearInterval(interval);

},[]);


return(

<div className="buildings-page">


{/* HEADER */}
<div className="second-header">

<div className="secondheader-left">

<img src={Ntpl} className="second-logo"/>

<div>

<div className="second-company">
NTPL RTS-0.3MW Monitoring
</div>

<div className="second-sub">
Solar Dashboard
</div>

</div>

</div>


<div className="secondheader-right">

<div className="secondlive-box">
● LIVE SYSTEM
</div>

<div className="second-updated">
Updated: {time}
</div>

<button
className="back-btn"
onClick={()=>navigate("/dashboard")}
>
← Back
</button>

</div>

</div>


{/* EMPTY MESSAGE */}
<div className="empty-container">

<img src={buildIcon} className="empty-icon"/>

<div className="empty-title">
No Buildings Added Yet
</div>

<div className="empty-sub">
Buildings for this plant have not been configured.
</div>

<div className="empty-sub-light">
Future buildings will appear here automatically.
</div>

</div>


</div>

);

}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../services/authservices";
import "./Login.css";

import logo from "../assets/sunlogo.png";
import bg from "../assets/elk.jpg";   // ✅ YOUR BACKGROUND IMAGE

export default function Login() {

  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {

    e.preventDefault();

    setError("");
    setLoading(true);

    try {

      const result = await login(email, password);

      if (result.success) {
        navigate("/dashboard");
      }
      else {
        setError("Invalid email or password");
      }

    }
    catch {
      setError("Server connection failed");
    }

    setLoading(false);
  }


  return (

    <div
      className="login-container"
      style={{
        backgroundImage: `url(${bg})`
      }}
    >

      <div className="overlay"></div>


      <div className="login-box">

        <img src={logo} className="login-logo"/>

        <div className="company-name">
          Sun Industrial Automations & Solutions
        </div>

        <div className="company-sub">
          Private Limited
        </div>

        <div className="company-desc">
          Enterprise Solar Monitoring System
        </div>


        <form onSubmit={handleSubmit}>

          <div className="input-group">

            <label>Email Address</label>

            <input
              type="email"
              placeholder="admin@nlc.com"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              required
            />

          </div>


          <div className="input-group">

            <label>Password</label>

            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              required
            />

          </div>


          {error &&
            <div className="error">
              {error}
            </div>
          }


          <button className="login-btn">

            {loading ? "Authenticating..." : "Login"}

          </button>

        </form>


        <div className="footer">
          Secure SCADA Access • Authorized Users Only
        </div>


      </div>

    </div>

  );

}

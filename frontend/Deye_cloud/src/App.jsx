import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "../src/pages/Login";
import Mainbuilding from "../src/pages/mainbuilding";
import Buildings from "../src/pages/building";
import DeviceDashboard from "../src/pages/devicedashboard";
import Dashboard from "./Dashboard";
import ProtectedRoute from "./producted";

export default function App() {

  return (

    <BrowserRouter>

      <Routes>

        {/* PUBLIC */}
        <Route path="/" element={<Login />} />

        {/* PROTECTED */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Mainbuilding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/buildings"
          element={
            <ProtectedRoute>
              <Buildings />
            </ProtectedRoute>
          }
        />

        <Route
          path="/device/:stationId"
          element={
            <ProtectedRoute>
              <DeviceDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="/inverters" element={<Dashboard />} />


      </Routes>

    </BrowserRouter>

  );

}

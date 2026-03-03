 import { BrowserRouter, Routes, Route } from "react-router-dom";

import { useState } from "react"
import { data } from "react-router-dom"

 import Login from "../src/pages/Login";
 import Mainbuilding from "../src/pages/mainbuilding";
 import Buildings from "../src/pages/building";
 import DeviceDashboard from "../src/pages/devicedashboard";

 import Btps from "./BTPS/BTPS";
 import Nlcic from "./NLCIC/Nlcic";
 import Ntpl from "./NTPL/NTPL";
 import Nuppl from "./NUPPL/Nuppl";
 import Type4 from '../src/NUPPL/Type4'
 import ProtectedRoute from "./producted";
//  import Type3 from '../src/NUPPL/Type3'
 export default function App() {

   return (

     <BrowserRouter>

       <Routes>

         {/* PUBLIC */}
         <Route path="/" element={<Login />} />

        {/* DASHBOARD */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Mainbuilding />
             </ProtectedRoute>
          }
         />

         {/* NLCIL */}
         <Route
           path="/buildings"
           element={
             <ProtectedRoute>
               <Buildings />
             </ProtectedRoute>
           }
         />

         {/* DEVICE */}
         <Route
           path="/device/:stationId"
           element={
             <ProtectedRoute>
               <DeviceDashboard />
             </ProtectedRoute>
          }
        />

         {/* OTHER CAMPUSES */}
         <Route path="/nlcic" element={<ProtectedRoute><Nlcic/></ProtectedRoute>} />
        <Route path="/ntpl" element={<ProtectedRoute><Ntpl/></ProtectedRoute>} />
         <Route path="/nuppl" element={<ProtectedRoute><Nuppl/></ProtectedRoute>} />
         <Route path="/btps" element={<ProtectedRoute><Btps/></ProtectedRoute>} />
        <Route path="/type4" element={<ProtectedRoute><Type4/></ProtectedRoute>}/>
         {/* <Route path="/type3" element={<ProtectedRoute><Type3/></ProtectedRoute>}/> */}
       </Routes>

    </BrowserRouter>

   );

 }





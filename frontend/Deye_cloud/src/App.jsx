 import { BrowserRouter, Routes, Route } from "react-router-dom";

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
  import Type3 from '../src/NUPPL/Type3'
  import BuildingDetails from "./pages/buildingdetails";
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
         <Route path="/type3" element={<ProtectedRoute><Type3/></ProtectedRoute>}/>
         <Route path="/building/:id" element={<ProtectedRoute><BuildingDetails/></ProtectedRoute>}/>
       </Routes>

    </BrowserRouter>

   );

 }







// import { useEffect, useState } from "react";

// function App() {

//   const [data, setData] = useState(null);
//   const [last10, setLast10] = useState([]);

//   const stationId = "62050195";

//   useEffect(() => {

//     // 🔥 BUILDING DATA (includes MPPT)
//     fetch("http://localhost:5000/api/sub-buildings")
//       .then(res => res.json())
//       .then(res => {
//         const building = res.find(b => b.id == stationId);
//         setData(building);
//       });

//     // 🔥 LAST 10 DAYS
//     fetch(`http://localhost:5000/api/last10days/${stationId}`)
//       .then(res => res.json())
//       .then(res => setLast10(res));

//   }, []);

//   if (!data) return <div>Loading...</div>;

//   const mpptArray = Object.entries(data.mppt || {});

//   return (
//     <div style={{
//       padding: "30px",
//       background: "#0f172a",
//       color: "white",
//       minHeight: "100vh"
//     }}>

//       <h1>{data.name}</h1>

//       {/* SUMMARY */}
//       <h2>Summary</h2>
//       <p>Today: {data.today} kWh</p>
//       <p>Yesterday: {data.yesterday} kWh</p>
//       <p>Total: {data.total} kWh</p>

//       {/* 🔥 LAST 10 DAYS */}
//       <h2 style={{ marginTop: "20px" }}>Last 10 Days</h2>

//       <table border="1" cellPadding="8">
//         <thead>
//           <tr>
//             <th>Date</th>
//             <th>kWh</th>
//           </tr>
//         </thead>

//         <tbody>
//           {last10.map((item, i) => (
//             <tr key={i}>
//               <td>{item.date}</td>
//               <td>{item.value}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* 🔥 MPPT */}
//       <h2 style={{ marginTop: "20px" }}>MPPT Data</h2>

//       <table border="1" cellPadding="8">
//         <thead>
//           <tr>
//             <th>MPPT</th>
//             <th>Voltage</th>
//             <th>Current</th>
//             <th>Power</th>
//           </tr>
//         </thead>

//         <tbody>
//           {mpptArray.map(([key, val], i) => (
//             <tr key={i}>
//               <td>{key}</td>
//               <td>{val.voltage}</td>
//               <td>{val.current}</td>
//               <td>{val.power}</td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//     </div>
//   );
// }

// export default App;

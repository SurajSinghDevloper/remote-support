// import React from 'react';
// import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
// import Login from './pages/Login';
// import Host from './pages/Host';
// import Client from './pages/Client';

// function App() {
//   return (
//     <Router>  {/* Wrap Routes inside BrowserRouter */}
//       <Routes>
//         <Route path="/" element={<Login />} />
//         <Route path="/host/:code" element={<Host />} />
//         <Route path="/client/:code" element={<Client />} />
//       </Routes>
//     </Router>
//   );
// }

// export default App;


import React from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from "react-router-dom"
import Host from "./components/Host"
import Client from "./components/Client"
import Home from "./components/Home"

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/room/:code" element={<Room />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

function Room() {
  const params = useParams()
  const { code } = params

  if (!code) {
    return <Navigate to="/" replace />
  }

  // Special case for host
  if (code === "host") {
    return <Host />
  }

  return <Client />
}

export default App
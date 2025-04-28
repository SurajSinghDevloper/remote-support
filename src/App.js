import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Host from './pages/Host';
import Client from './pages/Client';

function App() {
  return (
    <Router>  {/* Wrap Routes inside BrowserRouter */}
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/host/:code" element={<Host />} />
        <Route path="/client/:code" element={<Client />} />
      </Routes>
    </Router>
  );
}

export default App;



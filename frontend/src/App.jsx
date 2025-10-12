import { useState } from 'react'
import { Home as HomeIcon, Search, Settings, BarChart3 } from 'lucide-react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import './App.css'
import Dock from './components/Dock.jsx'
import Home from './components/Home.jsx'
import StartAnalysis from './components/StartAnalysis.jsx'
import ProcessingPage from './components/ProcessingPage.jsx'
import { useNavigate, Routes, Route } from 'react-router-dom';
import { Home as HomeIcon, Search, Settings } from 'lucide-react';
import './App.css';
import Dock from './components/Dock.jsx';
import Home from './components/Home.jsx';
import Start from './components/Start.jsx';

function App() {
  const navigate = useNavigate();

  const items = [
    {
      label: 'Home',
      icon: <HomeIcon size={22} />,
      onClick: () => navigate('/'),
      className: ''
    },
    {
      label: 'Analysis',
      icon: <BarChart3 size={22} />,
      onClick: () => navigate('/analysis'),
      className: ''
    },
    {
      label: 'Search',
      icon: <Search size={22} />,
      onClick: () => navigate('/start'),
      className: ''
    },
    {
      label: 'Settings',
      icon: <Settings size={22} />,
      onClick: () => navigate('/settings'),
      className: ''
    }
  ];

  return (
    <>
      <Dock items={items} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/analysis" element={<StartAnalysis />} />
        <Route path="/processing" element={<ProcessingPage />} />
        <Route path="/start" element={<Start />} />
        {/* Optional future route */}
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Routes>
    </>
  );
}

export default App;

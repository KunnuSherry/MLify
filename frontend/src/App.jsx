import { useState } from 'react'
import { Home as HomeIcon, Search, Settings } from 'lucide-react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import Dock from './components/Dock.jsx'
import Home from './components/Home.jsx'

function App() {
  const items = [
    {
      label: 'Home',
      icon: <HomeIcon size={22} />,
      onClick: () => {},
      className: ''
    },
    {
      label: 'Search',
      icon: <Search size={22} />,
      onClick: () => {},
      className: ''
    },
    {
      label: 'Settings',
      icon: <Settings size={22} />,
      onClick: () => {},
      className: ''
    }
  ]

  return (
    <BrowserRouter>
      <Dock items={items} />
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App

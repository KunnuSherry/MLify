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
        <Route path="/start" element={<Start />} />
        {/* Optional future route */}
        <Route path="/settings" element={<div>Settings Page</div>} />
      </Routes>
    </>
  );
}

export default App;

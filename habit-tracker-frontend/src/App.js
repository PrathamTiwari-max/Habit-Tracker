import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PillNav from './components/PillNav';
import Dashboard from './pages/Dashboard';
import Habits from './pages/Habits';
import Workouts from './pages/Workouts';
import Login from './pages/Login';
import Register from './pages/Register';
import Aurora from './components/Aurora';
import './App.css';

function AppContent() {
  const location = useLocation();
  const [username, setUsername] = useState('');

  useEffect(() => {
    const storedUsername = localStorage.getItem('username');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  const isAuthenticated = () => {
    return localStorage.getItem('token') !== null;
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    window.location.href = '/login';
  };

  const ProtectedRoute = ({ children }) => {
    return isAuthenticated() ? children : <Navigate to="/login" />;
  };

  const navItems = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Habits', href: '/habits' },
    { label: 'Workouts', href: '/workouts' }
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Aurora 
        colorStops={['#667eea', '#764ba2', '#667eea']} 
        amplitude={1.2}
        blend={0.5}
        speed={1.0}
      />
      <div className="App" style={{ position: 'relative', zIndex: 1 }}>
        {isAuthenticated() && (
          <div style={{ position: 'relative' }}>
            <PillNav
              logoAlt="Habit Tracker"
              items={navItems}
              activeHref={location.pathname}
              baseColor="#ffffff"
              pillColor="#667eea"
              hoveredPillTextColor="#ffffff"
              pillTextColor="#ffffff"
            />
            <div style={{ 
              position: 'absolute', 
              right: '2rem', 
              top: '1rem',
              zIndex: 1001
            }}>
              <button
                onClick={handleLogout}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#ffffff',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                {username || 'Logout'}
              </button>
            </div>
          </div>
        )}
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/habits" 
            element={
              <ProtectedRoute>
                <Habits />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/workouts" 
            element={
              <ProtectedRoute>
                <Workouts />
              </ProtectedRoute>
            } 
          />
          <Route path="/" element={<Navigate to="/dashboard" />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;

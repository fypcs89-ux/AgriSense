import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import Sidebar from './components/Sidebar.jsx';
import Home from './pages/Home.jsx';
import SensorDashboard from './pages/SensorDashboard.jsx';
import CropRecommendation from './pages/CropRecommendation.jsx';
import FertilizerRecommendation from './pages/FertilizerRecommendation.jsx';
import Results from './pages/Results.jsx';
import History from './pages/History.jsx';
import AdminPanel from './pages/AdminPanel.jsx';
import About from './pages/About.jsx';
import Contact from './pages/Contact.jsx';
import './index.css';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './contexts/AuthContext';

// Child component that consumes auth inside providers
function AppRoutes() {
  const { currentUser } = useAuth() || {};
  return (
    <div className="min-h-screen max-w-full overflow-x-hidden">
      {/* Sidebar fixed on desktop */}
      <Sidebar />
      <main className="bg-gray-100 min-w-0 flex-1 main-content max-w-full overflow-x-hidden lg:ml-64 h-screen overflow-y-auto">
        <Routes>
          <Route
            path="/"
            element={
              currentUser
                ? (<ProtectedRoute><SensorDashboard /></ProtectedRoute>)
                : (<Home />)
            }
          />
          <Route
            path="/dashboard"
            element={<ProtectedRoute><SensorDashboard /></ProtectedRoute>}
          />
          <Route
            path="/crop-recommendation"
            element={<ProtectedRoute><CropRecommendation /></ProtectedRoute>}
          />
          <Route
            path="/fertilizer-recommendation"
            element={<ProtectedRoute><FertilizerRecommendation /></ProtectedRoute>}
          />
          <Route
            path="/results"
            element={<ProtectedRoute><Results /></ProtectedRoute>}
          />
          <Route
            path="/history"
            element={<ProtectedRoute><History /></ProtectedRoute>}
          />
          <Route
            path="/admin"
            element={<ProtectedRoute><AdminPanel /></ProtectedRoute>}
          />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppRoutes />
        </Router>
      </DataProvider>
    </AuthProvider>
  );
}

export default App;

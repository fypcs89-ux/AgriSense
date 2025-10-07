import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  BarChart3,
  Sprout,
  FlaskConical,
  FileText,
  History,
  Settings,
  Info,
  Mail,
  Leaf,
  Menu,
  X,
  LogOut,
  User
} from 'lucide-react';

// Menu items for authenticated users (no Home for logged-in users)
const authenticatedMenuItems = [
  { path: '/dashboard', name: 'Dashboard', icon: BarChart3 },
  { path: '/crop-recommendation', name: 'Crop Recommendation', icon: Sprout },
  { path: '/fertilizer-recommendation', name: 'Fertilizer Recommendation', icon: FlaskConical },
  { path: '/history', name: 'History', icon: History },
  { path: '/results', name: 'Results', icon: FileText },
  { path: '/admin', name: 'Admin Panel', icon: Settings },
  { path: '/contact', name: 'Contact', icon: Mail },
];

// Menu items for non-authenticated users
const publicMenuItems = [
  { path: '/', name: 'Home', icon: Home },
  { path: '/about', name: 'About', icon: Info },
];

const Sidebar = ({ staticOnDesktop = false }) => {
  const location = useLocation();
  // HMR-safe access to auth context
  const authCtx = (typeof useAuth === 'function') ? useAuth() : undefined;
  const currentUser = authCtx?.currentUser ?? null;
  const logout = authCtx?.logout ?? (() => {});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    console.log('Toggle clicked, current state:', isMobileMenuOpen);
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      {/* Mobile Menu Button - Only show when sidebar is closed */}
      {!isMobileMenuOpen && (
        <button
          onClick={toggleMobileMenu}
          className="lg:hidden fixed top-4 left-4 z-[60] bg-primary-500 text-white p-3 rounded-lg shadow-lg hover:bg-primary-600 transition-colors duration-200"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-64 bg-gray-50 min-h-screen shadow-lg fixed left-0 top-0 z-50 transform transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:sticky lg:top-0 lg:left-0 lg:z-40 lg:transform-none lg:h-screen`}
      >
      {/* Logo Section */}
      <div className="p-4 sm:p-6 border-b border-gray-200 relative">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="bg-primary-500 p-2 rounded-lg">
            <Leaf className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-800">AgriSense</h1>
            <p className="text-xs sm:text-sm text-gray-500">Smart Agriculture</p>
          </div>
        </div>
        
        {/* Close button inside sidebar - only show on mobile when sidebar is open */}
        {isMobileMenuOpen && (
          <button
            onClick={toggleMobileMenu}
            className="lg:hidden absolute top-5 right-4 bg-primary-500 text-white p-2 rounded-lg shadow-lg hover:bg-primary-600 transition-colors duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="mt-4 sm:mt-6">
        <ul className="space-y-1 sm:space-y-2 px-3 sm:px-4">
          {(currentUser ? authenticatedMenuItems : publicMenuItems).map((item) => {
            const Icon = item.icon;
            // If logged in and we're on '/', we are showing the dashboard; highlight it.
            const effectivePath = (currentUser && location.pathname === '/') ? '/dashboard' : location.pathname;
            const isActive = effectivePath === item.path;
            
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-md'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-primary-600'
                  }`}
                >
                  <Icon 
                    className={`w-5 h-5 ${
                      isActive ? 'text-white' : 'text-gray-400 group-hover:text-primary-500'
                    }`} 
                  />
                  <span className={`font-medium text-sm sm:text-base ${isActive ? 'font-semibold' : ''}`}>
                    {item.name}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer - Show current user at bottom when logged in */}
      {currentUser && (
        <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-primary-100 p-2 rounded-full">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div className="leading-tight">
                <div className="text-sm font-semibold text-gray-800 truncate max-w-[9rem]">
                  {currentUser.displayName || currentUser.email}
                </div>
                <div className="text-xs text-gray-500">Logged in</div>
              </div>
            </div>
            <button
              onClick={() => { try { logout(); } catch {} }}
              className="p-2 rounded-lg text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default Sidebar;

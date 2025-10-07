import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext.jsx';
import { isDemoMode } from '../firebase/config';
import FeatureCard from '../components/FeatureCard.jsx';
import LoginForm from '../components/LoginForm.jsx';
import {
  Thermometer,
  Droplets,
  FlaskConical,
  Brain,
  ArrowRight,
  Leaf,
  BarChart3,
  Shield,
  Zap,
  Info,
  User
} from 'lucide-react';

const Home = () => {
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const { currentUser, logout } = useAuth();

  const features = [
    {
      icon: Thermometer,
      title: 'Temperature',
      subtitle: 'Real-time monitoring',
      delay: 0.1
    },
    {
      icon: Droplets,
      title: 'Humidity & pH',
      subtitle: 'Soil condition tracking',
      delay: 0.2
    },
    {
      icon: FlaskConical,
      title: 'NPK Analysis',
      subtitle: 'Nutrient level detection',
      delay: 0.3
    },
    {
      icon: Brain,
      title: 'AI Recommendations',
      subtitle: 'Smart crop suggestions',
      delay: 0.4
    }
  ];

  const stats = [
    { icon: BarChart3, value: '24/7', label: 'Monitoring' },
    { icon: Brain, value: 'AI', label: 'Powered' },
    { icon: Zap, value: 'Real-time', label: 'Updates' }
  ];

  const handleAuthAction = () => {
    if (currentUser) {
      logout();
    } else {
      setShowLoginForm(true);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 px-4 sm:px-6 pt-4 sm:pt-6 pb-6 sm:pb-8 page-with-top-gap">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-600 text-white p-3 text-center"
        >
          <div className="flex items-center justify-center space-x-2">
            <Info className="w-4 h-4" />
            <span className="text-sm font-medium">
              Demo Mode: Authentication works locally without Firebase setup. Try any email/password!
            </span>
          </div>
        </motion.div>
      )}

      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center pt-6 sm:pt-8 pb-10 sm:pb-14 lg:pb-16"
      >
        <div className="w-full">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-primary-100 w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mx-auto mb-4"
          >
            <Leaf className="w-8 h-8 sm:w-9 sm:h-9 text-primary-600" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-5xl sm:text-6xl md:text-7xl font-bold text-gray-800 mb-3 tracking-tight"
          >
            Agri<span className="text-primary-500">Sense</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-xl md:text-2xl text-gray-600 leading-relaxed max-w-4xl mx-auto mb-10"
          >
            Smart Agriculture Platform - Monitor your crops with IoT sensors, 
            get AI-powered recommendations for optimal yield, and make data-driven farming decisions.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center items-center"
          >
            <button
              onClick={handleAuthAction}
              className="bg-primary-500 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <span>{currentUser ? 'Sign Out' : 'Get Started'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {currentUser && (
              <div className="bg-white px-6 py-4 rounded-xl shadow-lg border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary-500 p-2 rounded-full">
                    <User className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Welcome</div>
                    <div className="font-semibold text-primary-600">
                      {currentUser.displayName || currentUser.email}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </motion.div>

      {/* Stats Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="py-10 sm:py-12"
      >
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.7 + index * 0.1 }}
                  className="text-center bg-white rounded-xl p-6 shadow-lg border border-gray-100"
                >
                  <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <div className="text-3xl font-bold text-gray-800 mb-2">{stat.value}</div>
                  <div className="text-gray-600">{stat.label}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* Features Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.8 }}
        className="py-12 sm:py-14"
      >
        <div className="w-full">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Comprehensive Monitoring Features
            </h2>
            <p className="text-xl text-gray-600">
              Advanced IoT sensors and AI-powered analytics for modern agriculture
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                icon={feature.icon}
                title={feature.title}
                subtitle={feature.subtitle}
                delay={feature.delay}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 1 }}
        className="py-12 sm:py-16 bg-primary-500 rounded-lg"
      >
        <div className="w-full text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Transform Your Farm?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of farmers using AgriSense to optimize their crop yields
          </p>
          {!currentUser && (
            <button
              onClick={() => setShowLoginForm(true)}
              className="bg-white text-primary-500 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Start Your Journey
            </button>
          )}
        </div>
      </motion.div>

      {/* Login/Signup Modal */}
      {showLoginForm && (
        <LoginForm
          isLogin={isLogin}
          onToggle={() => setIsLogin(!isLogin)}
          onClose={() => setShowLoginForm(false)}
        />
      )}
    </div>
  );
};

export default Home;

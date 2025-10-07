import React from 'react';
import { motion } from 'framer-motion';
import {
  Info,
  Leaf,
  Target,
  Users,
  Award,
  Lightbulb,
  Globe,
  Heart,
  Code,
  Cpu,
  Palette
} from 'lucide-react';

const About = () => {
  const features = [
    {
      icon: Target,
      title: 'Our Mission',
      description: 'To revolutionize agriculture through smart IoT technology and AI-powered insights, helping farmers optimize crop yields and make data-driven decisions.'
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      description: 'Cutting-edge sensor technology combined with machine learning algorithms to provide real-time monitoring and intelligent recommendations.'
    },
    {
      icon: Globe,
      title: 'Sustainability',
      description: 'Promoting sustainable farming practices through precise nutrient management and optimized resource utilization.'
    },
    {
      icon: Heart,
      title: 'Community',
      description: 'Supporting farmers worldwide with accessible technology that bridges the gap between traditional farming and modern agriculture.'
    }
  ];

  const team = [
    {
      name: 'Taseen Ali',
      role: 'IoT Engineer',
      description: 'Expert in sensor technology and embedded systems for agricultural applications',
      icon: Cpu
    },
    {
      name: 'Muhammad Khan',
      role: 'Frontend Developer',
      description: 'Builds responsive, interactive, and user-friendly web interfaces using HTML, CSS, JavaScript, and modern frameworks.',
      icon: Code
    },
    {
      name: 'Loung Khan',
      role: 'Designer',
      description: 'Creates visually appealing and user-centric designs, focusing on aesthetics, functionality, and seamless user experiences across digital platforms.',
      icon: Palette
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6 page-with-top-gap">
      <div className="w-full">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8 sm:mb-12"
        >
          <div className="flex items-center justify-center space-x-3 flex-nowrap mb-6">
            <div className="bg-primary-100 p-4 rounded-lg">
              <Info className="w-10 h-10 text-primary-600" />
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-gray-800 whitespace-nowrap">About AgriSense</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
            AgriSense is a comprehensive smart agriculture platform that combines IoT sensors, 
            real-time data monitoring, and AI-powered recommendations to help farmers optimize 
            their crop yields and make informed decisions.
          </p>
        </motion.div>

        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="bg-gradient-to-r from-primary-500 to-green-500 rounded-2xl p-6 sm:p-10 mb-10 sm:mb-14 text-white text-center"
        >
          <div className="bg-white bg-opacity-20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Leaf className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold mb-4">Transforming Agriculture with Technology</h2>
          <p className="text-xl opacity-90 max-w-2xl mx-auto">
            We believe that the future of farming lies in the intelligent use of technology 
            to create sustainable, efficient, and profitable agricultural practices.
          </p>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-8 sm:mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">What We Stand For</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-all duration-300"
                >
                  <div className="bg-primary-100 w-16 h-16 rounded-lg flex items-center justify-center mb-6">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-4">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Technology Stack */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6 sm:p-8 mb-8 sm:mb-12 border border-gray-100"
        >
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">Our Technology</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-5">
                <Award className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">IoT Sensors</h3>
              <p className="text-gray-600">7-in-1 sensor modules measuring temperature, humidity, soil moisture, NPK levels, and pH</p>
            </div>
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-5">
                <Globe className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Cloud Platform</h3>
              <p className="text-gray-600">Firebase-powered real-time data processing and storage with secure authentication</p>
            </div>
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-5">
                <Lightbulb className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">AI Analytics</h3>
              <p className="text-gray-600">Machine learning algorithms for crop and fertilizer recommendations</p>
            </div>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-gray-800 text-center mb-12">Meet Our Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {team.map((member, index) => {
              const Icon = member.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 text-center hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{member.name}</h3>
                  <div className="text-primary-600 font-semibold mb-4">{member.role}</div>
                  <p className="text-gray-600 leading-relaxed">{member.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default About;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useData } from '../contexts/DataContext.jsx';
import {
  Download,
  Calendar,
  History as HistoryIcon,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  TrendingUp,
  Droplets,
  Thermometer,
  Beaker,
  Leaf,
  Trash2
} from 'lucide-react';

const History = () => {
  const [groupedData, setGroupedData] = useState({});
  const [expandedDays, setExpandedDays] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const { hourlyData, dailySummaries, loading, clearHistory } = useData();

  // Normalize timestamps to Date objects to avoid runtime errors
  const normalizedHourly = (hourlyData || []).map((r) => {
    let ts = r.timestamp;
    if (!(ts instanceof Date)) {
      try {
        ts = new Date(ts);
      } catch {
        ts = new Date();
      }
    }
    return { ...r, timestamp: ts };
  });

  // Group data by day - show all days with collapsible sections
  useEffect(() => {
    const grouped = normalizedHourly.reduce((acc, reading) => {
      const dateKey = reading.date || reading.timestamp.toISOString().split('T')[0];
      const dayNumber = reading.day || 1;
      
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          dayNumber: dayNumber,
          readings: []
        };
      }
      acc[dateKey].readings.push(reading);
      return acc;
    }, {});
    // Sort readings within each day by hour
    Object.values(grouped).forEach(day => {
      day.readings.sort((a, b) => a.hour - b.hour);
    });
    
    setGroupedData(grouped);
  }, [hourlyData]);

  const handleClearHistory = async () => {
    const ok = window.confirm('Are you sure you want to clear all history (hourly and daily)? This cannot be undone.');
    if (!ok) return;
    try {
      await clearHistory();
      setGroupedData({});
      setExpandedDays({});
      // Notify other pages (like Results) to clear their local results state
      try {
        window.dispatchEvent(new Event('clear-results'));
      } catch {}
    } catch (e) {
      console.error('Clear history failed:', e);
      alert('Failed to clear history. Please try again.');
    }
  };

  const toggleDay = (dateKey) => {
    setExpandedDays(prev => ({
      ...prev,
      [dateKey]: !prev[dateKey]
    }));
  };

  const filteredDays = Object.values(groupedData).filter(day => {
    if (dateFilter === 'all') return true;
    
    const dayDate = new Date(day.date);
    const now = new Date();
    
    switch (dateFilter) {
      case 'today':
        return dayDate.toDateString() === now.toDateString();
      case 'week':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return dayDate >= weekAgo;
      case 'month':
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return dayDate >= monthAgo;
      default:
        return true;
    }
  }).sort((a, b) => new Date(b.date) - new Date(a.date));

  const exportDayToCSV = (day) => {
    const headers = ['Date', 'Time', 'Soil Temperature (°C)', 'Moisture (%)', 'Nitrogen (ppm)', 'Phosphorus (ppm)', 'Potassium (ppm)', 'pH', 'Reading Count'];
    const csvContent = [
      headers.join(','),
      ...day.readings.map(item => [
        item.timestamp.toLocaleDateString(),
        item.timestamp.toLocaleTimeString(),
        (item.soilTemperature ?? item.temperature),
        item.moisture,
        item.nitrogen,
        item.phosphorus,
        item.potassium,
        item.ph,
        item.readingCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrisense-day-${day.dayNumber}-${day.date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportAllToCSV = () => {
    const headers = ['Date', 'Time', 'Soil Temperature (°C)', 'Moisture (%)', 'Nitrogen (ppm)', 'Phosphorus (ppm)', 'Potassium (ppm)', 'pH', 'Reading Count'];
    const allReadings = filteredDays.flatMap(day => day.readings);
    const csvContent = [
      headers.join(','),
      ...allReadings.map(item => [
        item.timestamp.toLocaleDateString(),
        item.timestamp.toLocaleTimeString(),
        (item.soilTemperature ?? item.temperature),
        item.moisture,
        item.nitrogen,
        item.phosphorus,
        item.potassium,
        item.ph,
        item.readingCount
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agrisense-all-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <HistoryIcon className="w-12 h-12 text-primary-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-600">Loading historical data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-0 page-with-top-gap">
      <div className="w-full pl-4 sm:pl-6 pr-4 sm:pr-6 pt-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 p-3 rounded-lg">
                <HistoryIcon className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">Daily History</h1>
                <p className="text-gray-600 mt-2">
                  sensor data collection
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 w-full sm:w-auto justify-start sm:justify-end mt-3 sm:mt-0">
              <button
                onClick={exportAllToCSV}
                className="bg-primary-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                <span>Export All CSV</span>
              </button>
              <button
                onClick={handleClearHistory}
                className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl"
                title="Clear results and history"
              >
                <Trash2 className="w-5 h-5" />
                <span>Clear Results & History</span>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <span className="text-gray-600">
                Showing today's {hourlyData.length} readings
              </span>
            </div>
          </div>
        </motion.div>

        {/* Daily Grouped Data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="space-y-4"
        >
          {filteredDays.length === 0 && (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-10 text-center text-gray-500">
              No historical hourly data available yet.
            </div>
          )}

          {filteredDays.map((day, dayIndex) => (
            <div key={day.date} className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
              {/* Day Header */}
              <div 
                className="bg-gray-50 px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors duration-200"
                onClick={() => toggleDay(day.date)}
              >
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-primary-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">
                      Date ({day.date})
                    </h3>
                    <p className="text-sm text-gray-600">
                      {day.readings.length} hourly readings collected and stored
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      exportDayToCSV(day);
                    }}
                    className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all duration-200"
                    title="Export this day's data"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  {expandedDays[day.date] ? (
                    <ChevronUp className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>

              {/* Hourly Readings */}
              {expandedDays[day.date] && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-x-auto"
                >
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Soil Temp (°C)
                        </th>
                        
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Moisture (%)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          N (ppm)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          P (ppm)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          K (ppm)
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          pH
                        </th>
                        
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {day.readings.map((reading, readingIndex) => (
                        <motion.tr
                          key={reading.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: readingIndex * 0.02 }}
                          className="hover:bg-gray-50 transition-colors duration-200"
                        >
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {(() => {
                              const ts = reading.timestamp instanceof Date ? reading.timestamp : new Date(reading.timestamp);
                              return isNaN(ts.getTime()) ? '-' : ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            })()}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.soilTemperature ?? reading.temperature}
                          </td>
                          
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.moisture}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.nitrogen}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.phosphorus}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.potassium}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                            {reading.ph}
                          </td>
                          
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {['temperature', 'humidity', 'moisture', 'ph'].map((metric) => {
            const allReadings = filteredDays.flatMap(day => day.readings);
            const values = allReadings.map(item => parseFloat(item[metric])).filter(v => !isNaN(v));
            const avg = values.length ? (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) : 0;
            const min = values.length ? Math.min(...values).toFixed(1) : 0;
            const max = values.length ? Math.max(...values).toFixed(1) : 0;

            return (
              <div key={metric} className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center space-x-3 mb-4">
                  <TrendingUp className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-semibold text-gray-800 capitalize">{metric.toLowerCase()}</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Average</span>
                    <span className="font-semibold text-gray-800">{avg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Min</span>
                    <span className="font-semibold text-blue-600">{min}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max</span>
                    <span className="font-semibold text-red-600">{max}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
};

export default History;

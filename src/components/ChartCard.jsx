import React from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const ChartCard = ({ title, value, unit, color, data, icon: Icon }) => {
  const COLORS = {
    temperature: '#ef4444',
    humidity: '#3b82f6',
    moisture: '#06b6d4',
    nitrogen: '#10b981',
    phosphorus: '#f59e0b',
    potassium: '#8b5cf6',
    ph: '#ec4899'
  };

  const currentVal = parseFloat(value) || 0;
  const remainingVal = (color === 'ph')
    ? Math.max(0, 8 - currentVal)
    : (color === 'nitrogen' || color === 'phosphorus')
      ? Math.max(0, 150 - currentVal)
      : (color === 'potassium')
        ? Math.max(0, 250 - currentVal)
        : Math.max(0, 100 - currentVal);
  const chartData = [
    { name: 'Current', value: currentVal },
    { name: 'Remaining', value: remainingVal }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg bg-opacity-20`} style={{ backgroundColor: COLORS[color] + '33' }}>
            <Icon className="w-5 h-5" style={{ color: COLORS[color] }} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-gray-800">
            {value}
            <span className="text-lg text-gray-500 ml-1">{unit}</span>
          </div>
          <div className="text-sm text-gray-500 mt-1">Current Reading</div>
        </div>

        <div className="w-20 h-20">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={25}
                outerRadius={35}
                startAngle={90}
                endAngle={450}
                dataKey="value"
              >
                <Cell fill={COLORS[color]} />
                <Cell fill="#e5e7eb" />
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
};

export default ChartCard;

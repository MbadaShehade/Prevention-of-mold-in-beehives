'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const RealTimeTemperatureGraph = ({ 
  theme, 
  temperatureData, 
  chartOptions, 
  formatDate, 
  activeDropdown, 
  setActiveDropdown, 
  handleExport 
}) => {
  // Transform data for Recharts
  const rechartsData = temperatureData && temperatureData.labels && temperatureData.datasets && temperatureData.datasets[0]
    ? temperatureData.labels.map((label, idx) => ({
        name: label,
        value: temperatureData.datasets[0].data[idx]
      }))
    : [];

  return (
    <div className="chart-section">
      <h1 className={`temperature-title ${theme === 'dark' ? 'dark' : 'light'}`}>
        Real-Time temperature
      </h1>
      <div className="date-display">
        Date: {formatDate(new Date())}
      </div>
      <div className="chart-wrapper" id="temperature-chart">
        {rechartsData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rechartsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#fff2' : '#ccc'} />
              <XAxis
                dataKey="name"
                stroke={theme === 'dark' ? '#fff' : '#000'}
                tick={{ fill: theme === 'dark' ? '#fff' : '#000' }}
              />
              <YAxis
                stroke={theme === 'dark' ? '#fff' : '#000'}
                tick={{ fill: theme === 'dark' ? '#fff' : '#000' }}
              />
              <Tooltip
                contentStyle={{
                  background: theme === 'dark' ? '#1e293b' : '#fff',
                  color: theme === 'dark' ? '#fff' : '#000',
                  border: '1px solid #8884d8'
                }}
                labelStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
                itemStyle={{ color: theme === 'dark' ? '#fff' : '#000' }}
              />
              <Legend
                wrapperStyle={{
                  color: theme === 'dark' ? '#fff' : '#000'
                }}
              />
              <Line
                type="monotone"
                dataKey="value"
                name="Temperature (°C)"
                stroke={theme === 'dark' ? '#fff' : '#8884d8'}
                dot={{ stroke: theme === 'dark' ? '#fff' : '#8884d8', fill: theme === 'dark' ? '#fff' : '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div>No data available</div>
        )}
      </div>
      <div className="export-container">
        <button 
          className="export-button"
          onClick={(e) => {
            e.stopPropagation();
            setActiveDropdown(activeDropdown === 'temperature' ? null : 'temperature');
          }}
        >
          <Download size={20} />
          Export Graph
        </button>
        <div 
          className={`export-dropdown ${activeDropdown === 'temperature' ? 'show' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="format-option" onClick={() => handleExport('temperature', 'png')}>PNG</div>
          <div className="format-option" onClick={() => handleExport('temperature', 'jpg')}>JPG</div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeTemperatureGraph; 
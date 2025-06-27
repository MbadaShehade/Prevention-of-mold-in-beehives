'use client';
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download } from 'lucide-react';

const RealTimeHumidityGraph = ({ 
  theme, 
  humidityData, 
  chartOptions, 
  formatDate, 
  activeDropdown, 
  setActiveDropdown, 
  handleExport 
}) => {
  // Transform data for Recharts
  const rechartsData = humidityData && humidityData.labels && humidityData.datasets && humidityData.datasets[0]
    ? humidityData.labels.map((label, idx) => ({
        name: label,
        value: humidityData.datasets[0].data[idx]
      }))
    : [];

  return (
    <div className="chart-section">
      <h1 className={`temperature-title ${theme === 'dark' ? 'dark' : 'light'}`}>
        Real-Time humidity
      </h1>
      <div className="date-display">
        Date: {formatDate(new Date())}
      </div>
      <div className="chart-wrapper" id="humidity-chart">
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
                name="Humidity (%)"
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
            setActiveDropdown(activeDropdown === 'humidity' ? null : 'humidity');
          }}
        >
          <Download size={20} />
          Export Graph
        </button>
        <div 
          className={`export-dropdown ${activeDropdown === 'humidity' ? 'show' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="format-option" onClick={() => handleExport('humidity', 'png')}>PNG</div>
          <div className="format-option" onClick={() => handleExport('humidity', 'jpg')}>JPG</div>
        </div>
      </div>
    </div>
  );
};

export default RealTimeHumidityGraph; 
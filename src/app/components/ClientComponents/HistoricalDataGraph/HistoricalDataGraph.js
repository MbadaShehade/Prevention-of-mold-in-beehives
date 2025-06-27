'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Download, Calendar, Thermometer, Droplets } from 'lucide-react';

const HistoricalDataGraph = ({ 
  theme,
  historicalData,
  historicalChartOptions,
  dateRange,
  setDateRange,
  activeMetrics,
  setActiveMetrics,
  customStartDate,
  customEndDate,
  handleCustomDateChange,
  formatDate,
  updateHistoricalData,
  activeDropdown,
  setActiveDropdown,
  handleExport
}) => {
  // Transform data for Recharts
  const rechartsData = historicalData && historicalData.labels && historicalData.datasets && historicalData.datasets.length > 0
    ? historicalData.labels.map((label, idx) => {
        const entry = { name: label };
        historicalData.datasets.forEach(ds => {
          if (ds.label.includes('Temperature')) entry.temperature = ds.data[idx];
          if (ds.label.includes('Humidity')) entry.humidity = ds.data[idx];
        });
        return entry;
      })
    : [];

  return (
    <div className="chart-section historical">
      <h1 className={`temperature-title ${theme === 'dark' ? 'dark' : 'light'}`}>
        Historical Data
      </h1>
      <div className="metric-toggles">
        <button 
          className={`metric-toggle ${activeMetrics.temperature ? 'active' : ''}`}
          onClick={() => {
            if (!activeMetrics.temperature || activeMetrics.humidity) {
              setActiveMetrics(prev => ({ ...prev, temperature: !prev.temperature }));
            }
          }}
        >
          <Thermometer size={16} />
          Temperature
        </button>
        <button 
          className={`metric-toggle ${activeMetrics.humidity ? 'active' : ''}`}
          onClick={() => {
            if (!activeMetrics.humidity || activeMetrics.temperature) {
              setActiveMetrics(prev => ({ ...prev, humidity: !prev.humidity }));
            }
          }}
        >
          <Droplets size={16} />
          Humidity
        </button>
      </div>
      <div className="date-controls">
        <button 
          className={`date-range-button ${dateRange === 'lastWeek' ? 'active' : ''}`}
          onClick={() => {
            setDateRange('lastWeek');
            updateHistoricalData('lastWeek');
          }}
        >
          Last Week
        </button>
        <button 
          className={`date-range-button ${dateRange === 'lastMonth' ? 'active' : ''}`}
          onClick={() => {
            setDateRange('lastMonth');
            updateHistoricalData('lastMonth');
          }}
        >
          Last Month
        </button>
        <button 
          className={`date-range-button ${dateRange === 'lastYear' ? 'active' : ''}`}
          onClick={() => {
            setDateRange('lastYear');
            updateHistoricalData('lastYear');
          }}
        >
          Last Year
        </button>
        <button 
          className={`date-range-button ${dateRange === 'custom' ? 'active' : ''}`}
          onClick={() => setDateRange('custom')}
        >
          <Calendar size={16} />
          Custom Range
        </button>
      </div>
      <div className={`custom-date-inputs ${dateRange === 'custom' ? '' : 'hidden'}`}>
        <div className="date-input-group">
          <label className="date-input-label">Start Date:</label>
          <input
            type="date"
            className="date-input"
            value={customStartDate}
            onChange={(e) => handleCustomDateChange(true, e.target.value)}
            max={customEndDate || new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="date-input-group">
          <label className="date-input-label">End Date:</label>
          <input
            type="date"
            className="date-input"
            value={customEndDate}
            onChange={(e) => handleCustomDateChange(false, e.target.value)}
            min={customStartDate}
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
      <div className="chart-wrapper" id="historical-chart">
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
              {activeMetrics.temperature && (
                <Line
                  type="monotone"
                  dataKey="temperature"
                  name="Temperature (°C)"
                  stroke={theme === 'dark' ? '#fff' : '#ba6719'}
                  dot={{ stroke: theme === 'dark' ? '#fff' : '#ba6719', fill: theme === 'dark' ? '#fff' : '#ba6719' }}
                  connectNulls
                />
              )}
              {activeMetrics.humidity && (
                <Line
                  type="monotone"
                  dataKey="humidity"
                  name="Humidity (%)"
                  stroke={theme === 'dark' ? '#fff' : '#0EA5E9'}
                  dot={{ stroke: theme === 'dark' ? '#fff' : '#0EA5E9', fill: theme === 'dark' ? '#fff' : '#0EA5E9' }}
                  connectNulls
                />
              )}
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
            setActiveDropdown(activeDropdown === 'historical' ? null : 'historical');
          }}
        >
          <Download size={20} />
          Export Graph
        </button>
        <div 
          className={`export-dropdown ${activeDropdown === 'historical' ? 'show' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="format-option" onClick={() => handleExport('historical', 'png')}>PNG</div>
          <div className="format-option" onClick={() => handleExport('historical', 'jpg')}>JPG</div>
        </div>
      </div>
      <div className="about-data">
        <h3>About This Data</h3>
        <p>This chart displays historical temperature and humidity data at their maximum values inside the beehive. Optimal hive temperature is typically between 26-38°C, and optimal humidity ranges between 76.5-85.6%</p>
      </div>
    </div>
  );
};

export default HistoricalDataGraph; 
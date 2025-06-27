import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);


import { useTheme } from 'next-themes';

export default function HiveComparisonBarChart({ hives, fakeHiveData, selectedHiveIds, setSelectedHiveIds }) {
  const { theme } = useTheme();
  // Prepare data for chart
  const chartData = useMemo(() => {
    const filteredHives = hives.filter(hive => selectedHiveIds.includes(hive.id));
    // Colors: red for temp, blue for humidity, green for air pump ON, gray for air pump OFF
    return {
      labels: filteredHives.map(hive => hive.name || `Hive ${hive.id}`),
      datasets: [
        {
          label: 'Temperature (°C)',
          data: filteredHives.map(hive => parseFloat(fakeHiveData[hive.id]?.temp || 0)),
          backgroundColor: 'rgba(169, 3, 3, 0.85)', // red
        },
        {
          label: 'Humidity (%)',
          data: filteredHives.map(hive => parseFloat(fakeHiveData[hive.id]?.humidity || 0)),
          backgroundColor: 'rgba(21, 94, 212, 0.85)', // blue
        },
        {
          label: 'Air Pump On',
          data: filteredHives.map(hive => fakeHiveData[hive.id]?.airPumpOn ? 1 : 0),
          backgroundColor: 'rgba(34,197,94,0.85)', // Always green for legend and bars by default
          borderColor: 'rgba(34,197,94,0.85)',
          segment: {
            backgroundColor: ctx => {
              const idx = ctx.p0DataIndex;
              return fakeHiveData[filteredHives[idx]?.id]?.airPumpOn ? 'rgba(34,197,94,0.85)' : 'rgba(120,120,120,0.5)';
            },
            borderColor: ctx => {
              const idx = ctx.p0DataIndex;
              return fakeHiveData[filteredHives[idx]?.id]?.airPumpOn ? 'rgba(34,197,94,0.85)' : 'rgba(120,120,120,0.5)';
            }
          },
        },
      ],
    };
  }, [hives, fakeHiveData, selectedHiveIds, theme]);

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 18 },
          color: theme === 'dark' ? '#f3f4f6' : '#222',
        },
      },
      title: {
        display: true,
        text: 'Hive Comparison (Temperature, Humidity, Air Pump)',
        font: { size: 28 },
        color: theme === 'dark' ? '#f3f4f6' : '#222',
        fontFamily: 'FreeMono, monospace',
      },
      tooltip: {
        backgroundColor: theme === 'dark' ? '#22223b' : '#fff',
        titleColor: theme === 'dark' ? '#fbbf24' : '#222',
        bodyColor: theme === 'dark' ? '#f3f4f6' : '#222',
        borderColor: theme === 'dark' ? '#fbbf24' : '#222',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Air Pump On') {
              return `${context.dataset.label}: ${context.parsed.y === 1 ? 'On' : 'Off'}`;
            }
            return `${context.dataset.label}: ${context.parsed.y}`;
          },
        },
      },
    },
    scales: {
      x: {
        ticks: {
          font: { size: 16 },
          color: theme === 'dark' ? '#f3f4f6' : '#222',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(251,191,36,0.18)' : 'rgba(0,0,0,0.08)',
        },
      },
      y: {
        beginAtZero: true,
        ticks: {
          font: { size: 16 },
          color: theme === 'dark' ? '#f3f4f6' : '#222',
        },
        grid: {
          color: theme === 'dark' ? 'rgba(251,191,36,0.13)' : 'rgba(0,0,0,0.09)',
        },
      },
    },
    barPercentage: 0.7,
    categoryPercentage: 0.7,
    backgroundColor: theme === 'dark' ? '#232323' : '#fff',
  };

  // Hive selection toggles
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 1200,
        margin: '48px auto 0 auto',
        background: theme === 'dark' ? '#191b1f' : 'var(--hive-card-bg, #F1F0F1)',
        borderRadius: 18,
        boxShadow: theme === 'dark' ? '0 4px 32px 0 #000, 0 0 0 2px #333' : '0 4px 24px 0 rgba(251,191,36,0.11)',
        padding: 32,
        border: theme === 'dark' ? '1.5px solid #27272a' : 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 32,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 20,
            marginRight: 16,
            color: theme === 'dark' ? '#fff' : '#222',
            fontFamily: 'FreeMono, monospace',
          }}
        >
          Select Hives to Compare:
        </span>
        {hives.map(hive => (
          <label
            key={hive.id}
            style={{
              marginRight: 14,
              fontFamily: 'FreeMono, monospace',
              fontSize: 17,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: theme === 'dark' ? '#fff' : '#222',
              fontWeight: 500,
            }}
          >
            <input
              type="checkbox"
              checked={selectedHiveIds.includes(hive.id)}
              onChange={() => {
                if (selectedHiveIds.includes(hive.id)) {
                  setSelectedHiveIds(selectedHiveIds.filter(id => id !== hive.id));
                } else {
                  setSelectedHiveIds([...selectedHiveIds, hive.id]);
                }
              }}
              style={{
                accentColor: theme === 'dark' ? '#fbbf24' : '#5f462e',
                width: 18,
                height: 18,
                
              }}
            />
            {hive.name || `Hive ${hive.id}`}
          </label>
        ))}
      </div>
      <Bar data={chartData} options={chartOptions} height={110} />
    </div>
  );
}

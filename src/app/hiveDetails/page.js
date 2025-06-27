'use client';

import '@/app/_lib/chartjs-setup';
import './hiveDetails.css';
import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import Image from 'next/image';
import Header from '../components/ClientComponents/Header/Header';
import { useRouter } from 'next/navigation';
import { Thermometer, Droplets, CheckCircle, RefreshCw, Trash2 } from 'lucide-react';
import FlowersRenderer from '../components/ClientComponents/FlowersRenderer/FlowersRenderer';
import RealTimeTemperatureGraph from '../components/ClientComponents/RealTimeTemperatureGraph/RealTimeTemperatureGraph';
import RealTimeHumidityGraph from '../components/ClientComponents/RealTimeHumidityGraph/RealTimeHumidityGraph';
import HistoricalDataGraph from '../components/ClientComponents/HistoricalDataGraph/HistoricalDataGraph';
import TelegramModals from '../components/ClientComponents/TelegramModals/TelegramModals';
import ClearHistoryModal from '../components/ClientComponents/ClearHistoryModal/ClearHistoryModal';
import mqtt from 'mqtt';
import { MQTT_URL } from '../_lib/mqtt-config';
import { checkMQTTMonitorStatus } from '@/app/_lib/mqtt-helpers';
import { saveTimerState, loadTimerState, clearTimerState } from '@/app/_lib/timerStorage';
import { Chart } from 'chart.js/auto';
import domtoimage from 'dom-to-image';

const MAX_DATA_POINTS = 20;


const formatTime = (date) => {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

const formatDate = (date) => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};


const HiveDetails = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hiveId = searchParams.get('id');
  const email = searchParams.get('email');
  const hiveName = searchParams.get('name') || `Hive ${hiveId}`;
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();
  const [airPumpDate, setAirPumpDate] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [sending, setSending] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(null);
  const [isAirPumpActive, setIsAirPumpActive] = useState(false);
  const [showTelegramSetupModal, setShowTelegramSetupModal] = useState(false);
  const [showTelegramErrorModal, setShowTelegramErrorModal] = useState(false);
  const [telegramErrorMessage, setTelegramErrorMessage] = useState('');
  const [showChatIdInputModal, setShowChatIdInputModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [inputChatId, setInputChatId] = useState('');
  const startTime = useRef(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const intervalIdRef = useRef(null);
  const [hiveData, setHiveData] = useState({
    name: `Hive ${hiveId}`,
    temperature: null,
    humidity: null,
    airPump: "OFF" 
  });  

  const [airPumpActivations, setAirPumpActivations] = useState(() => {
    
    if (typeof window !== 'undefined') {
      try {
        const savedActivations = localStorage.getItem(`airPumpActivations_${hiveId}`);
        if (savedActivations) {
          return JSON.parse(savedActivations);
        }
      } catch (e) {
        console.error('Error loading activations from localStorage:', e);
      }
    }
    return [];
  });
  

  useEffect(() => {
    if (typeof window !== 'undefined' && airPumpActivations.length > 0) {
      try {
        localStorage.setItem(`airPumpActivations_${hiveId}`, JSON.stringify(airPumpActivations));
      } catch (e) {
        console.error('Error saving activations to localStorage:', e);
      }
    }
  }, [airPumpActivations, hiveId]);
  
  // Effect to monitor changes in airPump status from MQTT
  useEffect(() => {
    if (hiveData.airPump === "ON" && !isAirPumpActive) {
      startTimer();
    } else if (hiveData.airPump === "OFF" && isAirPumpActive) {
      console.log("Air pump turned OFF - stopping timer");
      stopTimer();
    }
  }, [hiveData.airPump, isAirPumpActive]);
  
  useEffect(() => {
    // Fetch existing air pump activations on component mount
    const fetchAirPumpActivations = async () => {
      try {
        console.log(`Fetching air pump activations for hiveId: ${hiveId}, email: ${encodeURIComponent(email)}`);
        const response = await fetch(`/api/airpump?hiveId=${hiveId}&email=${encodeURIComponent(email)}`);
        
        console.log("API response status:", response.status);
        if (response.ok) {
          const data = await response.json();
          console.log("Fetched air pump activations:", data);
          if (data.activations && Array.isArray(data.activations)) {
            console.log(`Retrieved ${data.activations.length} activations`);
            setAirPumpActivations(data.activations);
          } else {
            console.warn("Invalid activations data:", data);
            // Initialize with empty array if data is invalid
            setAirPumpActivations([]);
          }
        } else {
          try {
            const errorText = await response.text();
            console.error(`Error fetching activations: ${response.status} ${errorText}`);
          } catch (textError) {
            console.error(`Error reading error response: ${textError}`);
          }
          // Initialize with empty array on error
          setAirPumpActivations([]);
        }
      } catch (error) {
        console.error('Error fetching air pump activations:', error);
        // Initialize with empty array on error
        setAirPumpActivations([]);
      }
    };
    
    if (hiveId && email) {
      fetchAirPumpActivations();
    } else {
      console.warn("Missing hiveId or email for activations fetch:", { hiveId, email });
    }
  }, [hiveId, email]);

  // When component mounts, load saved timer state
  useEffect(() => {
    if (mounted && hiveId) {
      const savedState = loadTimerState(hiveId);
      
      if (savedState && savedState.isActive) {
        console.log("Restoring saved timer state:", savedState);
        startTime.current = savedState.startTime;
        setIsAirPumpActive(true);
        setElapsedTime(savedState.elapsedTime);
        setAirPumpDate(new Date(savedState.startTime));
      }
    }
  }, [mounted, hiveId]);

  const startTimer = () => {
    setIsAirPumpActive(true);
    const now = new Date();
    const startTimeMs = now.getTime();
    startTime.current = startTimeMs;
    setElapsedTime(0);
    setAirPumpDate(now); 
    saveTimerState(hiveId, true, startTimeMs, "ON");    
  }

  const stopTimer = () => {
    console.log("Stopping air pump timer");
    if (!isAirPumpActive) {
      console.log("Timer not active, nothing to stop");
      return;
    }
    
    setIsAirPumpActive(false);
    
    // Get the stored airPumpDate or use a fallback
    const startDate = airPumpDate || new Date(startTime.current);
    console.log("Using start date:", startDate.toISOString());
    
    // Calculate final duration
    const duration = Date.now() - startTime.current;
    console.log("Timer duration:", duration, "ms");
    setElapsedTime(duration);
    
    // Format for display and save to MongoDB
    const formattedDuration = formatTimerOutput(duration);
    const formattedDate = formatActivationDate(startDate);
    
    console.log("Saving activation with date:", formattedDate, "duration:", formattedDuration);
    
    // Clear timer state in localStorage
    clearTimerState(hiveId);
    
    // Save to MongoDB
    saveAirPumpActivation(formattedDate, formattedDuration);
  }

  const formatTimerOutput = (timeInMs) => {
    let hours = Math.floor(timeInMs / (1000 * 60 * 60));
    let minutes = Math.floor(timeInMs / (1000 * 60) % 60);
    let seconds = Math.floor(timeInMs / (1000) % 60);

    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
  
  const formatActivationDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
  
  const formatElapsedTime = () => {
    let hours = Math.floor(elapsedTime / (1000 * 60 * 60));
    let minutes = Math.floor(elapsedTime / (1000 * 60) % 60);
    let seconds = Math.floor(elapsedTime / (1000) % 60);

    hours = hours.toString().padStart(2, '0');
    minutes = minutes.toString().padStart(2, '0');
    seconds = seconds.toString().padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
  }
  
  
  const saveAirPumpActivation = async (date, duration) => {
    console.log("Saving air pump activation");
    
    if (!date || !duration) {
      console.error("Missing required data for air pump activation:", { date, duration });
      return;
    }
    
    const activation = {
      date,
      duration,
      timestamp: new Date().toISOString()
    };
    
    setAirPumpActivations(prev => [activation, ...prev]);
    
    // Save to localStorage for persistence
    try {
      const localActivations = [activation, ...airPumpActivations];
      localStorage.setItem(`airPumpActivations_${hiveId}`, JSON.stringify(localActivations));
    } catch (storageError) {
      console.error("Error saving to localStorage:", storageError);
    }
    
    if (!hiveId || !email) {
      console.error("Missing hiveId or email for MongoDB save:", { hiveId, email });
      return;
    }
    
    try {
      const payload = {
        hiveId: hiveId,
        email: email,
        username: searchParams.get('username'),
        date: date,
        duration: duration
      };
      
      console.log("Sending payload to MongoDB:", payload);
      
      const response = await fetch('/api/airpump', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      console.log("Received response status:", response.status);
      
      if (response.ok) {
        try {
          const data = await response.json();
          console.log("Air pump activation saved to MongoDB:", data);
        } catch (jsonError) {
          console.error("Error parsing JSON response:", jsonError);
        }
      } else {
        try {
          const errorText = await response.text();
          console.error("Server error saving air pump activation. Status:", response.status, "Error:", errorText);
          try {
            // Try to parse as JSON if possible
            const errorData = JSON.parse(errorText);
            console.error("Parsed error data:", errorData);
          } catch (jsonError) {
            // Not JSON, just log the text
            console.error("Raw error response:", errorText);
          }
        } catch (textError) {
          console.error("Could not read error response:", textError);
        }
      }
    } catch (error) {
      console.error('Network error saving air pump activation:', error);
    }
  }

  // Update timer state when active status changes
  useEffect(() => {
    if (isAirPumpActive) {
      intervalIdRef.current = setInterval(() => {
        const currentElapsed = Date.now() - startTime.current;
        setElapsedTime(currentElapsed);
        
        // Periodically update saved timer state (every 30 seconds)
        if (currentElapsed % 30000 < 100) {
          saveTimerState(hiveId, true, startTime.current, "ON");
        }
      }, 10);
    } else {
      clearInterval(intervalIdRef.current);
    }
    return () => clearInterval(intervalIdRef.current);
  }, [isAirPumpActive, hiveId]);

  const [successMessage, setSuccessMessage] = useState('');
  
  const [autoReporting, setAutoReporting] = useState(false);
  
  const [isScheduleActive, setIsScheduleActive] = useState(false);

  // Fetch user's Telegram chat ID when component mounts
  useEffect(() => {
    const fetchTelegramChatId = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`/api/auth/telegram?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        if (data.telegramChatId) {
          setTelegramChatId(data.telegramChatId);
          setIsScheduleActive(true);
          setAutoReporting(true);
        }
      } catch (error) {
        console.error('Error fetching Telegram chat ID:', error);
      }
    };
    
    fetchTelegramChatId();
  }, [email]);



  const handleSetupTelegram = () => {
    setShowChatIdInputModal(true);
  };

  // Add handler for chat ID submission
  const handleChatIdSubmit = () => {
    if (!inputChatId) {
      setShowChatIdInputModal(false);
      return;
    }
    
    // Validate chat ID (should be a number)
    if (!/^-?\d+$/.test(inputChatId)) {
      setTelegramErrorMessage('Telegram chat ID must be a number. Please try again.');
      setShowTelegramErrorModal(true);
      setShowChatIdInputModal(false);
      return;
    }
    
    // Save to database
    fetch('/api/auth/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        telegramChatId: inputChatId
      }),
    })
    .then(response => response.json())
    .then(data => {
      if (data.success) {
        setTelegramChatId(inputChatId);
        setTelegramErrorMessage('Telegram chat ID saved successfully!');
        setShowTelegramErrorModal(true);
      } else {
        setTelegramErrorMessage('Failed to save Telegram chat ID: ' + (data.error || 'Unknown error'));
        setShowTelegramErrorModal(true);
      }
    })
    .catch(error => {
      console.error('Error saving Telegram chat ID:', error);
      setTelegramErrorMessage('Error saving Telegram chat ID');
      setShowTelegramErrorModal(true);
    })
    .finally(() => {
      setShowChatIdInputModal(false);
      setInputChatId('');
    });
  };

  // Extract the report sending logic to a separate function
  const sendReport = async (isAutoReport = false) => {
    if (!telegramChatId) return;
    
    setSending(true);
    try {
      const username = searchParams.get('username') || 'User';
      
      // Get the chart containers
      const tempChartContainer = document.querySelector('#temperature-chart');
      const humidityChartContainer = document.querySelector('#humidity-chart');
      
      // Use domtoimage to capture the entire chart containers
      let tempChartBase64 = null;
      let humidityChartBase64 = null;
      
      try {
        if (tempChartContainer) {
          const tempDataUrl = await domtoimage.toPng(tempChartContainer, {
            bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
            style: {
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff'
            },
            width: tempChartContainer.offsetWidth,
            height: tempChartContainer.offsetHeight,
            filter: (node) => {
              return !node.classList?.contains('export-button') && !node.classList?.contains('export-dropdown');
            }
          });
          tempChartBase64 = tempDataUrl.split(',')[1];
        }
        
        if (humidityChartContainer) {
          const humidityDataUrl = await domtoimage.toPng(humidityChartContainer, {
            bgcolor: theme === 'dark' ? '#1e293b' : '#ffffff',
            style: {
              backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff'
            },
            width: humidityChartContainer.offsetWidth,
            height: humidityChartContainer.offsetHeight,
            filter: (node) => {
              return !node.classList?.contains('export-button') && !node.classList?.contains('export-dropdown');
            }
          });
          humidityChartBase64 = humidityDataUrl.split(',')[1];
        }
      } catch (imageError) {
        console.error('Error capturing chart images:', imageError);
      }
      
      const response = await fetch('/api/send-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          hiveId: hiveId,
          temperature: hiveData.temperature,
          humidity: hiveData.humidity,
          chatId: telegramChatId,
          username: username,
          autoReport: isAutoReport,
          reportType: isAutoReport ? "Automatic In-App Report" : "Manual User Requested Report",
          airPumpStatus: hiveData.airPump || "OFF",
          tempChartBase64,
          humidityChartBase64
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        if (!isAutoReport) {
          setSuccessMessage('Hive report sent to your Telegram successfully!');
          // Hide the message after 5 seconds
          setTimeout(() => {
            if (successMessage === 'Hive report sent to your Telegram successfully!') {
              setSuccessMessage('');
            }
          }, 5000);
        }
      } else {
        if (!isAutoReport) {
          setTelegramErrorMessage('Failed to send Telegram message. Please check your chat ID and try again.');
          setShowTelegramErrorModal(true);
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setSending(false);
      setTelegramErrorMessage('Failed to send report. Please try again later.');
      setShowTelegramErrorModal(true);
    } finally {
      setSending(false);
    }
  };

  const handleSendTelegram = () => {
    if (!telegramChatId) {
      // Instead of confirm dialog, show our custom modal
      setShowTelegramSetupModal(true);
      return;
    }
    
    // Explicitly set autoReporting to false for manual reports
    setAutoReporting(false);
    sendReport(false); 
  };

  const handleModalOverlayClick = (e) => {
    // Only close if the click is directly on the overlay, not its children
    if (e.target.className.includes('modal-overlay')) {
      setShowTelegramSetupModal(false);
      setShowTelegramErrorModal(false);
      setShowChatIdInputModal(false);
    }
  };

  const [summaryDateRange, setSummaryDateRange] = useState('lastWeek');
  const [historicalDateRange, setHistoricalDateRange] = useState('lastWeek');
  
  // Initialize state for historical data with empty datasets
  const [historicalData, setHistoricalData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [],
        borderColor: '#ba6719',
        backgroundColor: '#ba6719',
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
        fill: false,
        yAxisID: 'y'
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: '#0EA5E9',
        backgroundColor: '#0EA5E9',
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
        fill: false,
        yAxisID: 'y2'
      }
    ]
  });
  
  // Load saved historical data on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && hiveId) {
      const savedData = localStorage.getItem(`historicalData_hive_${hiveId}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          if (parsedData.labels && parsedData.datasets) {
            setHistoricalData(parsedData);
          }
        } catch (e) {
          console.error('Error loading historical data', e);
        }
      }
    }
  }, [hiveId]);

  // Add useEffect to save historical data whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && historicalData) {
      localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(historicalData));
    }
  }, [historicalData, hiveId]);

  // Clean up old historical data on component mount
  useEffect(() => {
    // Simple cleanup of data older than 30 days
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem(`historicalData_hive_${hiveId}`);
      if (savedData) {
        try {
          const data = JSON.parse(savedData);
          if (data.labels && data.labels.length > 30) {
            // Keep only the last 30 days of data
            const newData = {
              labels: data.labels.slice(-30),
              datasets: data.datasets.map(dataset => ({
                ...dataset,
                data: dataset.data.slice(-30)
              }))
            };
            localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(newData));
            setHistoricalData(newData);
          }
        } catch (e) {
          console.error('Error cleaning up historical data', e);
        }
      }
    }
  }, [hiveId]);

  // Add new state for summary data
  const [summaryData, setSummaryData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Temperature (°C)',
        data: [],
        borderColor: '#ba6719',
        backgroundColor: '#ba6719',
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
        fill: false
      },
      {
        label: 'Humidity (%)',
        data: [],
        borderColor: '#0EA5E9',
        backgroundColor: '#0EA5E9',
        tension: 0.4,
        pointRadius: 2,
        borderWidth: 2,
        fill: false,
        yAxisID: 'humidity'
      }
    ]
  });

  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [activeMetrics, setActiveMetrics] = useState({
    temperature: true,
    humidity: true
  });

  // Initialize with some data points
  const initialTemp = 30;
  const initialHumidity = 50;
  
  // State for chart data
  const [temperatureData, setTemperatureData] = useState({
    labels: Array(MAX_DATA_POINTS).fill('').map((_, i) => {
      const date = new Date();
      date.setSeconds(date.getSeconds() - (MAX_DATA_POINTS - 1 - i));
      return formatTime(date);
    }),
    datasets: [{
      label: 'Temperature (°C)',
      data: Array(MAX_DATA_POINTS).fill(initialTemp),
      borderColor: '#ba6719',
      backgroundColor: '#ba6719',
      tension: 0.4,
      pointRadius: 3,
      borderWidth: 2,
      fill: false
    }]
  });

  const [humidityData, setHumidityData] = useState({
    labels: Array(MAX_DATA_POINTS).fill('').map((_, i) => {
      const date = new Date();
      date.setSeconds(date.getSeconds() - (MAX_DATA_POINTS - 1 - i));
      return formatTime(date);
    }),
    datasets: [{
      label: 'Humidity (%)',
      data: Array(MAX_DATA_POINTS).fill(initialHumidity),
      borderColor: '#0EA5E9',
      backgroundColor: '#0EA5E9',
      tension: 0.4,
      pointRadius: 3,
      borderWidth: 2,
      fill: false
    }]
  });

  // Chart options
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
          precision: 2, // Set precision to ensure consistent decimal places
          callback: function(value) {
            return value.toFixed(2);
          }
        },
        // Improve y-axis scaling to better reflect data
        suggestedMin: function(context) {
          if (!context.chart.data.datasets[0].data || context.chart.data.datasets[0].data.length === 0) {
            return 0;
          }
          const dataMin = Math.min(...context.chart.data.datasets[0].data.filter(v => v !== null && v !== undefined));
          // Ensure min is below the data minimum
          return dataMin - Math.max(0.5, dataMin * 0.03);
        },
        suggestedMax: function(context) {
          if (!context.chart.data.datasets[0].data || context.chart.data.datasets[0].data.length === 0) {
            return 100;
          }
          const dataMax = Math.max(...context.chart.data.datasets[0].data.filter(v => v !== null && v !== undefined));
          // Ensure max is above the data maximum
          return dataMax + Math.max(0.5, dataMax * 0.03);
        }
      },
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          }
        }
      }
    },
    plugins: {
      legend: {
        labels: {
          color: theme === 'dark' ? '#fff' : '#000',
          font: {
            family: 'FreeMono, monospace'
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: theme === 'dark' ? '#1E293B' : 'white',
        titleColor: theme === 'dark' ? '#fff' : '#000',
        bodyColor: theme === 'dark' ? '#fff' : '#000',
        borderColor: theme === 'dark' ? '#fff' : '#000',
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  // Function to handle custom date changes
  const handleCustomDateChange = (isStartDate, value) => {
    if (isStartDate) {
      setCustomStartDate(value);
      if (customEndDate && value) {
        updateHistoricalData('custom', new Date(value), new Date(customEndDate));
      }
    } else {
      setCustomEndDate(value);
      if (customStartDate && value) {
        updateHistoricalData('custom', new Date(customStartDate), new Date(value));
      }
    }
  };

  // Initialize state for daily statistics
  const [dailyStats, setDailyStats] = useState({
    temperature: {
      min: null,
      max: null,
      sum: 0,
      count: 0,
      avg: null
    },
    humidity: {
      min: null,
      max: null,
      sum: 0,
      count: 0,
      avg: null
    },
    lastReset: new Date().setHours(0, 0, 0, 0)
  });

  // Initialize analysis data
  const [analysisData, setAnalysisData] = useState({
    tempAvg: null,
    tempMin: null,
    tempMax: null,
    humidityAvg: null,
    humidityMin: null,
    humidityMax: null
  });

  // Add new state for storing historical maximums
  const [historicalMaximums, setHistoricalMaximums] = useState(() => {
    // Try to load saved data from localStorage when component initializes
    if (typeof window !== 'undefined') {
      const savedData = localStorage.getItem('historicalMaximums');
      if (savedData) {
        return JSON.parse(savedData);
      }
    }
    return {
      daily: {}, 
      monthly: {} 
    };
  });

  // Add useEffect to save to localStorage whenever historicalMaximums changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('historicalMaximums', JSON.stringify(historicalMaximums));
    }
  }, [historicalMaximums]);

  // Function to update historical maximums
  const updateHistoricalMaximums = (value, type) => {
    const now = new Date();
    const dateKey = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const monthKey = dateKey.substring(0, 7); // YYYY-MM

    setHistoricalMaximums(prev => {
      // Load current data from localStorage as well
      const currentData = typeof window !== 'undefined' 
        ? JSON.parse(localStorage.getItem('historicalMaximums')) || prev 
        : prev;

      // Update daily maximum
      const dailyData = currentData.daily[dateKey] || { temperature: -Infinity, humidity: -Infinity };
      
      // Update monthly maximum
      const monthlyData = currentData.monthly[monthKey] || { temperature: -Infinity, humidity: -Infinity };

      let shouldUpdate = false;

      if (type === 'temperature') {
        if (value > dailyData.temperature) {
          dailyData.temperature = value;
          shouldUpdate = true;
        }
        if (value > monthlyData.temperature) {
          monthlyData.temperature = value;
          shouldUpdate = true;
        }
      } else if (type === 'humidity') {
        if (value > dailyData.humidity) {
          dailyData.humidity = value;
          shouldUpdate = true;
        }
        if (value > monthlyData.humidity) {
          monthlyData.humidity = value;
          shouldUpdate = true;
        }
      }

      const newState = {
        daily: {
          ...currentData.daily,
          [dateKey]: dailyData
        },
        monthly: {
          ...currentData.monthly,
          [monthKey]: monthlyData
        }
      };

      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('historicalMaximums', JSON.stringify(newState));
      }

      // If we have a new maximum, trigger an update of the historical data
      if (shouldUpdate) {
        // Use setTimeout to ensure state update happens first
        setTimeout(() => {
          updateHistoricalData(historicalDateRange, null, null, 'historical');
          updateHistoricalData(summaryDateRange, null, null, 'summary');
        }, 0);
      }

      return newState;
    });
  };

  // Update the updateHistoricalData function
  const updateHistoricalData = (range, customStart = null, customEnd = null, forComponent = 'historical') => {
    let startDate = new Date();
    let endDate = new Date();

    switch (range) {
      case 'lastWeek':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'lastMonth':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'lastYear':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case 'custom':
        if (customStart && customEnd) {
          startDate = customStart;
          endDate = customEnd;
        } else {
          return;
        }
        break;
    }

    // Update the appropriate state based on the component
    if (forComponent === 'summary') {
      setSummaryDateRange(range);
    } else if (forComponent === 'historical') {
      setHistoricalDateRange(range);
    }

    // Convert historical maximums to array format
    let filteredData = [];
    
    if (range === 'lastYear') {
      // Use monthly data for yearly view
      Object.entries(historicalMaximums.monthly || {}).forEach(([monthKey, data]) => {
        const date = new Date(monthKey + '-01'); // First day of month
        if (date >= startDate && date <= endDate) {
          filteredData.push({
            date,
            temperature: data.temperature === -Infinity ? null : data.temperature,
            humidity: data.humidity === -Infinity ? null : data.humidity
          });
        }
      });
    } else {
      // Use daily data for week and month views
      Object.entries(historicalMaximums.daily || {}).forEach(([dateKey, data]) => {
        const date = new Date(dateKey);
        if (date >= startDate && date <= endDate) {
          filteredData.push({
            date,
            temperature: data.temperature === -Infinity ? null : data.temperature,
            humidity: data.humidity === -Infinity ? null : data.humidity
          });
        }
      });
    }

    // Sort by date
    filteredData.sort((a, b) => a.date - b.date);

    // Create the new data object with proper dataset configuration
    const newData = {
      labels: filteredData.map(data => 
        range === 'lastYear' 
          ? data.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
          : data.date.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric'
            })
      ),
      datasets: [
        ...(activeMetrics.temperature ? [{
          label: 'Temperature (°C)',
          data: filteredData.map(data => data.temperature),
          borderColor: '#ba6719',
          backgroundColor: '#ba6719',
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2,
          fill: false,
          yAxisID: 'y',
          spanGaps: true
        }] : []),
        ...(activeMetrics.humidity ? [{
          label: 'Humidity (%)',
          data: filteredData.map(data => data.humidity),
          borderColor: '#0EA5E9',
          backgroundColor: '#0EA5E9',
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 2,
          fill: false,
          yAxisID: 'y2',
          spanGaps: true
        }] : [])
      ]
    };



    // Update the appropriate data state based on the component
    if (forComponent === 'summary') {
      setSummaryData(newData);
    } else {
      setHistoricalData(newData);
    }

    // Calculate statistics if needed
    if (forComponent === 'summary' && filteredData.length > 0) {
      const stats = filteredData.reduce((acc, curr) => {
        if (curr.temperature !== null) {
          acc.tempSum += curr.temperature;
          acc.tempCount++;
          acc.tempMin = Math.min(acc.tempMin, curr.temperature);
          acc.tempMax = Math.max(acc.tempMax, curr.temperature);
        }
        if (curr.humidity !== null) {
          acc.humiditySum += curr.humidity;
          acc.humidityCount++;
          acc.humidityMin = Math.min(acc.humidityMin, curr.humidity);
          acc.humidityMax = Math.max(acc.humidityMax, curr.humidity);
        }
        return acc;
      }, {
        tempSum: 0,
        humiditySum: 0,
        tempCount: 0,
        humidityCount: 0,
        tempMin: Infinity,
        tempMax: -Infinity,
        humidityMin: Infinity,
        humidityMax: -Infinity
      });

      setAnalysisData({
        tempAvg: stats.tempCount > 0 ? Number((stats.tempSum / stats.tempCount).toFixed(1)) : null,
        tempMin: stats.tempMin !== Infinity ? Number(stats.tempMin.toFixed(1)) : null,
        tempMax: stats.tempMax !== -Infinity ? Number(stats.tempMax.toFixed(1)) : null,
        humidityAvg: stats.humidityCount > 0 ? Number((stats.humiditySum / stats.humidityCount).toFixed(1)) : null,
        humidityMin: stats.humidityMin !== Infinity ? Number(stats.humidityMin.toFixed(1)) : null,
        humidityMax: stats.humidityMax !== -Infinity ? Number(stats.humidityMax.toFixed(1)) : null
      });
    }
  };

  // Update historical data when date range changes
  useEffect(() => {
    updateHistoricalData(historicalDateRange, null, null, 'historical');
  }, [historicalDateRange]);

  // Update summary data when its date range changes
  useEffect(() => {
    updateHistoricalData(summaryDateRange, null, null, 'summary');
  }, [summaryDateRange]);

  // Historical chart options
  const historicalChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 750
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        mode: 'nearest',
        intersect: true,
        backgroundColor: theme === 'dark' ? '#1E293B' : 'white',
        titleColor: theme === 'dark' ? '#fff' : '#000',
        bodyColor: theme === 'dark' ? '#fff' : '#000',
        borderColor: theme === 'dark' ? '#fff' : '#000',
        borderWidth: 1,
        callbacks: {
          title: function(context) {
            if (context[0]) {
              return context[0].label;
            }
            return '';
          },
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: 'linear',
        display: activeMetrics.temperature,
        position: 'left',
        title: {
          display: true,
          text: 'Temperature (°C)',
          color: theme === 'dark' ? '#fff' : '#000'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
          precision: 2, // Set precision to ensure consistent decimal places
          callback: function(value) {
            return value.toFixed(1);
          }
        },
        // Remove fixed min and max to allow autoScaling
        beginAtZero: false,
        // Improve y-axis scaling for temperature
        suggestedMin: function(context) {
          const validData = context.chart.data.datasets.find(d => d.label.includes('Temperature'))?.data.filter(v => v !== null && v !== undefined) || [];
          if (validData.length === 0) return undefined;
          
          const dataMin = Math.min(...validData);
          return dataMin - Math.max(0.5, dataMin * 0.03); // At least 0.5 units or 3% padding below min value
        },
        suggestedMax: function(context) {
          const validData = context.chart.data.datasets.find(d => d.label.includes('Temperature'))?.data.filter(v => v !== null && v !== undefined) || [];
          if (validData.length === 0) return undefined;
          
          const dataMax = Math.max(...validData);
          return dataMax + Math.max(0.5, dataMax * 0.03); // At least 0.5 units or 3% padding above max value
        }
      },
      y2: {
        type: 'linear',
        display: activeMetrics.humidity,
        position: 'right',
        title: {
          display: true,
          text: 'Humidity (%)',
          color: theme === 'dark' ? '#fff' : '#000'
        },
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          drawOnChartArea: true
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
          precision: 2, // Set precision to ensure consistent decimal places
          callback: function(value) {
            return value.toFixed(1);
          }
        },
        // Remove fixed min and max to allow autoScaling
        beginAtZero: false,
        // Improve y-axis scaling for humidity
        suggestedMin: function(context) {
          const validData = context.chart.data.datasets.find(d => d.label.includes('Humidity'))?.data.filter(v => v !== null && v !== undefined) || [];
          if (validData.length === 0) return undefined;
          
          const dataMin = Math.min(...validData);
          // Ensure at least 1% padding below min value but not less than 0
          return Math.max(dataMin - Math.max(1, dataMin * 0.03), 0);
        },
        suggestedMax: function(context) {
          const validData = context.chart.data.datasets.find(d => d.label.includes('Humidity'))?.data.filter(v => v !== null && v !== undefined) || [];
          if (validData.length === 0) return undefined;
          
          const dataMax = Math.max(...validData);
          // Ensure at least 1% padding above max value but not more than 100
          return Math.min(dataMax + Math.max(1, dataMax * 0.03), 100);
        }
      },
      x: {
        grid: {
          color: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          color: theme === 'dark' ? '#fff' : '#000',
          maxRotation: 45,
          minRotation: 45,
          font: {
            size: 11
          }
        }
      }
    },
    elements: {
      line: {
        tension: 0.4
      },
      point: {
        radius: 4,
        hitRadius: 10,
        hoverRadius: 6
      }
    }
  };

  // Update historical data when activeMetrics changes
  useEffect(() => {
    updateHistoricalData(historicalDateRange, null, null, 'historical');
  }, [historicalDateRange, activeMetrics]);

  useEffect(() => {
    setMounted(true);

    // Try to get pre-loaded data from localStorage
    const storedData = localStorage.getItem(`hiveData_${hiveId}`);
    if (storedData) {
      const { data } = JSON.parse(storedData);
      setHiveData(data);
    }

    // Get the user's username from URL parameters or sessionStorage
    const userNameForTopic = searchParams.get('username') || sessionStorage.getItem('username');
    if (!userNameForTopic) {
        console.error('No username found for MQTT topics');
        return;
    }

    // Define topics before MQTT setup
    const tempTopic = `${userNameForTopic}/moldPrevention/hive${hiveId}/temp`;
    const humidityTopic = `${userNameForTopic}/moldPrevention/hive${hiveId}/humidity`;
    const airPumpTopic = `${userNameForTopic}/moldPrevention/hive${hiveId}/airPump`;

    // MQTT client setup with WebSocket
    const client = mqtt.connect(MQTT_URL, {
        clientId: `hiveguard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 1000,
        connectTimeout: 30 * 1000
    });

    let isConnected = false;

    client.on('connect', () => {
        isConnected = true;
        // Subscribe to topics using the user's password as namespace
        client.subscribe([tempTopic, humidityTopic, airPumpTopic], (err) => { 
            if (!err) {
                console.log('Subscribed to topics:', tempTopic, humidityTopic, airPumpTopic);
            } else {
                console.error('Failed to subscribe to topics:', err);
            }
        });
    });

    client.on('message', (topic, message) => {
        if (!isConnected) return;
          
        const now = new Date();
        const currentTime = formatTime(now);
        const currentDate = formatDate(now);

        if (topic === airPumpTopic) {
            const status = message.toString();            
            setHiveData(prev => ({ ...prev, airPump: status }));
            
            // Update timer state in localStorage
            if (status === "ON") {
                if (!isAirPumpActive) {
                    // Don't override existing timer if already running
                    // The useEffect will handle starting the timer
                } else {
                    // Update status for existing timer
                    saveTimerState(hiveId, true, startTime.current, "ON");
                }
            } else {
                // Status is OFF, timer will be cleared in the useEffect
            }
            
            return;
        }

        

        
        // For temperature and humidity, parse as float
        const value = parseFloat(message.toString());
        if (isNaN(value)) {
            console.error('Received invalid numeric value:', message.toString());
            return;
        }

        // Now tempTopic and humidityTopic are in scope
        if (topic === tempTopic) {
            console.log('Updating temperature value:', value);
            setHiveData(prev => ({ ...prev, temperature: value }));
            
            // Update temperature chart data
            setTemperatureData(prev => {
                const newLabels = [...prev.labels.slice(1), currentTime];
                const newData = [...prev.datasets[0].data.slice(1), value];
                return {
                    labels: newLabels,
                    datasets: [{
                        ...prev.datasets[0],
                        data: newData
                    }]
                };
            });

            // Update historical data for temperature
            setHistoricalData(prev => {
                if (!prev || !prev.labels || !prev.datasets) {
                    const initialState = {
                        labels: [currentDate],
                        datasets: [
                            {
                                label: 'Temperature (°C)',
                                data: [value],
                                borderColor: '#ba6719',
                                backgroundColor: '#ba6719',
                                tension: 0.4,
                                pointRadius: 2,
                                borderWidth: 2,
                                fill: false,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Humidity (%)',
                                data: [null],
                                borderColor: '#0EA5E9',
                                backgroundColor: '#0EA5E9',
                                tension: 0.4,
                                pointRadius: 2,
                                borderWidth: 2,
                                fill: false,
                                yAxisID: 'y2'
                            }
                        ]
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(initialState));
                    return initialState;
                }

                // Find if we already have data for today
                const todayIndex = prev.labels.indexOf(currentDate);
                
                if (todayIndex === -1) {
                    // If no data for today, add new entry
                    const newState = {
                        labels: [...prev.labels, currentDate],
                        datasets: prev.datasets.map(dataset => {
                            if (dataset.label.includes('Temperature')) {
                                return {
                                    ...dataset,
                                    data: [...dataset.data, value]
                                };
                            }
                            if (dataset.label.includes('Humidity')) {
                                return {
                                    ...dataset,
                                    data: [...dataset.data, null]
                                };
                            }
                            return dataset;
                        })
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(newState));
                    return newState;
                } else {
                    // Always update the temperature value for today
                    const newState = {
                        ...prev,
                        datasets: prev.datasets.map(dataset => {
                            if (dataset.label.includes('Temperature')) {
                                const newData = [...dataset.data];
                                // Update the value if it's higher than the current maximum
                                newData[todayIndex] = Math.max(newData[todayIndex] || -Infinity, value);
                                return {
                                    ...dataset,
                                    data: newData
                                };
                            }
                            return dataset;
                        })
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(newState));
                    return newState;
                }
            });

        } else if (topic === humidityTopic) {
            console.log('Updating humidity value:', value);
            setHiveData(prev => ({ ...prev, humidity: value }));
            
            // Update humidity chart data
            setHumidityData(prev => {
                const newLabels = [...prev.labels.slice(1), currentTime];
                const newData = [...prev.datasets[0].data.slice(1), value];
                return {
                    labels: newLabels,
                    datasets: [{
                        ...prev.datasets[0],
                        data: newData
                    }]
                };
            });

            // Update historical data for humidity
            setHistoricalData(prev => {
                if (!prev || !prev.labels || !prev.datasets) {
                    const initialState = {
                        labels: [currentDate],
                        datasets: [
                            {
                                label: 'Temperature (°C)',
                                data: [null],
                                borderColor: '#ba6719',
                                backgroundColor: '#ba6719',
                                tension: 0.4,
                                pointRadius: 2,
                                borderWidth: 2,
                                fill: false,
                                yAxisID: 'y'
                            },
                            {
                                label: 'Humidity (%)',
                                data: [value],
                                borderColor: '#0EA5E9',
                                backgroundColor: '#0EA5E9',
                                tension: 0.4,
                                pointRadius: 2,
                                borderWidth: 2,
                                fill: false,
                                yAxisID: 'y2'
                            }
                        ]
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(initialState));
                    return initialState;
                }

                // Find if we already have data for today
                const todayIndex = prev.labels.indexOf(currentDate);
                
                if (todayIndex === -1) {
                    // If no data for today, add new entry
                    const newState = {
                        labels: [...prev.labels, currentDate],
                        datasets: prev.datasets.map(dataset => {
                            if (dataset.label.includes('Humidity')) {
                                return {
                                    ...dataset,
                                    data: [...dataset.data, value]
                                };
                            }
                            if (dataset.label.includes('Temperature')) {
                                return {
                                    ...dataset,
                                    data: [...dataset.data, null]
                                };
                            }
                            return dataset;
                        })
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(newState));
                    return newState;
                } else {
                    // Always update the humidity value for today
                    const newState = {
                        ...prev,
                        datasets: prev.datasets.map(dataset => {
                            if (dataset.label.includes('Humidity')) {
                                const newData = [...dataset.data];
                                // Update the value if it's higher than the current maximum
                                newData[todayIndex] = Math.max(newData[todayIndex] || -Infinity, value);
                                return {
                                    ...dataset,
                                    data: newData
                                };
                            }
                            return dataset;
                        })
                    };
                    localStorage.setItem(`historicalData_hive_${hiveId}`, JSON.stringify(newState));
                    return newState;
                }
            });
        }

        // Update daily stats
        setDailyStats(prev => {
            const startOfDay = now.setHours(0, 0, 0, 0);

            // Reset stats if it's a new day
            if (startOfDay !== prev.lastReset) {
                return {
                    temperature: {
                        min: topic === tempTopic ? value : null,
                        max: topic === tempTopic ? value : null,
                        sum: topic === tempTopic ? value : 0,
                        count: topic === tempTopic ? 1 : 0,
                        avg: topic === tempTopic ? value : null
                    },
                    humidity: {
                        min: topic === humidityTopic ? value : null,
                        max: topic === humidityTopic ? value : null,
                        sum: topic === humidityTopic ? value : 0,
                        count: topic === humidityTopic ? 1 : 0,
                        avg: topic === humidityTopic ? value : null
                    },
                    lastReset: startOfDay
                };
            }

            // Update the appropriate metric
            const newStats = { ...prev };
            const metric = topic === tempTopic ? 'temperature' : 'humidity';
            
            if (newStats[metric]) {
                newStats[metric] = {
                    min: Math.min(newStats[metric].min ?? value, value),
                    max: Math.max(newStats[metric].max ?? value, value),
                    sum: (newStats[metric].sum ?? 0) + value,
                    count: (newStats[metric].count ?? 0) + 1,
                    avg: 0
                };
                newStats[metric].avg = newStats[metric].sum / newStats[metric].count;
            }

            return newStats;
        });

        updateHistoricalMaximums(value, topic === tempTopic ? 'temperature' : 'humidity');
    });

    client.on('error', (err) => {
      console.error('MQTT Error:', err);
      isConnected = false;
    });

    client.on('disconnect', () => {
      console.log('Disconnected from MQTT broker');
      isConnected = false;
    });

    client.on('reconnect', () => {
      console.log('Attempting to reconnect to MQTT broker');
    });

    // Cleanup on component unmount
    return () => {
      console.log('Cleaning up MQTT connection');
      isConnected = false;
      if (client) {
        try {
          client.end(true, () => {
            console.log('MQTT client disconnected successfully');
          });
        } catch (error) {
          console.error('Error disconnecting MQTT client:', error);
        }
      }
    };
  }, [hiveId, searchParams]);

  // Add effect to update displays when historicalMaximums changes
  useEffect(() => {
    if (mounted) {
      updateHistoricalData(historicalDateRange, null, null, 'historical');
      updateHistoricalData(summaryDateRange, null, null, 'summary');
    }
  }, [historicalMaximums, mounted]);

  const handleReturnClick = () => {
    const email = searchParams.get('email');
    const username = searchParams.get('username');
    router.push(`/loggedIn?email=${encodeURIComponent(email)}&username=${encodeURIComponent(username)}&returnFromHive=true`);
  };

  const handleExport = (chartType, format) => {
    setTimeout(() => {
      const chartWrapper = document.querySelector(`#${chartType}-chart`);
      if (!chartWrapper) {
        alert('Chart image not found. Please make sure the chart is visible.');
        setActiveDropdown(null);
        return;
      }
      const bgColor = theme === 'dark' ? '#1e293b' : '#ffffff';

      // Save original style
      const originalPaddingBottom = chartWrapper.style.paddingBottom;
      // Add extra padding to ensure legend/labels are visible
      chartWrapper.style.paddingBottom = '48px';

      const exportOptions = {
        bgcolor: bgColor,
        style: {
          backgroundColor: bgColor,
        },
        width: chartWrapper.offsetWidth,
        height: chartWrapper.offsetHeight,
        filter: (node) => {
          if (node.classList && (node.classList.contains('export-button') || node.classList.contains('export-dropdown'))) {
            return false;
          }
          return true;
        }
      };
      const exportFn = format === 'jpg' ? domtoimage.toJpeg : domtoimage.toPng;
      exportFn(chartWrapper, exportOptions)
        .then((dataUrl) => {
          const link = document.createElement('a');
          link.download = `${chartType}-data-${formatDate(new Date())}.${format}`;
          link.href = dataUrl;
          link.click();
          setActiveDropdown(null);
        })
        .catch((error) => {
          alert('Failed to export chart image.');
          setActiveDropdown(null);
        })
        .finally(() => {
          // Restore original padding
          chartWrapper.style.paddingBottom = originalPaddingBottom;
        });
    }, 100);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside both the button and dropdown
      const isClickOutsideButton = !event.target.closest('.export-button');
      const isClickOutsideDropdown = !event.target.closest('.export-dropdown');
      
      if (isClickOutsideButton && isClickOutsideDropdown) {
        setActiveDropdown(null);
      }
    };

    // Add event listener if dropdown is open
    if (activeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [activeDropdown]);

  // Add fix for exact positioning of data points in charts
  useEffect(() => {
    if (mounted) {
      // Force chart re-render with exact positioning for data points
      const fixChartScaling = () => {
        // Find all chart canvases
        const chartCanvas = document.querySelectorAll('canvas');
        
        // For each canvas, update the associated Chart if it exists
        chartCanvas.forEach(canvas => {
          const chart = Chart.getChart(canvas);
          if (chart) {
            // When updating charts, ensure they use exact data values, not rounded ones
            chart.options.parsing = {
              xAxisKey: 'x',
              yAxisKey: 'y'
            };
            
            // Add more precise tick configuration
            if (chart.options.scales && chart.options.scales.y) {
              chart.options.scales.y.ticks.precision = 2;
            }
            
            // Same for y2 if it exists (humidity axis)
            if (chart.options.scales && chart.options.scales.y2) {
              chart.options.scales.y2.ticks.precision = 2;
            }
            
            // Update the chart with the fixed configuration
            chart.update();
          }
        });
      };
      
      // Run the fix after a short delay to ensure charts are fully initialized
      const timer = setTimeout(fixChartScaling, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, hiveData.temperature, hiveData.humidity]);

  const [monitorStatus, setMonitorStatus] = useState('checking');
  
  // Check MQTT monitor status when component mounts
  useEffect(() => {
    const checkMonitorStatus = async () => {
      try {
        const status = await checkMQTTMonitorStatus();
        setMonitorStatus(status.status);
        console.log('MQTT monitor status:', status);
      } catch (error) {
        console.error('Error checking MQTT monitor status:', error);
        setMonitorStatus('error');
      }
    };
    
    checkMonitorStatus();
  }, []);

  // Add function to clear air pump activations
  const clearAirPumpActivations = async () => {
    setShowClearHistoryModal(false);
    
    if (!hiveId || !email) {
      console.error("Missing hiveId or email for clearing activations");
      return;
    }

    try {
      // Clear local state
      setAirPumpActivations([]);
      
      // Clear from localStorage
      localStorage.removeItem(`airPumpActivations_${hiveId}`);
      
      // Clear from database via API
      const response = await fetch(`/api/airpump?hiveId=${hiveId}&email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        console.log("Successfully cleared air pump activations from database");
      } else {
        console.error("Failed to clear air pump activations from database:", await response.text());
      }
    } catch (error) {
      console.error("Error clearing air pump activations:", error);
    }
  };

  if (!mounted) return null;

  return (
    <div className={`App theme-${theme === "dark" ? "dark" : "light"}`}>
      <Header isLoggedIn={false} hiveDetails={true}/>
      <FlowersRenderer />


      <button
        onClick={handleReturnClick}
        className='return-button'
      >
        <Image 
          src={"/logout.png"} 
          className='logout-image' 
          alt="Logout"
          width={20}
          height={20}
        />
        <b className='logout-text'>Return</b>
      </button>
    
      <div className="content-wrapperx">
        <div className="headerx">
          <h1 className={`main-titleHive ${theme === 'dark' ? 'dark' : 'light'}`}>
            {hiveData.name}
          </h1>
          <h2 className='real-time-data-title' style={{marginLeft: '0', textAlign: 'left'}}>
            Real-time temperature and humidity data inside the hive
          </h2>
          
        </div>
        

        <div className="real-time-data">
          <div className="metrics-container">
            <div className="metric-card temperature">
              <div className="metric-circle">
                <div className="metric-icon-temperature">
                  <Thermometer size={24} />
                </div>
                <div className="metric-content">
                  <h3>Temperature</h3>
                  <div className="metric-value">
                    {hiveData.temperature !== null 
                      ? `${hiveData.temperature.toFixed(2)}°C`
                      : '--°C'
                    }
                  </div>
                  <div className={`metric-status ${hiveData.temperature !== null && hiveData.temperature >= 26 && hiveData.temperature <= 38 ? 'optimal' : 'warning'}`}>
                    {hiveData.temperature !== null
                      ? (hiveData.temperature >= 26 && hiveData.temperature <= 38 ? 'Optimal' : 'Warning')
                      : '--'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="metric-card humidity">
              <div className="metric-circle">
                <div className="metric-icon-humidity">
                  <Droplets size={24} />
                </div>
                <div className="metric-content">
                  <h3>Humidity</h3>
                  <div className="metric-value">
                    {hiveData.humidity !== null 
                      ? `${hiveData.humidity.toFixed(2)}%`
                      : '--%'
                    }
                  </div>
                  <div className={`metric-status ${hiveData.humidity !== null && hiveData.humidity >= 76.5 && hiveData.humidity <= 85.6 ? 'optimal' : 'warning'}`}>
                    {hiveData.humidity !== null
                      ? (hiveData.humidity >= 76.5 && hiveData.humidity <= 85.6 ? 'Optimal' : 'Warning')
                      : '--'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="metric-card air-pump">
              <div className="metric-circle">
                <div className="metric-icon-air-pump">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" fill="#B2BEC9"/>
                    <path d="M12 5C13.5 5 14.5 6 14.5 7.5C14.5 9 13.5 10 12 10C10.5 10 9.5 9 9.5 7.5C9.5 6 10.5 5 12 5Z" fill="white"/>
                    <path d="M12 14C13.5 14 14.5 15 14.5 16.5C14.5 18 13.5 19 12 19C10.5 19 9.5 18 9.5 16.5C9.5 15 10.5 14 12 14Z" fill="white"/>
                    <path d="M5 12C5 10.5 6 9.5 7.5 9.5C9 9.5 10 10.5 10 12C10 13.5 9 14.5 7.5 14.5C6 14.5 5 13.5 5 12Z" fill="white"/>
                    <path d="M14 12C14 10.5 15 9.5 16.5 9.5C18 9.5 19 10.5 19 12C19 13.5 18 14.5 16.5 14.5C15 14.5 14 13.5 14 12Z" fill="white"/>
                    <circle cx="12" cy="12" r="2" fill="white"/>
                  </svg>
                </div>
                <div className="metric-content">
                  <h3>Air Pump</h3>
                  <div className="metric-value air-pump-value">
                    {hiveData.airPump || 'OFF'}
                  </div>
                  <div className={`metric-status ${hiveData.airPump === 'ON' ? 'optimal' : 'warning'}`}>
                    {hiveData.airPump === 'ON' ? 'Active' : 'Inactive'}
                  </div>
                  {isAirPumpActive && (
                    <div className="timer-display">
                      {formatElapsedTime()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Report Section */}
        <div className={`exact-screenshot-style ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`} style={{ 
          backgroundColor: theme === 'dark' ? '#1F283B' : undefined,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px'
        }}>
          <h2>Hive Report</h2>
          <p>
            Get report manually via Telegram
          </p>
          
          {successMessage && (
            <div className="status-message success" style={{ 
                background: 'linear-gradient(135deg, #4ade80 0%,rgb(23, 171, 77) 100%)', 
                color: '#052e16', 
                padding: '12px', 
                borderRadius: '6px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}>
              <CheckCircle size={18} />
              <span>{successMessage}</span>
            </div>
          )}
          
          <div className="buttons-row">
            <button
              className="send-report-button"
              onClick={handleSendTelegram}
              disabled={sending}
            >
              {sending ? (
                <>
                  <RefreshCw size={18} className="spinner" />
                  Loading...
                </>
              ) : (
                <>
                  <Image 
                    src={"/telegramIcon.png"} 
                    alt="Telegram"
                    width={18}
                    height={18}
                    style={{ marginRight: '5px', borderRadius: '100%' }}
                  />
                  Get Report Now via Telegram
                </>
              )}
            </button>
            
            {/* The automatic reporting button has been removed as reports are sent automatically every minute */}
          </div>
        </div>


        <div className="charts-container">
          <RealTimeTemperatureGraph 
            theme={theme}
            temperatureData={temperatureData}
            chartOptions={chartOptions}
            formatDate={formatDate}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            handleExport={handleExport}
          />

          <RealTimeHumidityGraph 
            theme={theme}
            humidityData={humidityData}
            chartOptions={chartOptions}
            formatDate={formatDate}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            handleExport={handleExport}
          />

          <HistoricalDataGraph 
            theme={theme}
            historicalData={historicalData}
            historicalChartOptions={historicalChartOptions}
            dateRange={historicalDateRange}
            setDateRange={setHistoricalDateRange}
            activeMetrics={activeMetrics}
            setActiveMetrics={setActiveMetrics}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
            handleCustomDateChange={handleCustomDateChange}
            formatDate={formatDate}
            updateHistoricalData={(range) => updateHistoricalData(range, null, null, 'historical')}
            activeDropdown={activeDropdown}
            setActiveDropdown={setActiveDropdown}
            handleExport={handleExport}
          />

          {/* Air Pump Activations Table */}
          <div className="air-pump-activations">
            <h2 className={`compare-hives-title ${theme === 'dark' ? 'dark' : 'light'}`}>Check last air pump activations</h2>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
              <button
                className="clear-activations-button"
                onClick={() => setShowClearHistoryModal(true)}
              >
                <Trash2 size={16} />
                <span>Clear History</span>
              </button>
            </div>
            <div className="activation-table-container">
              
              <table className="activation-log-table" style={{ padding: 0, margin: 0, borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'center' }}>Date</th>
                    <th style={{ textAlign: 'center' }}>Time</th>
                    <th style={{ textAlign: 'center' }}>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {airPumpActivations.length > 0 ? (
                    // Only show the last 10 activations
                    airPumpActivations.slice(0, 10).map((activation, index) => {
                      // Split date and time for display
                      const dateParts = activation.date.split(' ');
                      const dateOnly = dateParts[0];
                      const timeOnly = dateParts.length > 1 ? dateParts[1] : '';
                      
                      return (
                        <tr key={index}>
                          <td style={{ textAlign: 'center' }}>{dateOnly}</td>
                          <td style={{ textAlign: 'center' }}>{timeOnly}</td>
                          <td style={{ textAlign: 'center' }}>{activation.duration}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center' }}>
                        No air pump activations yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <TelegramModals 
        showTelegramSetupModal={showTelegramSetupModal}
        showTelegramErrorModal={showTelegramErrorModal}
        showChatIdInputModal={showChatIdInputModal}
        telegramErrorMessage={telegramErrorMessage}
        inputChatId={inputChatId}
        setInputChatId={setInputChatId}
        handleModalOverlayClick={handleModalOverlayClick}
        setShowTelegramSetupModal={setShowTelegramSetupModal}
        setShowTelegramErrorModal={setShowTelegramErrorModal}
        setShowChatIdInputModal={setShowChatIdInputModal}
        handleSetupTelegram={handleSetupTelegram}
        handleChatIdSubmit={handleChatIdSubmit}
      />

      <ClearHistoryModal
        isOpen={showClearHistoryModal}
        onClose={() => setShowClearHistoryModal(false)}
        onConfirm={clearAirPumpActivations}
        title="Clear Air Pump History"
        message="Are you sure you want to clear all air pump activation history?"
        confirmText="Yes, Clear History"
        cancelText="Cancel"
        theme={theme}
      />
    </div>
  );
};
export default HiveDetails;
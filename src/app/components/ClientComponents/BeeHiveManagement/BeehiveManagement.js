'use client';

import React, { useState, useEffect } from 'react';
import HiveComparisonBarChart from './HiveComparisonBarChart';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import  './BeehiveManagement.css';
import mqtt from 'mqtt';

const BeehiveManagement = ({email, username, password, hiveGroups, setHiveGroups, returnFromHive = false}) => {
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [pendingRenameHive, setPendingRenameHive] = useState(null);
  const [renameInput, setRenameInput] = useState('');
  const [pressedHives, setPressedHives] = useState([]);
  // State for bar chart hive selection (always select all hives by default)
  const allInitialHives = hiveGroups.flatMap(group => group.hives).map(hive => hive.id);
  const [selectedHiveIds, setSelectedHiveIds] = useState(allInitialHives);

  // Keep selectedHiveIds in sync with hiveGroups (always select all by default)
  useEffect(() => {
    const currentIds = hiveGroups.flatMap(group => group.hives).map(hive => hive.id);
    setSelectedHiveIds(currentIds);
  }, [hiveGroups]);
  const router = useRouter();
  const [selectedHive, setSelectedHive] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [initialLoading, setInitialLoading] = useState(returnFromHive);
  const { theme } = useTheme();
  const [message, setMessage] = useState({ text: '', type: '' });
  const [showAddHiveConfirm, setShowAddHiveConfirm] = useState(false);
  const [pendingHiveAdd, setPendingHiveAdd] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Persist fake hive data for each hive
  const [fakeHiveData, setFakeHiveData] = useState({});

  // Animate fake hive data to look more real
  useEffect(() => {
    const interval = setInterval(() => {
      setFakeHiveData(prev => {
        const newData = { ...prev };
        Object.keys(newData).forEach(id => {
          // Animate temp and humidity with small random walk
          let temp = parseFloat(newData[id].temp);
          let humidity = parseFloat(newData[id].humidity);
          temp += (Math.random() - 0.5) * 0.3; // small change
          humidity += (Math.random() - 0.5) * 0.7;
          // Clamp values to plausible range
          temp = Math.max(32, Math.min(40, temp));
          humidity = Math.max(45, Math.min(80, humidity));
          // Occasionally toggle air pump
          let airPumpOn = newData[id].airPumpOn;
          if (Math.random() < 0.08) airPumpOn = !airPumpOn;
          newData[id] = {
            temp: temp.toFixed(1),
            humidity: humidity.toFixed(1),
            airPumpOn,
          };
        });
        return newData;
      });
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Build a new fake data object for all hives, but keep existing data for unchanged hives
    const allHives = hiveGroups.flatMap(group => group.hives);
    setFakeHiveData(prev => {
      const newData = { ...prev };
      const seen = new Set();
      allHives.forEach(hive => {
        seen.add(hive.id);
        if (!newData[hive.id]) {
          newData[hive.id] = {
            temp: (32 + Math.random() * 8).toFixed(1),
            humidity: (45 + Math.random() * 35).toFixed(1),
            airPumpOn: Math.random() > 0.5,
          };
        }
      });
      // Remove data for hives that no longer exist
      Object.keys(newData).forEach(id => {
        if (!seen.has(Number(id))) delete newData[id];
      });
      return newData;
    });
  }, [hiveGroups]);

  // Log when props change
  useEffect(() => {
    console.log('BeehiveManagement props updated:', { email, username, password: password ? '[PRESENT]' : '[MISSING]', returnFromHive });
  }, [email, username, password, returnFromHive]);

  // Only show the UI after mounting to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
    

    // If returning from hive details, show a brief loading state
    if (returnFromHive) {
      const timer = setTimeout(() => {
        setInitialLoading(false);
      }, 1200); 
      
      return () => clearTimeout(timer);
    }
  }, [returnFromHive]);

  const addHive = async (groupId, hexIndex) => {
    // Check if this position already has a hive in the current state
    const existingHive = hiveGroups.find(g => g.id === groupId)?.hives.find(h => h.position === hexIndex);
    if (existingHive) {
      console.log('This position already has a hive');
      return;
    }
    setPendingHiveAdd({ groupId, hexIndex });
    setShowAddHiveConfirm(true);
  };

  const handleConfirmAddHive = async () => {
    const { groupId, hexIndex } = pendingHiveAdd;
    
    const totalHives = hiveGroups.reduce((sum, g) => sum + g.hives.length, 0);
    
    const newHive = {
      id: totalHives + 1,
      name: `Hive ${totalHives + 1}`,
      position: hexIndex,
    };
    
    try {
      const response = await fetch('/api/beehive/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          groupId,
          hive: newHive,
          email: email
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add hive to the database');
      }

      // Only update the state after successful API call
      setHiveGroups(currentGroups => {
        const updatedGroups = currentGroups.map(group => {
          if (group.id !== groupId) return group;
          return {
            ...group,
            hives: [...group.hives, newHive]
          };
        });
        
        return updatedGroups;
      });

      setMessage({ text: 'Hive added successfully', type: 'success' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } catch (error) {
      console.error('Error adding hive:', error);
      setMessage({ text: error.message, type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 4000);
    } finally {
      setShowAddHiveConfirm(false);
      setPendingHiveAdd(null);
    }
  };

  const handleCancelAddHive = () => {
    setShowAddHiveConfirm(false);
    setPendingHiveAdd(null);
  };

  const handleOverlayClick = (e) => {
    if (e.target.className === 'logout-modal-overlay') {
      setShowAddHiveConfirm(false);
      setPendingHiveAdd(null);
    }
  };
  
  const addNewGroup = () => {
    const newGroupId = hiveGroups.length + 1;
    setHiveGroups([...hiveGroups, { id: newGroupId, hives: [] }]);
  };
  
  const selectHive = async (hive) => {
    // Track pressed hives uniquely by group and id
    setPressedHives(prev => {
      const exists = prev.some(h => h.id === hive.id && h.position === hive.position && h.name === hive.name);
      if (exists) return prev;
      return [...prev, hive];
    });
    console.log('Selecting hive with password:', password ? '[PRESENT]' : '[MISSING]');
    setSelectedHive(hive);
    setIsLoading(true);
    setMessage({ text: 'Connecting to hive sensors...', type: 'info' });
    
    try {
      const userNameForTopic = username || sessionStorage.getItem('username');
      
      if (!userNameForTopic) {
        console.error('No username provided for MQTT topic');
        setMessage({ text: 'Error: Missing username for MQTT topic', type: 'error' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        setIsLoading(false);
        return;
      }

      const client = mqtt.connect('wss://test.mosquitto.org:8081', {
        clientId: `hiveguard_${Math.random().toString(16).substr(2, 8)}`,
        clean: true,
        reconnectPeriod: 0,
        connectTimeout: 30000, 
        keepalive: 60,       
        resubscribe: false,   
        protocol: 'wss',       
        qos: 1               
      });

      let connectionTimeout = setTimeout(() => {
        if (client) {
          clearTimeout(dataTimeout);
          client.end(true);
          setMessage({ text: 'Connection timeout. Please try again.', type: 'error' });
          setTimeout(() => setMessage({ text: '', type: '' }), 3000);
          setIsLoading(false);
        }
      }, 15000); // 15 seconds

      let dataTimeout = setTimeout(() => {
        if (client) {
          clearTimeout(connectionTimeout);
          client.end(true);
          setMessage({ text: 'No sensor data received. Please check your hive sensors.', type: 'error' });
          setTimeout(() => setMessage({ text: '', type: '' }), 4000);
          setIsLoading(false);
        }
      }, 15000); // 15 seconds

      client.on('connect', () => {
        clearTimeout(connectionTimeout);
        console.log('Connected to MQTT broker');
        
        const tempTopic = `${userNameForTopic}/moldPrevention/hive${hive.id}/temp`;
        const humidityTopic = `${userNameForTopic}/moldPrevention/hive${hive.id}/humidity`;
        
        // Only subscribe if client is still connected
        if (client.connected) {
          client.subscribe([tempTopic, humidityTopic], (err) => {
            if (err) {
              console.error('Subscription error:', err);
              client.end();
              clearTimeout(dataTimeout);
              setMessage({ text: 'Error connecting to hive sensors', type: 'error' });
              setTimeout(() => setMessage({ text: '', type: '' }), 3000);
              setIsLoading(false);
            }
          });
        }
      });

      let initialDataReceived = {
        temperature: false,
        humidity: false
      };

      let tempValue = null;
      let humidityValue = null;

      client.on('message', (topic, message) => {
        const value = parseFloat(message.toString());
        if (isNaN(value)) return;

        if (topic.endsWith('/temp')) {
          tempValue = value;  
          initialDataReceived.temperature = true;
        } else if (topic.endsWith('/humidity')) {
          humidityValue = value;  
          initialDataReceived.humidity = true;
        }

        if (initialDataReceived.temperature && initialDataReceived.humidity) {
          client.end();
          clearTimeout(dataTimeout);
          
          localStorage.setItem(`hiveData_${hive.id}`, JSON.stringify({
            data: {
              temperature: tempValue,    
              humidity: humidityValue,   
              name: `Hive ${hive.id}`
            },
            timestamp: Date.now()
          }));

          router.push(`/hiveDetails?id=${hive.id}&email=${encodeURIComponent(email)}&username=${encodeURIComponent(userNameForTopic)}&password=${encodeURIComponent(password)}&name=${encodeURIComponent(hive.name)}`);
        }
      });

      client.on('error', (err) => {
        console.error('MQTT Error:', err);
        clearTimeout(connectionTimeout);
        clearTimeout(dataTimeout);
        client.end();
        setMessage({ text: 'Error connecting to hive sensors', type: 'error' });
        setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        setIsLoading(false);
      });

      client.on('close', () => {
        clearTimeout(connectionTimeout);
        clearTimeout(dataTimeout);
        console.log('MQTT connection closed');
      });
    } catch (error) {
      console.error('Error fetching hive data:', error);
      setMessage({ text: 'Failed to load hive data', type: 'error' });
      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      setIsLoading(false);
    }
  };
    
  const isGroupFull = (group) => {
    return group.hives.length >= 7; 
  };
  
  // Don't render until client-side to avoid hydration mismatch
  if (!mounted) return null;
  
  // Show loading state when returning from hive details
  if (initialLoading) {
    return (
      <div className={`app-container theme-${theme}`}>
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading beehive management...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Create a hexagon SVG with hive name
  const Hexagon = ({ filled, label, onClick, alert }) => {
    const isDark = theme === 'dark';
    
    return (
      <div className="hexagon-container" onClick={onClick}>
        <svg viewBox="0 0 100 100" width="170" height="170">
          <polygon 
            points="50 3, 95 25, 95 75, 50 97, 5 75, 5 25" 
            stroke={alert ? '#ef4444' : (isDark ? '#e5e7eb' : 'black')}
            strokeWidth={alert ? '3' : '1.5'}
            fill={filled ? (isDark ? '#3a3a3a' : '#f0f0f0') : (isDark ? '#2d2d2d' : 'white')}
          />
          
          {alert && (
            <text
              x="50"
              y="23"
              textAnchor="middle"
              fontSize="32"
              fontWeight="bold"
              fill="#ef4444"
              style={{ filter: 'drop-shadow(0 1px 2px #fff8)' }}
            >
              !
            </text>
          )}
          {filled ? (
            <text
              x="50"
              y="55"
              textAnchor="middle"
              style={{ fontWeight: 510, fontFamily: 'FreeMono, monospace' }}
              fill={isDark ? "#f9fafb" : "black"}
            >
              {label}
            </text>
          ) : (
            <text
              x="50"
              y="55"
              textAnchor="middle"
              fill={isDark ? "#9ca3af" : "#6b7280"}
              style={{ fontSize: '12px', fontFamily: 'FreeMono, monospace' }}
            >
              Add Hive
            </text>
          )}
        </svg>
      </div>
    );
  };
  
  return (
    <div className={`app-container theme-${theme}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-card">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading hive data...</p>
          </div>
        </div>
      )}
      {message.text && (
        <div className={`message-banner ${message.type}`}>
          {message.text}
        </div>
      )}
      {/* Rename Hive Modal */}
      {showRenameModal && (
        <div className="logout-modal-overlay" onClick={e => { if (e.target.className === 'logout-modal-overlay') setShowRenameModal(false); }}>
          <div className="logout-modal">
            <div className="logout-modal-content">
              <h3 className="logout-modal-title">Rename Hive</h3>
              <input
                type="text"
                value={renameInput}
                onChange={e => setRenameInput(e.target.value.slice(0, 8))}
                maxLength={8}
                placeholder="Enter new hive name (max 8 chars)"
                style={{ width: '90%', padding: '8px', marginBottom: '18px', fontFamily: 'monospace', fontSize: 17, borderRadius: 6, border: '1px solid #aaa' }}
                autoFocus
              />
              <div className="logout-modal-buttons">
                <button
                  onClick={() => { setShowRenameModal(false); setPendingRenameHive(null); }}
                  className="logout-modal-button cancel-button"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!renameInput.trim()) return;
                    setMessage({ text: 'Renaming hive...', type: 'info' });
                    try {
                      const response = await fetch('/api/beehive/rename', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          groupId: pendingRenameHive.groupId,
                          hiveId: pendingRenameHive.hiveId,
                          newName: renameInput.trim(),
                          email
                        })
                      });
                      const data = await response.json();
                      if (!response.ok) throw new Error(data.error || 'Failed to rename hive');
                      setHiveGroups(currentGroups => currentGroups.map(group => {
                        if (group.id !== pendingRenameHive.groupId) return group;
                        return {
                          ...group,
                          hives: group.hives.map(hive => hive.id === pendingRenameHive.hiveId ? { ...hive, name: renameInput.trim() } : hive)
                        };
                      }));
                      setMessage({ text: 'Hive renamed successfully', type: 'success' });
                      setTimeout(() => setMessage({ text: '', type: '' }), 2500);
                    } catch (err) {
                      setMessage({ text: err.message, type: 'error' });
                      setTimeout(() => setMessage({ text: '', type: '' }), 3000);
                    } finally {
                      setShowRenameModal(false);
                      setPendingRenameHive(null);
                      setRenameInput('');
                    }
                  }}
                  className="add-hive-button"
                  style={{ marginLeft: 8 }}
                >
                  Rename
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="content-wrapper">
        <div className="header">
          <h1 className={`main-titlez ${theme === 'dark' ? 'dark' : 'light'}`}>Beehive Management</h1>
        </div>
        
        {/* Hexagon groups */}
        <div className="groups-container">
          {hiveGroups.map((group) => {
            // If this group is full and it's the last group, show an "Add Group" button
            const isLastGroup = group.id === hiveGroups.length;
            const showAddGroupButton = isGroupFull(group) && isLastGroup;
            
            return (
              <div key={group.id} className="group-wrapper">
                <div className="honeycomb-grid">
                  {/* Center hexagon (position 0) */}
                  <div className="center-hex">
                    {(() => {
                      const hexIndex = 0;
                      const existingHive = group.hives.find(hive => hive.position === hexIndex);
                      
                      return (
                        <Hexagon 
                          filled={!!existingHive}
                          label={existingHive?.name || ''}
                          onClick={() => existingHive ? selectHive(existingHive) : addHive(group.id, hexIndex)}
                          alert={!!existingHive && fakeHiveData[existingHive.id] && (
                            parseFloat(fakeHiveData[existingHive.id].temp) < 33 ||
                            parseFloat(fakeHiveData[existingHive.id].temp) > 38 ||
                            parseFloat(fakeHiveData[existingHive.id].humidity) < 50 ||
                            parseFloat(fakeHiveData[existingHive.id].humidity) > 75
                          )}
                        />
                      );
                    })()}
                  </div>
                  
                  {/* Surrounding hexagons (positions 1-6) */}
                  <div className="surrounding-hexes">
                    {[1, 2, 3, 4, 5, 6].map((index) => {
                      const existingHive = group.hives.find(hive => hive.position === index);
                      
                      // Calculate position based on index (60 degrees apart)
                      const angle = (index - 1) * 60;
                      const radian = angle * Math.PI / 180;
                      const radius = 155; 
                      const top = Math.sin(radian) * radius;
                      const left = Math.cos(radian) * radius;
                      
                      return (
                        <div 
                          key={index} 
                          className="hex-position" 
                          style={{ 
                            transform: `translate(${left}px, ${top}px)` 
                          }}
                        >
                          <Hexagon 
                            filled={!!existingHive}
                            label={existingHive?.name || ''}
                            onClick={() => existingHive ? selectHive(existingHive) : addHive(group.id, index)}
                            alert={!!existingHive && fakeHiveData[existingHive.id] && (
                              parseFloat(fakeHiveData[existingHive.id].temp) < 33 ||
                              parseFloat(fakeHiveData[existingHive.id].temp) > 38 ||
                              parseFloat(fakeHiveData[existingHive.id].humidity) < 50 ||
                              parseFloat(fakeHiveData[existingHive.id].humidity) > 75
                            )}
                          />
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="group-label">
                    Group {group.id}
                  </div>
                </div>
                
                {showAddGroupButton && (
                  <button 
                    onClick={addNewGroup}
                    className="add-group-button"
                  >
                    Add New Group
                  </button>
                )}
              </div>
            );
          })}
        </div>
        
        {/* Instructions */}
        <div className="instructions-card" >
          <h2 className="instructions-title">How to use:</h2>
          <ul className="instructions-list">
            <li>You need to set up sensors in your hive to view temperature and humidity data</li>
            <li>Click on a hexagon to add a new hive or view existing hive details</li>
            <li>When a group is full, a new group can be added</li>
            <li>Total hives: {hiveGroups.reduce((sum, group) => sum + group.hives.length, 0)}</li>
          </ul>
        </div>
      </div>


      {/* FAKE DATA CARDS FOR EXISTING HIVES */}
      <div className="hive-data-cards-section">
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <br></br>
        <h2 className="hive-data-title">All Hives Comparison</h2>
        <div className="hive-cards-scroll">
          {(() => {
            const allHives = hiveGroups.flatMap(group => group.hives);
            if (allHives.length === 0) {
              return <div style={{ color: '#a1a1a1', fontFamily: 'monospace', padding: '16px' }}>No hives added yet.</div>;
            }
            return allHives.map((hive, idx) => {
              const fake = fakeHiveData[hive.id] || { temp: '--', humidity: '--', airPumpOn: false };
              return (
                <div key={`existing-hive-card-${hive.id}-${hive.position}-${idx}`} className="hive-data-card">
                   <div className="hive-card-header">
                    {hive.name || `Hive ${hive.id}`}
                    <button
                      className="rename-hive-btn"
                      style={{ marginLeft: 10, fontSize: 13, padding: '2px 8px', borderRadius: 5, border: '1px solid #aaa', background: '#f5f5f5', cursor: 'pointer' }}
                      onClick={() => {
                        setPendingRenameHive({ groupId: hiveGroups.find(g => g.hives.some(h => h.id === hive.id))?.id, hiveId: hive.id });
                        setRenameInput(hive.name || '');
                        setShowRenameModal(true);
                      }}
                      title="Rename Hive"
                    >
                      Rename
                    </button>
                  </div>
                  <div className="hive-card-content">
                    <div className="hive-card-row">
                      <span className="hive-card-label">Temperature:</span>
                      <span className="hive-card-value">{fake.temp}°C</span>
                    </div>
                    <div className="hive-card-row">
                      <span className="hive-card-label">Humidity:</span>
                      <span className="hive-card-value">{fake.humidity}%</span>
                    </div>
                    <div className="hive-card-row">
                      <span className="hive-card-label">Air Pump:</span>
                      <span className={`hive-card-value ${fake.airPumpOn ? 'on' : 'off'}`}>{fake.airPumpOn ? 'On' : 'Off'}</span>
                    </div>
                    {/* ALERT ICON/ROW below Air Pump if temp/humidity out of range */}
                    {(fake.temp < 33 || fake.temp > 38 || fake.humidity < 50 || fake.humidity > 75) && (
                      <div className="header-alert" style={{ marginTop: 10, width: '100%', justifyContent: 'flex-start', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className="header-alert-icon" title="Alert: Out of Safe Range" style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>
                          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3L2 17H18L10 3Z" fill="#fee2e2" stroke="#ef4444" strokeWidth="1.5"/>
                            <rect x="9" y="8" width="2" height="5" rx="1" fill="#ef4444"/>
                            <rect x="9" y="14" width="2" height="2" rx="1" fill="#ef4444"/>
                          </svg>
                        </span>
                        <span className="header-alert-text" style={{ fontSize: 13, fontWeight: 600 }}>
                          Alert: Temp/Humidity out of range
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      {/* Hive Comparison Bar Chart */}
      <HiveComparisonBarChart
        hives={hiveGroups.flatMap(group => group.hives)}
        fakeHiveData={fakeHiveData}
        selectedHiveIds={selectedHiveIds}
        setSelectedHiveIds={setSelectedHiveIds}
      />

      {/* Add Hive Confirmation Modal */}
      {showAddHiveConfirm && (
        <div className="logout-modal-overlay" onClick={handleOverlayClick}>
          <div className="logout-modal">
            <div className="logout-modal-content">
              <h3 className="logout-modal-title">Add New Beehive</h3>
              <p style={{ textAlign: 'center', marginBottom: '20px', color: theme === 'dark' ? '#e0e0e0' : '#333', fontFamily: 'MonoSpace, FreeMono, monospace' }}>
                Are you sure you want to add a new beehive to this position?
              </p>
              <div className="logout-modal-buttons">
                <button 
                  onClick={handleCancelAddHive} 
                  className="logout-modal-button cancel-button"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmAddHive} 
                  className="add-hive-button"
                >
                  Add Hive
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeehiveManagement;
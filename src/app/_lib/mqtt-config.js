/**
 * MQTT Configuration
 * This file contains the MQTT broker URL and other settings
 */

// MQTT broker URL for WebSocket connection
export const MQTT_URL = 'wss://test.mosquitto.org:8081';

// Default client settings
export const DEFAULT_MQTT_OPTIONS = {
  clean: true,
  reconnectPeriod: 1000,
  connectTimeout: 30 * 1000
}; 

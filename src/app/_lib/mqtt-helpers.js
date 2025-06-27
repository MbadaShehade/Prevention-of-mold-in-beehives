/**
 * MQTT Helpers
 * Utility functions for MQTT monitoring and server-side handling
 */

// Fetch the server-side MQTT monitor to initialize it
export async function fetchServerMQTTMonitor() {
  // Only run on server
  if (typeof window !== 'undefined') return;
  
  try {
    // Use relative URL for Vercel compatibility
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = baseUrl ? `${baseUrl}/api/mqtt-monitor` : '/api/mqtt-monitor';
    
    // Fetch the monitoring service to ensure it's running
    const response = await fetch(url, {
      cache: 'no-store',
      method: 'GET'
    });
    
    const data = await response.json();
    console.log('[MQTT Helper] Monitor service status:', data.status);
    
    return data;
  } catch (error) {
    console.error('[MQTT Helper] Failed to initialize MQTT monitor:', error);
    return { status: 'error', message: error.message };
  }
}

// Check the status of the MQTT monitor
export async function checkMQTTMonitorStatus() {
  try {
    // Use relative URL for Vercel compatibility
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = baseUrl ? `${baseUrl}/api/mqtt-monitor` : '/api/mqtt-monitor';
    
    // Fetch the monitoring service status
    const response = await fetch(url, {
      cache: 'no-store',
      method: 'GET'
    });
    
    return await response.json();
  } catch (error) {
    console.error('[MQTT Helper] Failed to check MQTT monitor status:', error);
    return { status: 'error', message: error.message };
  }
} 
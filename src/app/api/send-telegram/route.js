import { NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';

function getTemperatureStatus(temperature) {
  if (temperature === "--") return "Unknown";
  try {
    const temp = parseFloat(temperature);
    if (26 <= temp && temp <= 38) return "Optimal";
    if ((24 <= temp && temp < 26) || (38 < temp && temp <= 40)) return "Warning";
    return "Critical";
  } catch {
    return "Unknown";
  }
}

function getHumidityStatus(humidity) {
  if (humidity === "--") return "Unknown";
  try {
    const hum = parseFloat(humidity);
    if (76.5 <= hum && hum <= 85.6) return "Optimal";
    if ((70 <= hum && hum < 76.5) || (85.6 < hum && hum <= 90)) return "Warning";
    return "Critical";
  } catch {
    return "Unknown";
  }
}

async function generatePDF(data) {
  const {
    hiveId,
    temperature,
    humidity,
    username,
    reportType,
    airPumpStatus,
    tempChartBase64,
    humidityChartBase64
  } = data;

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Set initial y position
  let y = 20;

  // Add border to the entire page
  doc.setDrawColor(33, 33, 33);
  doc.setLineWidth(0.5);
  doc.rect(10, 10, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 20);

  // Add decorative border
  doc.setDrawColor(255, 140, 0); // Orange color
  doc.setLineWidth(0.8);
  doc.rect(15, 15, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 30);

  // Add title with background
  doc.setFillColor(255, 140, 0); // Orange color for header
  doc.rect(20, y - 10, doc.internal.pageSize.width - 40, 15, 'F');
  doc.setTextColor(255, 255, 255); // White text for header
  doc.setFontSize(24);
  doc.text(`Beehive ${hiveId} Report`, doc.internal.pageSize.width / 2, y, { align: 'center' });
  y += 20;

  // Add metadata
  doc.setFontSize(12);
  doc.setTextColor(66, 66, 66);
  if (username) {
    doc.text(`Generated for: ${username}`, 20, y);
    y += 8;
  }
  doc.text(`Generated on: ${new Date().toLocaleString()}`, 20, y);
  y += 8;
  if (reportType) {
    doc.text(`Report type: ${reportType}`, 20, y);
    y += 8;
  }

  // Create table for readings
  const headers = ['Metric', 'Current Value', 'Status'];
  const data1 = [
    ['Temperature', `${temperature}°C`, getTemperatureStatus(temperature)],
    ['Humidity', `${humidity}%`, getHumidityStatus(humidity)]
  ];
  if (airPumpStatus) {
    data1.push(['Air Pump', airPumpStatus, airPumpStatus === 'ON' ? 'Active' : 'Inactive']);
  }

  // Draw table
  const cellWidth = 50;
  const cellHeight = 10;
  const startX = 20;
  let currentY = y + 5;

  // Draw header with orange background
  doc.setFillColor(255, 140, 0);
  doc.setTextColor(255, 255, 255);
  doc.rect(startX, currentY, cellWidth * 3, cellHeight, 'F');
  headers.forEach((header, i) => {
    doc.text(header, startX + (i * cellWidth) + cellWidth/2, currentY + 7, { align: 'center' });
  });
  currentY += cellHeight;

  // Draw data rows with alternating background
  doc.setTextColor(33, 33, 33);
  data1.forEach((row, rowIndex) => {
    if (rowIndex % 2 === 0) {
      doc.setFillColor(245, 245, 220);
      doc.rect(startX, currentY, cellWidth * 3, cellHeight, 'F');
    }
    row.forEach((cell, i) => {
      doc.text(cell.toString(), startX + (i * cellWidth) + cellWidth/2, currentY + 7, { align: 'center' });
    });
    currentY += cellHeight;
  });

  // Add border to the entire table
  doc.setDrawColor(33, 33, 33);
  doc.rect(startX, y + 5, cellWidth * 3, cellHeight * (data1.length + 1));

  // Add temperature chart if available
  if (tempChartBase64) {
    y = currentY + 10;
    doc.setFillColor(245, 245, 220);
    doc.rect(20, y - 5, doc.internal.pageSize.width - 40, 15, 'F');
    doc.setFontSize(14);
    doc.text("Real-Time Temperature Graph", 20, y + 5);
    y += 15;
    try {
      doc.addImage(tempChartBase64, 'PNG', 20, y, doc.internal.pageSize.width - 40, 50, undefined, 'FAST');
      y += 60;
    } catch (error) {
      console.error('Error adding temperature chart:', error);
    }
  }

  // Add humidity chart if available
  if (humidityChartBase64) {
    doc.setFillColor(245, 245, 220);
    doc.rect(20, y - 5, doc.internal.pageSize.width - 40, 15, 'F');
    doc.setFontSize(14);
    doc.text("Real-Time Humidity Graph", 20, y + 5);
    y += 15;
    try {
      doc.addImage(humidityChartBase64, 'PNG', 20, y, doc.internal.pageSize.width - 40, 50, undefined, 'FAST');
    } catch (error) {
      console.error('Error adding humidity chart:', error);
    }
  }

  // Convert to base64
  const pdfBase64 = doc.output('datauristring').split(',')[1];
  return pdfBase64;
}

export async function POST(request) {
  try {
    const data = await request.json();
    const {
      hiveId,
      temperature,
      humidity,
      chatId,
      username,
      reportType,
      airPumpStatus,
      tempChartBase64,
      humidityChartBase64
    } = data;

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    if (!TELEGRAM_BOT_TOKEN) {
      return NextResponse.json({ success: false, message: 'TELEGRAM_BOT_TOKEN is not set' }, { status: 500 });
    }
    if (!chatId) {
      return NextResponse.json({ success: false, message: 'chatId is required' }, { status: 400 });
    }

    // 1. Generate PDF
    const pdfBase64 = await generatePDF({
      hiveId,
      temperature,
      humidity,
      username,
      reportType,
      airPumpStatus,
      tempChartBase64,
      humidityChartBase64
    });

    // 2. Send PDF via Telegram
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', new Blob([Buffer.from(pdfBase64, 'base64')], { type: 'application/pdf' }), `hive_${hiveId}_report.pdf`);

    const sendDocumentUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
    const response = await fetch(sendDocumentUrl, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (!result.ok) {
      throw new Error(result.description || 'Failed to send document');
    }

    return NextResponse.json({ success: true, message: 'Telegram report sent successfully' });
  } catch (error) {
    console.error('Error sending Telegram report:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

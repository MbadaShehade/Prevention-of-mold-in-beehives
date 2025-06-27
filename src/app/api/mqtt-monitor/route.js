import { NextResponse } from 'next/server';

// NOTE: Persistent MQTT connections are not supported in Vercel serverless functions.
// This endpoint will only return a static response.

export async function GET() {
  return NextResponse.json({ 
    status: 'unsupported', 
    message: 'Persistent MQTT monitoring is not supported on Vercel serverless functions.'
  });
}

export async function POST() {
  return NextResponse.json({ status: 'not_implemented', message: 'POST method is not implemented' });
} 
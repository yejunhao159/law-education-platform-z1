/**
 * Health check endpoint
 * GET /api/health
 */

import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      disputeAnalysis: true,
      evidenceQuality: true,
      dragAndDrop: true,
      aiIntegration: true,
      caching: true,
      accessibility: true
    }
  });
}
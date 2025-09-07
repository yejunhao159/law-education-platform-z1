/**
 * API endpoint for dispute analysis
 * POST /api/dispute-analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { DisputeAnalyzer } from '@/lib/ai-dispute-analyzer';
import type { DisputeAnalysisRequest } from '@/lib/ai-dispute-analyzer';

const analyzer = new DisputeAnalyzer({
  enabled: true,
  ttl: 3600,
  maxSize: 50
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.documentText || !body.caseType) {
      return NextResponse.json(
        { error: 'Missing required fields: documentText and caseType' },
        { status: 400 }
      );
    }

    // Create analysis request
    const analysisRequest: DisputeAnalysisRequest = {
      documentText: body.documentText,
      caseType: body.caseType,
      options: {
        extractClaimBasis: body.extractClaimBasis ?? true,
        analyzeDifficulty: body.analyzeDifficulty ?? true,
        generateTeachingNotes: body.generateTeachingNotes ?? false,
        maxDisputes: body.maxDisputes ?? 10,
        minConfidence: body.minConfidence ?? 0.7
      },
      caseId: body.caseId,
      userId: body.userId,
      sessionId: body.sessionId
    };

    // Perform analysis
    const response = await analyzer.analyze(analysisRequest);

    // Return response
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Dispute analysis error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error',
        disputes: [],
        claimBasisMappings: [],
        metadata: {
          analysisTime: 0,
          modelVersion: 'deepseek-chat',
          confidence: 0,
          timestamp: new Date().toISOString()
        }
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get statistics
    const stats = analyzer.getStatistics();
    
    return NextResponse.json({
      success: true,
      statistics: stats
    });

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}
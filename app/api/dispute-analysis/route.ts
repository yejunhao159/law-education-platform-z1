/**
 * API endpoint for dispute analysis
 * POST /api/dispute-analysis
 */

import { NextRequest, NextResponse } from 'next/server';
import { analyzeDisputesWithAI, DisputeAnalysisService } from '@/src/domains/legal-analysis/services/DisputeAnalysisService';
import type { DisputeAnalysisRequest } from '@/src/domains/legal-analysis/services/DisputeAnalysisService';

// Create a shared service instance for statistics
const disputeService = new DisputeAnalysisService();

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

    // Perform analysis using new service
    const response = await analyzeDisputesWithAI(analysisRequest);

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
    // Get statistics from service
    const stats = disputeService.getStatistics();

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
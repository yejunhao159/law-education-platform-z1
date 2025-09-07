/**
 * API endpoint for evidence quality assessment
 * POST /api/evidence-quality
 */

import { NextRequest, NextResponse } from 'next/server';
import { EvidenceMappingService } from '@/lib/evidence-mapping-service';
import type { ClaimElement } from '@/types/dispute-evidence';

const mappingService = new EvidenceMappingService();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request
    if (!body.evidence || !body.claimElements) {
      return NextResponse.json(
        { error: 'Missing required fields: evidence and claimElements' },
        { status: 400 }
      );
    }

    const { evidence, claimElements, mode = 'auto' } = body;

    let mappings = [];

    if (mode === 'auto') {
      // Auto-map evidence to claim elements
      if (Array.isArray(evidence)) {
        mappings = mappingService.batchAutoMap(evidence, claimElements);
      } else {
        mappings = mappingService.autoMapEvidence(evidence, claimElements);
      }
    } else if (mode === 'manual') {
      // Create manual mapping
      const { evidenceId, elementId, reason } = body;
      if (!evidenceId || !elementId) {
        return NextResponse.json(
          { error: 'Manual mapping requires evidenceId and elementId' },
          { status: 400 }
        );
      }
      const mapping = mappingService.createManualMapping(evidenceId, elementId, reason);
      mappings = [mapping];
    } else if (mode === 'suggest') {
      // Get mapping suggestions
      const suggestions = mappingService.suggestMappings(evidence, claimElements);
      return NextResponse.json({
        success: true,
        suggestions
      });
    }

    // Analyze mapping quality
    const analysis = mappingService.analyzeMappingQuality(mappings);

    // Find unmapped elements
    const unmappedElements = mappingService.findUnmappedElements(claimElements);

    // Find conflicts
    const conflicts = mappingService.findConflictingMappings(mappings);

    return NextResponse.json({
      success: true,
      mappings,
      analysis,
      unmappedElements,
      conflicts
    });

  } catch (error: any) {
    console.error('Evidence quality assessment error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body.mappings) {
      return NextResponse.json(
        { error: 'Missing required field: mappings' },
        { status: 400 }
      );
    }

    // Validate all mappings
    const validMappings = body.mappings.filter((m: any) => 
      mappingService.validateMapping(m)
    );

    if (validMappings.length !== body.mappings.length) {
      return NextResponse.json({
        success: false,
        error: 'Some mappings are invalid',
        validCount: validMappings.length,
        totalCount: body.mappings.length
      }, { status: 400 });
    }

    // Export mappings for storage
    const exported = mappingService.exportMappings(validMappings);

    return NextResponse.json({
      success: true,
      mappings: validMappings,
      exported
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
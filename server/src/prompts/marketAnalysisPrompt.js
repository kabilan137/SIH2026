// ---------------------------------------------------------------------------
// Audience Profile Prompt (Step 1 — lightweight, isolated call)
// Used by audienceProfileService.js only.
// ---------------------------------------------------------------------------

export const AUDIENCE_CATEGORIES_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['audienceCategories'],
  properties: {
    audienceCategories: {
      type: 'array',
      items: { type: 'string' },
      minItems: 1,
      maxItems: 8
    }
  }
};

// ---------------------------------------------------------------------------
// Market Analysis Prompt (Step 2 — full analysis, interprets scores)
// Used by mistralService.js.
// ---------------------------------------------------------------------------

export const MARKET_ANALYSIS_RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'overallScore',
    'grade',
    'confidence',
    'summary',
    'demandAnalysis',
    'supplyAnalysis',
    'opportunityAnalysis',
    'audienceInsights',
    'competitorInsights',
    'pricingAnalysis',
    'competitorAssessment',
    'marketAnalysis',
    'recommendation',
    'swotAnalysis',
    'financialProjections',
    'riskAssessment',
    'marketingPlaybook',
    'implementationRoadmap'
  ],
  properties: {
    overallScore: {
      type: 'number',
      minimum: 0,
      maximum: 100
    },
    grade: {
      type: 'string',
      enum: ['A', 'B', 'C', 'D', 'F']
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high']
    },
    summary: {
      type: 'string'
    },
    demandAnalysis: {
      type: 'string'
    },
    supplyAnalysis: {
      type: 'string'
    },
    opportunityAnalysis: {
      type: 'string'
    },
    audienceInsights: {
      type: 'string'
    },
    competitorInsights: {
      type: 'string'
    },
    pricingAnalysis: {
      type: 'string'
    },
    competitorAssessment: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'rating', 'reviewCount', 'threatLevel', 'strengths', 'weaknesses'],
        properties: {
          name: { type: 'string' },
          rating: { type: 'number' },
          reviewCount: { type: 'number' },
          threatLevel: { type: 'string' },
          strengths: {
            type: 'array',
            items: { type: 'string' }
          },
          weaknesses: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    },
    marketAnalysis: {
      type: 'object',
      additionalProperties: false,
      required: ['competitorDensity', 'entryDifficulty', 'marketSaturation', 'opportunityLevel'],
      properties: {
        competitorDensity: { type: 'string' },
        entryDifficulty: { type: 'string' },
        marketSaturation: { type: 'string' },
        opportunityLevel: { type: 'string' }
      }
    },
    recommendation: {
      type: 'object',
      additionalProperties: false,
      required: ['decision', 'reasoning', 'suggestedPositioning'],
      properties: {
        decision: { type: 'string' },
        reasoning: {
          type: 'array',
          items: { type: 'string' }
        },
        suggestedPositioning: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    },
    swotAnalysis: {
      type: 'object',
      additionalProperties: false,
      required: ['strengths', 'weaknesses', 'opportunities', 'threats'],
      properties: {
        strengths: { type: 'array', items: { type: 'string' } },
        weaknesses: { type: 'array', items: { type: 'string' } },
        opportunities: { type: 'array', items: { type: 'string' } },
        threats: { type: 'array', items: { type: 'string' } }
      }
    },
    financialProjections: {
      type: 'object',
      additionalProperties: false,
      required: ['capexRange', 'opexRange', 'estimatedBreakEven', 'description'],
      properties: {
        capexRange: { type: 'string' },
        opexRange: { type: 'string' },
        estimatedBreakEven: { type: 'string' },
        description: { type: 'string' }
      }
    },
    riskAssessment: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['riskCategory', 'riskDescription', 'mitigationStrategy'],
        properties: {
          riskCategory: { type: 'string' },
          riskDescription: { type: 'string' },
          mitigationStrategy: { type: 'string' }
        }
      }
    },
    marketingPlaybook: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['targetAudience', 'channel', 'tacticDescription'],
        properties: {
          targetAudience: { type: 'string' },
          channel: { type: 'string' },
          tacticDescription: { type: 'string' }
        }
      }
    },
    implementationRoadmap: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['phaseName', 'timelineEstimate', 'keyTasks'],
        properties: {
          phaseName: { type: 'string' },
          timelineEstimate: { type: 'string' },
          keyTasks: { type: 'array', items: { type: 'string' } }
        }
      }
    }
  }
};

/**
 * Builds the full market analysis prompt including demand + supply + opportunity signals.
 *
 * IMPORTANT: Mistral is instructed to INTERPRET scores only — it must NOT recalculate them.
 */
export function buildMarketAnalysisPrompt({
  location,
  businessType,
  niche,
  competitors,
  audienceCategories,
  demandProfile,
  demandScore,
  supplyScore,
  opportunityScore,
  opportunityTier
}) {
  const demandSignalSummary =
    demandProfile?.signals?.length > 0
      ? demandProfile.signals
          .map(
            (s) =>
              `  - ${s.category}: ${s.count} places found${s.closestDistanceMeters !== null ? `, closest at ${s.closestDistanceMeters}m` : ''}${s.averageRating !== null ? `, avg rating ${s.averageRating}` : ''}`
          )
          .join('\n')
      : '  No demand signals available.';

  const trimmedCompetitors = competitors.map((c) => ({
    name: c.name,
    rating: c.rating,
    reviewCount: c.reviewCount,
    primaryType: c.businessCategory?.primaryType,
    sentimentSummary: c.sentimentSummary,
    reviews: c.reviews?.map((r) => ({ rating: r.rating, text: r.text })),
    priceLevel: c.googleMetadata?.priceLevel,
    priceRange: c.googleMetadata?.priceRange?.displayString
  }));

  return `You are a professional market analyst and business location strategist.

CRITICAL RULES:
1. Use ONLY the data provided below. Do not invent competitors, reviews, or ratings.
2. The DEMAND SCORE, SUPPLY SCORE, and OPPORTUNITY SCORE have already been calculated by the system engine.
   You must NOT recalculate or override these scores.
   Your role is to INTERPRET and EXPLAIN what these scores mean in context.
3. For overallScore: synthesize your own holistic assessment (0-100) based on all evidence.
4. If evidence is missing, explicitly state it and lower your confidence accordingly.

SCORING CRITERIA (for overallScore):
0-24 = Very Poor | 25-49 = Poor | 50-69 = Moderate | 70-84 = Good | 85-100 = Excellent

GRADE MAPPING:
90-100 → A | 80-89 → B | 70-79 → C | 60-69 → D | 0-59 → F

REQUIRED ANALYSES:
- demandAnalysis: Why is demand strong or weak? Which audience groups dominate? What does the demand profile reveal about customer availability?
- supplyAnalysis: How entrenched is the competition? What are competitors' strengths/weaknesses? Are there quality gaps?
- opportunityAnalysis: How does demand compare to competitive pressure? Is this a contested market or an underserved opportunity?
- audienceInsights: Which audience categories are most significant? How do they relate to the target customer?
- competitorInsights: Key competitive dynamics, standout threats, and exploitable weaknesses across the competitor set.
- pricingAnalysis: Compare competitors' pricing levels and pricing ranges. Identify pricing patterns (e.g. premium clusters vs budget segments), highlight pricing sweet spots, and suggest strategic pricing advice/ranges for a new entrant.

PREMIUM BUSINESS STRATEGY:
- swotAnalysis: Provide a localized SWOT analysis. Include at least 3-4 distinct points for each category (strengths, weaknesses, opportunities, threats) specific to opening a business in this location and niche.
- financialProjections: Provide initial setup capital range (capexRange), monthly operating cost range (opexRange), break-even timeline estimate (estimatedBreakEven), and a detailed description/justification (description) explaining these estimates based on local competitor scale and local market factors.
- riskAssessment: Provide 3-4 major risks (riskCategory, riskDescription) along with actionable mitigation tactics (mitigationStrategy).
- marketingPlaybook: Outline 3-4 local marketing tactics (targetAudience, channel, tacticDescription) targeting the audience categories defined.
- implementationRoadmap: Outline a structured 4-phase launch roadmap (Phase 1 to 4) detailing the phaseName, timelineEstimate, and 3 keyTasks for each phase to guide the entrepreneur from setup to growth.

Return valid JSON only.

═══════════════════════════════════════════════
ANALYSIS TARGET
═══════════════════════════════════════════════

LOCATION: ${location}
BUSINESS TYPE: ${businessType}
NICHE: ${niche || 'Not specified'}

═══════════════════════════════════════════════
DEMAND SIGNALS  (pre-calculated — interpret only)
═══════════════════════════════════════════════

Audience Categories Targeted: ${(audienceCategories || []).join(', ') || 'None'}

Demand Signal Results:
${demandSignalSummary}

DEMAND SCORE: ${demandScore ?? 'N/A'} / 100
(Higher = stronger customer demand in the area)

═══════════════════════════════════════════════
SUPPLY SIGNALS  (pre-calculated — interpret only)
═══════════════════════════════════════════════

SUPPLY SCORE (competitive pressure): ${supplyScore ?? 'N/A'} / 100
(Higher = more entrenched competition)

Competitor Count: ${competitors.length}

═══════════════════════════════════════════════
OPPORTUNITY SCORE  (pre-calculated — interpret only)
═══════════════════════════════════════════════

OPPORTUNITY SCORE: ${opportunityScore ?? 'N/A'} / 100
OPPORTUNITY TIER: ${opportunityTier ?? 'N/A'}
(Demand strength minus competitive pressure — interpret what this means for a new entrant)

═══════════════════════════════════════════════
COMPETITOR DATA
═══════════════════════════════════════════════

${JSON.stringify(trimmedCompetitors, null, 2)}`;
}

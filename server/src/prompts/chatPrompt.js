export function buildChatSystemPrompt(analysis) {
  const {
    input = {},
    overallScore = 'N/A',
    grade = 'N/A',
    confidence = 'medium',
    summary = 'No summary available.',
    demandScore = null,
    supplyScore = null,
    opportunityScore = null,
    opportunityTier = null,
    audienceCategories = [],
    demandSignals = null,
    competitors = [],
    recommendation = {},
    demandAnalysis = '',
    supplyAnalysis = '',
    opportunityAnalysis = '',
    audienceInsights = '',
    competitorInsights = '',
    pricingAnalysis = '',
    competitorAssessment = [],
    // Premium Strategic Playbook fields
    swotAnalysis = null,
    financialProjections = null,
    riskAssessment = [],
    marketingPlaybook = [],
    implementationRoadmap = []
  } = analysis;

  const competitorsSummary = competitors.map(c => {
    const assessment = competitorAssessment.find(a => a.name.toLowerCase() === c.name.toLowerCase()) || {};
    const priceStr = c.googleMetadata?.priceRange?.displayString || (c.googleMetadata?.priceLevel ? '$'.repeat(c.googleMetadata.priceLevel) : 'N/A');
    return `- **${c.name}** (Rating: ${c.rating ?? 'N/A'}, Reviews: ${c.reviewCount || 0}, Primary Type: ${c.businessCategory?.primaryType || 'N/A'}, Price Range: ${priceStr})
  * Threat Level: ${assessment.threatLevel || 'Unknown'}
  * Strengths: ${(assessment.strengths || []).join(', ') || 'None identified'}
  * Weaknesses: ${(assessment.weaknesses || []).join(', ') || 'None identified'}`;
  }).join('\n');

  const demandSignalsList = demandSignals?.signals?.length > 0
    ? demandSignals.signals.map(s => `- **${s.category}**: ${s.count} places found (closest: ${s.closestDistanceMeters !== null ? s.closestDistanceMeters + 'm' : 'N/A'}, avg rating: ${s.averageRating ?? 'N/A'})`).join('\n')
    : 'No demand signal data.';

  const swotSummary = swotAnalysis
    ? `  * Strengths: ${(swotAnalysis.strengths || []).join(', ') || 'None'}
  * Weaknesses: ${(swotAnalysis.weaknesses || []).join(', ') || 'None'}
  * Opportunities: ${(swotAnalysis.opportunities || []).join(', ') || 'None'}
  * Threats: ${(swotAnalysis.threats || []).join(', ') || 'None'}`
    : 'None';

  const financialsSummary = financialProjections
    ? `  * Initial Capital (CapEx): ${financialProjections.capexRange || 'N/A'}
  * Monthly Operating (OpEx): ${financialProjections.opexRange || 'N/A'}
  * Break-Even: ${financialProjections.estimatedBreakEven || 'N/A'}
  * Rationale: ${financialProjections.description || 'None'}`
    : 'None';

  const risksSummary = riskAssessment?.length > 0
    ? riskAssessment.map(r => `  * ${r.riskCategory}: ${r.riskDescription} (Mitigation: ${r.mitigationStrategy})`).join('\n')
    : 'None';

  const marketingSummary = marketingPlaybook?.length > 0
    ? marketingPlaybook.map(m => `  * Target: ${m.targetAudience} | Channel: ${m.channel} | Tactic: ${m.tacticDescription}`).join('\n')
    : 'None';

  const roadmapSummary = implementationRoadmap?.length > 0
    ? implementationRoadmap.map(phase => `  * ${phase.phaseName} (Timeline: ${phase.timelineEstimate}): ${(phase.keyTasks || []).join(', ')}`).join('\n')
    : 'None';

  return `You are a professional Market Analyst, Business Consultant, and Location Strategist chatbot.
You have been provided with the following comprehensive Market Analysis Report for a target business concept in a specific location.
Your goal is to answer the user's questions about this report, explain the metrics, and provide strategic recommendations to help them succeed.

Business Concept Details:
- Location: ${input.location || 'Unknown Location'}
- Business Type: ${input.businessType || 'Unknown Type'}
- Niche: ${input.niche || 'Not specified'}

Calculated Metrics:
- Overall Score: ${overallScore}/100 (Grade: ${grade}, Confidence: ${confidence})
- Demand Score: ${demandScore ?? 'N/A'}/100 (Higher = stronger customer demand in the area)
- Supply Score (Competitive Pressure): ${supplyScore ?? 'N/A'}/100 (Higher = more entrenched local competition)
- Opportunity Score: ${opportunityScore ?? 'N/A'}/100 (Tier: ${opportunityTier || 'N/A'})

Executive Summary:
${summary}

AI Signals Interpretation:
- Demand Analysis: ${demandAnalysis || 'N/A'}
- Supply Analysis: ${supplyAnalysis || 'N/A'}
- Opportunity Analysis: ${opportunityAnalysis || 'N/A'}
- Audience Insights: ${audienceInsights || 'N/A'}
- Competitor Insights: ${competitorInsights || 'N/A'}
- Pricing Analysis: ${pricingAnalysis || 'N/A'}

Recommendations:
- Decision: ${recommendation?.decision || 'N/A'}
- Reasoning:
${(recommendation?.reasoning || []).map(r => `  * ${r}`).join('\n') || '  * N/A'}
- Suggested Positioning:
${(recommendation?.suggestedPositioning || []).map(p => `  * ${p}`).join('\n') || '  * N/A'}

Strategic Business Playbook:
- SWOT Analysis:
${swotSummary}
- Financial Estimates:
${financialsSummary}
- Risk Assessment:
${risksSummary}
- Marketing Channels:
${marketingSummary}
- Launch Roadmap Timeline:
${roadmapSummary}

Audience Profile Categories:
${audienceCategories.join(', ') || 'None'}

Demand Signals Found:
${demandSignalsList}

Competitors Analyzed:
${competitorsSummary || 'No competitors analyzed.'}

CRITICAL FORMATTING RULES:
1. MINIMIZE TEXT. Avoid long paragraphs, wordy explanations, or conversational filler. Keep introductory and concluding text extremely short (1-2 sentences max).
2. USE TABLES. For any comparisons, structural analysis, checklists, competitor overviews, or lists with multiple parameters, you MUST format them as a Markdown Table.
3. USE CHARTS. For any numeric distributions, ratings, scores, counts, or values comparisons, you MUST output a horizontal bar chart using the following custom bracket syntax:
\`\`\`chart
Label Name 1 | Value 1 | Color (green | blue | red | amber | teal | purple)
Label Name 2 | Value 2 | Color
\`\`\`
For example, to display competitor ratings or key scores:
\`\`\`chart
Overall Score | ${overallScore === 'N/A' ? 0 : overallScore} | green
Demand Score | ${demandScore ?? 0} | blue
Supply Score | ${supplyScore ?? 0} | red
Opportunity Score | ${opportunityScore ?? 0} | teal
\`\`\`
Or competitor ratings:
${competitors.slice(0, 3).map(c => `\`\`\`chart\n${c.name} Rating | ${c.rating || 0} | amber\n\`\`\``).join('\n') || 'No competitors to chart.'}
(Note: Do not surround individual chart bars in separate chart blocks. Group them into a single chart block!)
4. Relate general questions back to the report details. If the user asks about general startups or business models, frame them in the context of this location and concepts.`;
}

export function buildGeneralChatSystemPrompt() {
  return `You are a professional Market Analyst, Business Consultant, and Location Strategist chatbot.
Your goal is to help the user brainstorm startup ideas, analyze general market dynamics, suggest high-profit businesses for specific locations, and answer questions about market research.

CRITICAL FORMATTING RULES:
1. MINIMIZE TEXT. Avoid long paragraphs, wordy explanations, or conversational filler. Keep introductory and concluding text extremely short (1-2 sentences max).
2. USE TABLES. For any comparisons, structural analysis, checklists, competitor overviews, or lists with multiple parameters, you MUST format them as a Markdown Table.
3. USE CHARTS. For any numeric distributions, ratings, scores, counts, or values comparisons, you MUST output a horizontal bar chart using the following custom bracket syntax:
\`\`\`chart
Label Name 1 | Value 1 | Color (green | blue | red | amber | teal | purple)
Label Name 2 | Value 2 | Color
\`\`\`
For example:
\`\`\`chart
Coffee Shop Margins | 85 | green
Boutique Hotel Margins | 65 | blue
Coworking Space Margins | 50 | amber
\`\`\`
4. Provide extremely helpful, strategic, and actionable business advice. Make sure all comparisons, options, and lists use tables and visual charts so the user can easily digest the data.`;
}

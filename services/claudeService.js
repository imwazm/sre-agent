const Anthropic = require("@anthropic-ai/sdk");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Analyzes an incident using Claude Sonnet.
 * Returns structured triage output: root cause, urgency, impact, priority, and remediation steps.
 */
async function analyzeIncident(alert, logs, metrics) {
  const systemPrompt = `You are an expert SRE (Site Reliability Engineer) AI agent.
Your job is to analyze incidents by correlating log data and metrics, perform root cause analysis,
and produce a structured ServiceNow-ready incident triage report.

Always respond with valid JSON in this exact structure:
{
  "short_description": "One-line summary of the incident",
  "root_cause": "Detailed root cause analysis",
  "urgency": 1 | 2 | 3,
  "impact": 1 | 2 | 3,
  "priority": 1 | 2 | 3 | 4,
  "category": "string (e.g. 'Application', 'Database', 'Infrastructure')",
  "subcategory": "string",
  "remediation_steps": ["step 1", "step 2", "..."],
  "confidence": "high" | "medium" | "low",
  "contributing_factors": ["factor 1", "factor 2"]
}

Urgency/Impact/Priority scale: 1=Critical, 2=High, 3=Medium, 4=Low (for priority only).`;

  const userMessage = `Analyze this incident and provide a structured triage report.

## Alert
${JSON.stringify(alert, null, 2)}

## Recent Error Logs (ELK)
${JSON.stringify(logs, null, 2)}

## Metrics (Datadog)
${JSON.stringify(metrics, null, 2)}

Correlate all signals and identify the root cause. Return only valid JSON.`;

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content[0].text.trim();

    // Strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    return JSON.parse(jsonText);
  } catch (err) {
    console.error(`[Claude] Analysis failed: ${err.message}`);
    return {
      short_description: alert.title || "Unknown incident",
      root_cause: "Analysis unavailable — Claude service error",
      urgency: 2,
      impact: 2,
      priority: 2,
      category: "Application",
      subcategory: "Unknown",
      remediation_steps: ["Investigate manually"],
      confidence: "low",
      contributing_factors: [],
    };
  }
}

module.exports = { analyzeIncident };

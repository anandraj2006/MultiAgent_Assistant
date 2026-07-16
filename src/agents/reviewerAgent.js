/**
 * @file reviewerAgent.js
 * @description Calls Azure AI Foundry to review and improve the summary produced
 * by the summarizer agent. Applies formatting rules to produce clean Markdown output.
 */

const { callFoundry } = require("../utils/foundryClient");

const REVIEWER_SYSTEM_INSTRUCTIONS = `You are a review agent. Your job is to improve the readability and structure of an AI-generated summary.

Rules:
- Preserve all important information — do not omit or alter facts.
- Improve readability, flow, and clarity.
- Use clear Markdown headings where appropriate (e.g. # Title, ## Section).
- Use bullet points for lists.
- Add blank lines between sections for scanability.
- Adapt the structure to the topic naturally — do not force a rigid template.
- Return ONLY well-formatted Markdown.
- Do NOT include any preamble such as "Here is the improved response:".`;

/**
 * @param {{ originalQuery: string, findings: string, summary: string }} summaryResult
 * @returns {Promise<{ originalQuery: string, findings: string, summary: string, finalResponse: string }>}
 * @throws {Error} if the AI call fails.
 */
async function reviewerAgent(summaryResult) {
    const { originalQuery, findings, summary } = summaryResult;

    const prompt = `${REVIEWER_SYSTEM_INSTRUCTIONS}

Summary to review:
${summary}

Return only the improved response.`;

    let finalResponse;
    try {
        finalResponse = await callFoundry(prompt);
    } catch (error) {
        throw new Error(`reviewerAgent: ${error.message}`);
    }

    return {
        originalQuery,
        findings,
        summary,
        finalResponse,
    };
}

module.exports = reviewerAgent;
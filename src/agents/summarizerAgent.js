/**
 * @file summarizerAgent.js
 * @description Calls Azure AI Foundry to produce a concise summary of the
 * research findings. Uses the shared foundryClient utility for all AI calls.
 */

const { callFoundry } = require("../utils/foundryClient");

/**
 * @param {{ originalQuery: string, tasks: string[], findings: string }} researchResult
 * @returns {Promise<{ originalQuery: string, findings: string, summary: string }>}
 * @throws {Error} if the AI call fails.
 */
async function summarizerAgent(researchResult) {
    const { originalQuery, tasks, findings } = researchResult;

    const taskContext = tasks?.map((t) => `- ${t}`).join("\n") ?? "";

    const prompt = `You are an expert summarization agent.

User Query: ${originalQuery}

Research Tasks:
${taskContext}

Research Findings:
${findings}

Based on the findings above, create a concise and professional summary that directly addresses the user's query.`;

    let summary;
    try {
        summary = await callFoundry(prompt);
    } catch (error) {
        throw new Error(`summarizerAgent: ${error.message}`);
    }

    return {
        originalQuery,
        findings,
        summary,
    };
}

module.exports = summarizerAgent;
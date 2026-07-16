/**
 * @file orchestratorAgent.js
 * @description Coordinates the full multi-agent pipeline in sequence:
 * Planner → Researcher → Summarizer → Reviewer.
 * Each agent throws a descriptive Error on failure; errors propagate naturally
 * to the calling HTTP function for consistent error handling.
 */

const plannerAgent    = require("./plannerAgent");
const researchAgent   = require("./researchAgent");
const summarizerAgent = require("./summarizerAgent");
const reviewerAgent   = require("./reviewerAgent");

/**
 * Runs the full agent pipeline for a given user query.
 *
 * @param {string} userQuery
 * @returns {Promise<{ originalQuery: string, findings: string, summary: string, finalResponse: string }>}
 * @throws {Error} if any agent in the pipeline fails.
 */
async function orchestratorAgent(userQuery) {
    const plan           = await plannerAgent(userQuery);
    const researchResult = await researchAgent(plan);
    const summaryResult  = await summarizerAgent(researchResult);
    const reviewedResult = await reviewerAgent(summaryResult);

    return reviewedResult;
}

module.exports = orchestratorAgent;
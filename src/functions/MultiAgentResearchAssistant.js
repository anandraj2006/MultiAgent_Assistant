/**
 * @file MultiAgentResearchAssistant.js
 * @description Azure Function that runs the full 4-stage multi-agent research
 * pipeline (Planner → Researcher → Summarizer → Reviewer) for a given query
 * and returns structured output including intermediate and final results.
 */

const { app } = require("@azure/functions");
const orchestratorAgent = require("../agents/orchestratorAgent");

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_QUERY_LENGTH = 2_000;

// ── Azure Function ────────────────────────────────────────────────────────────

app.http("MultiAgentResearchAssistant", {
    methods:   ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log("MultiAgentResearchAssistant function started");

        // Parse and validate request body
        let body;
        try {
            body = await request.json();
        } catch {
            return {
                status:   400,
                jsonBody: { error: "Invalid JSON in request body." },
            };
        }

        const query = body?.query?.trim();

        if (!query) {
            return {
                status:   400,
                jsonBody: { error: "Please provide a 'query' field." },
            };
        }

        if (query.length > MAX_QUERY_LENGTH) {
            return {
                status:   400,
                jsonBody: { error: `Query must not exceed ${MAX_QUERY_LENGTH} characters.` },
            };
        }

        context.log(`User query received: ${query}`);

        try {
            const result         = await orchestratorAgent(query);
            const responseTimeMs = Date.now() - startTime;

            context.log(`Multi-agent workflow completed in ${responseTimeMs} ms`);

            return {
                status:   200,
                jsonBody: {
                    query,
                    plannerAndResearchOutput: {
                        originalQuery: result.originalQuery,
                        findings:      result.findings,
                    },
                    summary:       result.summary,
                    finalResponse: result.finalResponse,
                    responseTimeMs,
                },
            };
        } catch (error) {
            context.log(`Error in MultiAgentResearchAssistant: ${error.message}`);
            return {
                status:   500,
                jsonBody: {
                    error:   "Failed to process the research request.",
                    details: error.message,
                },
            };
        }
    },
});
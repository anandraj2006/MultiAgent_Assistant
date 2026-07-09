const { app } = require("@azure/functions");
const orchestratorAgent = require("../agents/orchestratorAgent");

app.http("MultiAgentResearchAssistant", {
    methods: ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {

        const startTime = Date.now();

        context.log("MultiAgentResearchAssistant function started");

        const body = await request.json();
        const query = body.query;

        context.log(`User query received: ${query}`);

        if (!query) {
            return {
                status: 400,
                jsonBody: {
                    error: "Please provide a query"
                }
            };
        }

        try {

            const result = await orchestratorAgent(query);

            const responseTimeMs = Date.now() - startTime;

            context.log(`Multi-agent workflow completed in ${responseTimeMs} ms`);

            return {
                status: 200,
                jsonBody: {
                    query: query,

                    plannerAndResearchOutput: {
                        
                        originalQuery: result.originalQuery,

                        findings: result.findings
                    },

                    summary: result.summary,

                    finalResponse: result.finalResponse,

                    responseTimeMs: responseTimeMs
                }
            };
            

        } catch (error) {

            context.log(`Error in MultiAgentResearchAssistant: ${error.message}`);

            return {
                status: 500,
                jsonBody: {
                    error: "Failed to process multi-agent research request",
                    details: error.message
                }
            };
        }
    }
});
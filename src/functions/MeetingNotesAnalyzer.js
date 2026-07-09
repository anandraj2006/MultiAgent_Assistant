const { app } = require('@azure/functions');
const fs = require('fs');
const path = require('path');

app.http('MeetingNotesAnalyzer', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',

    handler: async (request, context) => {

        const startTime = Date.now();
        context.log("MeetingNotesAnalyzer function started");

        const foundryEndpoint = process.env.FOUNDRY_ENDPOINT;
        const foundryApiKey = process.env.FOUNDRY_API_KEY;
        const foundryModel = process.env.FOUNDRY_MODEL;

        if (!foundryEndpoint || !foundryApiKey || !foundryModel) {
            return {
                status: 500,
                jsonBody: {
                    error: "GPT-5 configuration is missing"
                }
            };
        }

        context.log("Foundry configuration loaded successfully");

        let meetingNotes;

        try {
            const filePath = path.join(process.cwd(),'src','data','meetingnotes.txt');


            meetingNotes = fs.readFileSync(filePath, 'utf8');

            context.log("Meeting notes loaded successfully");
        }
        catch (error) {

            return {
                status: 500,
                jsonBody: {
                    error: "Unable to read meetingnotes.txt",
                    details: error.message
                }
            };
        }

        try {

            const aiResponse = await fetch(foundryEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': foundryApiKey
                },
                body: JSON.stringify({
                    model: foundryModel,
                    input: `You are a Meeting Notes Analyzer Agent.

                        Analyze the meeting notes below and return ONLY valid JSON.

                        {
                        "summary": "",
                        "actionItems": [],
                        "risks": [],
                        "blockers": [],
                        "dependencies": []
                        }

                        Meeting Notes:
                        ${meetingNotes}
                        `
                    })
                });

            const aiResult = await aiResponse.json();

            const analysisText =aiResult.output?.[1]?.content?.[0]?.text ||aiResult.output?.[0]?.content?.[0]?.text;

            let analysisResult;

            try {

                analysisResult = JSON.parse(analysisText);
                const outputPath = path.join(process.cwd(), 'analysis-result.json');

                fs.writeFileSync(
                    outputPath,
                    JSON.stringify(analysisResult, null, 2),
                    'utf8'
                );

                context.log("Analysis saved to analysis-result.json");

            } catch (parseError) {

                return {
                    status: 500,
                    jsonBody: {
                        error: "AI returned invalid JSON",
                        rawResponse: analysisText
                    }
                };
            }

            const responseTimeMs = Date.now() - startTime;

            context.log(`Meeting analysis completed in ${responseTimeMs} ms`);

            return {
                status: 200,
                jsonBody: {
                    sourceFile: "meetingnotes.txt",
                    analysis: analysisResult,
                    responseTimeMs: responseTimeMs
                }
            };

        } catch (error) {

            context.log("Analysis Error:", error);

            return {
                status: 500,
                jsonBody: {
                    error: "Failed to analyze meeting notes",
                    details: error.message
                }
            };
        }
    }
});
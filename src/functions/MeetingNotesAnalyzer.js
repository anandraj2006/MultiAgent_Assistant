/**
 * @file MeetingNotesAnalyzer.js
 * @description Azure Function that reads meeting notes from a local file, sends
 * them to Azure AI Foundry for structured analysis, and returns (and persists)
 * a JSON object containing a summary, action items, risks, blockers, and
 * dependencies.
 */

const { app } = require("@azure/functions");
const fs       = require("fs").promises;
const path     = require("path");
const { callFoundry, getFoundryConfig } = require("../utils/foundryClient");

// ── Constants ────────────────────────────────────────────────────────────────

const MEETING_NOTES_PATH = path.join(__dirname, "../data/meetingnotes.txt");
const OUTPUT_PATH        = path.join(process.cwd(), "analysis-result.json");

const ANALYSIS_SCHEMA = JSON.stringify(
    {
        summary:      "",
        actionItems:  [],
        risks:        [],
        blockers:     [],
        dependencies: [],
    },
    null,
    2
);

// ── Azure Function ────────────────────────────────────────────────────────────

app.http("MeetingNotesAnalyzer", {
    methods:   ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log("MeetingNotesAnalyzer function started");

        // Validate Foundry config before doing any work
        try {
            getFoundryConfig();
        } catch {
            return {
                status:   500,
                jsonBody: { error: "Server configuration error. Please contact the administrator." },
            };
        }

        // Load meeting notes asynchronously
        let meetingNotes;
        try {
            meetingNotes = await fs.readFile(MEETING_NOTES_PATH, "utf8");
        } catch (error) {
            context.log(`Failed to read meeting notes: ${error.message}`);
            return {
                status:   500,
                jsonBody: {
                    error:   "Unable to read meetingnotes.txt.",
                    details: error.message,
                },
            };
        }

        if (!meetingNotes.trim()) {
            return {
                status:   400,
                jsonBody: { error: "meetingnotes.txt is empty. Please provide meeting notes." },
            };
        }

        // Call AI model
        const prompt = `You are a Meeting Notes Analyzer Agent.

Analyze the meeting notes below and return ONLY a valid JSON object matching this exact schema.
Do NOT include any text, explanation, or markdown code fences outside the JSON object.

Schema:
${ANALYSIS_SCHEMA}

Meeting Notes:
${meetingNotes}`;

        let analysisText;
        try {
            analysisText = await callFoundry(prompt);
        } catch (error) {
            context.log(`AI call failed: ${error.message}`);
            return {
                status:   502,
                jsonBody: { error: "Failed to get a response from the AI model. Please try again." },
            };
        }

        // Strip markdown code fences that some models add despite instructions (e.g. ```json ... ```)
        const cleanedText = analysisText
            .replace(/^```(?:json)?\s*/i, "")
            .replace(/\s*```$/, "")
            .trim();

        let analysisResult;
        try {
            analysisResult = JSON.parse(cleanedText);
        } catch (parseError) {
            context.log(`AI returned non-JSON response: ${analysisText}`);
            return {
                status:   500,
                jsonBody: {
                    error:       "AI returned an invalid JSON response.",
                    rawResponse: analysisText,
                },
            };
        }

        // Persist the result — non-fatal if the write fails
        try {
            await fs.writeFile(OUTPUT_PATH, JSON.stringify(analysisResult, null, 2), "utf8");
            context.log("Analysis saved to analysis-result.json");
        } catch (writeError) {
            context.log(`Warning: Failed to persist analysis result: ${writeError.message}`);
        }

        const responseTimeMs = Date.now() - startTime;
        context.log(`Meeting analysis completed in ${responseTimeMs} ms`);

        return {
            status:   200,
            jsonBody: {
                sourceFile:    "meetingnotes.txt",
                analysis:      analysisResult,
                responseTimeMs,
            },
        };
    },
});
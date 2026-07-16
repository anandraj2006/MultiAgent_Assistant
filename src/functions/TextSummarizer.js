/**
 * @file TextSummarizer.js
 * @description Azure Function that summarizes a block of text at a user-specified
 * length (short / medium / detailed) using Azure AI Foundry.
 */

const { app } = require("@azure/functions");
const { callFoundry, getFoundryConfig } = require("../utils/foundryClient");

// ── Constants ────────────────────────────────────────────────────────────────

const MAX_TEXT_LENGTH = 16_000;

/** Maps each supported summaryLength value to a prompt instruction. */
const SUMMARY_INSTRUCTIONS = {
    short:    "Summarize the following text in exactly 2 concise sentences.",
    medium:   "Summarize the following text in one clear, well-structured paragraph.",
    detailed: "Provide a detailed, well-structured summary covering all key points of the following text.",
};

// ── Azure Function ────────────────────────────────────────────────────────────

app.http("TextSummarizer", {
    methods:   ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log("TextSummarizer function started");

        // Validate Foundry config before doing any work
        try {
            getFoundryConfig();
        } catch {
            return {
                status:   500,
                jsonBody: { error: "Server configuration error. Please contact the administrator." },
            };
        }

        // Extract parameters from GET query string or POST body
        let text;
        let summaryLength = "medium";

        if (request.method === "GET") {
            text          = request.query.get("text");
            summaryLength = request.query.get("summaryLength") ?? "medium";
        } else {
            let body;
            try {
                body = await request.json();
            } catch {
                return {
                    status:   400,
                    jsonBody: { error: "Invalid JSON in request body." },
                };
            }
            text          = body?.text;
            summaryLength = body?.summaryLength ?? "medium";
        }

        // Validate text
        if (!text || !text.trim()) {
            return {
                status:   400,
                jsonBody: { error: "Please provide a 'text' field to summarize." },
            };
        }

        if (text.length > MAX_TEXT_LENGTH) {
            return {
                status:   400,
                jsonBody: { error: `Text must not exceed ${MAX_TEXT_LENGTH} characters.` },
            };
        }

        // Validate summaryLength
        if (!Object.hasOwn(SUMMARY_INSTRUCTIONS, summaryLength)) {
            return {
                status:   400,
                jsonBody: {
                    error: `'summaryLength' must be one of: ${Object.keys(SUMMARY_INSTRUCTIONS).join(", ")}.`,
                },
            };
        }

        context.log(`Summary length selected: ${summaryLength}`);

        // Call AI model
        const prompt = `${SUMMARY_INSTRUCTIONS[summaryLength]}\n\nText:\n${text.trim()}`;

        let summary;
        try {
            summary = await callFoundry(prompt);
        } catch (error) {
            context.log(`AI call failed: ${error.message}`);
            return {
                status:   502,
                jsonBody: { error: "Failed to get a response from the AI model. Please try again." },
            };
        }

        const responseTimeMs = Date.now() - startTime;
        context.log(`Summary generated in ${responseTimeMs} ms`);

        return {
            status:   200,
            jsonBody: {
                summary,
                summaryLength,
                responseTimeMs,
            },
        };
    },
});
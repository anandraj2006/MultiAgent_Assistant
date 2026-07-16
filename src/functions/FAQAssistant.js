/**
 * @file FAQAssistant.js
 * @description Azure Function that answers user questions using a local knowledge
 * base. Performs keyword-based retrieval to find the most relevant context window,
 * then calls Azure AI Foundry to generate a grounded answer.
 */

const { app } = require("@azure/functions");
const fs       = require("fs").promises;
const path     = require("path");
const { callFoundry, getFoundryConfig } = require("../utils/foundryClient");

// ── Constants ────────────────────────────────────────────────────────────────

const KNOWLEDGE_BASE_PATH = path.join(__dirname, "../data/knowledgebase.txt");
const MAX_QUESTION_LENGTH  = 1_000;
const CONTEXT_WINDOW_SIZE  = 1_200; // chars of knowledge base to feed into the prompt
const CONTEXT_PADDING      = 300;   // chars of context to include before the first match

const STOP_WORDS = new Set([
    "what", "is", "are", "the", "a", "an", "of", "to", "in",
    "for", "and", "or", "on", "with", "about", "tell", "me",
    "explain", "can", "you", "please", "how", "does", "do",
    "give", "describe", "define",
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Extracts meaningful keywords from a question by removing stop words
 * and punctuation.
 * @param {string} question
 * @returns {string[]}
 */
function extractKeywords(question) {
    return question
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((word) => word && !STOP_WORDS.has(word));
}

/**
 * Finds the content window in the knowledge base that has the highest density
 * of keyword matches. Returns null if no keywords are found.
 *
 * @param {string} content   - The full knowledge base text.
 * @param {string[]} keywords
 * @returns {string | null}
 */
function findRelevantContent(content, keywords) {
    const lowerContent = content.toLowerCase();

    // Collect all match positions for all keywords
    const matchPositions = [];
    for (const keyword of keywords) {
        let searchFrom = 0;
        let idx;
        while ((idx = lowerContent.indexOf(keyword, searchFrom)) !== -1) {
            matchPositions.push(idx);
            searchFrom = idx + 1;
        }
    }

    if (matchPositions.length === 0) return null;

    // Slide a window over all positions and pick the one with the most coverage
    let bestWindowStart = matchPositions[0];
    let bestScore       = 0;

    for (const pos of matchPositions) {
        const windowStart = Math.max(0, pos - CONTEXT_PADDING);
        const windowEnd   = windowStart + CONTEXT_WINDOW_SIZE;
        const score = matchPositions.filter((m) => m >= windowStart && m <= windowEnd).length;

        if (score > bestScore) {
            bestScore       = score;
            bestWindowStart = windowStart;
        }
    }

    const start = Math.max(0, bestWindowStart);
    const end   = Math.min(content.length, start + CONTEXT_WINDOW_SIZE);
    return content.substring(start, end);
}

// ── Azure Function ────────────────────────────────────────────────────────────

app.http("FAQAssistant", {
    methods:   ["GET", "POST"],
    authLevel: "anonymous",
    handler: async (request, context) => {
        const startTime = Date.now();
        context.log("FAQAssistant function started");

        // Validate Foundry config before doing any work
        try {
            getFoundryConfig();
        } catch {
            return {
                status:   500,
                jsonBody: { error: "Server configuration error. Please contact the administrator." },
            };
        }

        // Parse request body
        let body;
        try {
            body = await request.json();
        } catch {
            return {
                status:   400,
                jsonBody: { error: "Invalid JSON in request body." },
            };
        }

        const question = body?.question?.trim();

        if (!question) {
            return { status: 400, jsonBody: { error: "Please provide a 'question' field." } };
        }

        if (question.length > MAX_QUESTION_LENGTH) {
            return {
                status:   400,
                jsonBody: { error: `Question must not exceed ${MAX_QUESTION_LENGTH} characters.` },
            };
        }

        // Load knowledge base asynchronously
        let content;
        try {
            content = await fs.readFile(KNOWLEDGE_BASE_PATH, "utf8");
        } catch (error) {
            context.log(`Failed to read knowledge base: ${error.message}`);
            return {
                status:   500,
                jsonBody: { error: "Failed to load the knowledge base. Please try again later." },
            };
        }

        // Retrieve relevant context
        const keywords       = extractKeywords(question);
        const relevantContent = findRelevantContent(content, keywords)
            ?? "No matching content found in the knowledge base.";

        context.log(`Extracted keywords: ${keywords.join(", ")}`);

        // Call AI model
        const prompt = `You are an intelligent FAQ assistant.
Use ONLY the information provided in the knowledge base context below to answer the user's question.
Give a clear, concise answer.
If the answer is not available in the context, respond with exactly:
"I could not find this information in the provided knowledge base."

Knowledge Base Context:
${relevantContent}

User Question:
${question}

Answer:`;

        let answer;
        try {
            answer = await callFoundry(prompt);
        } catch (error) {
            context.log(`AI call failed: ${error.message}`);
            return {
                status:   502,
                jsonBody: { error: "Failed to get a response from the AI model. Please try again." },
            };
        }

        const responseTimeMs = Date.now() - startTime;
        context.log(`Answer generated in ${responseTimeMs} ms`);

        return {
            status:   200,
            jsonBody: {
                question,
                answer,
                source:        "knowledgebase.txt",
                responseTimeMs,
            },
        };
    },
});
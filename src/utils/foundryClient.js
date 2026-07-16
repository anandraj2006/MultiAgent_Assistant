/**
 * @file foundryClient.js
 * @description Shared utility for interacting with Azure OpenAI via the
 * Chat Completions API. Centralises config validation, HTTP calls, and
 * response parsing so that individual agents and functions never have to
 * duplicate this logic.
 *
 * Expected environment variables:
 *   FOUNDRY_ENDPOINT  — Base URL, e.g. https://your-resource.openai.azure.com
 *   FOUNDRY_API_KEY   — Azure OpenAI API key
 *   FOUNDRY_MODEL     — Deployment name, e.g. gpt-4o or gpt-5
 */

const API_VERSION     = "2024-02-01";
const MAX_INPUT_LENGTH = 32_000;

/**
 * Reads and validates the required environment variables.
 * @returns {{ endpoint: string, apiKey: string, model: string }}
 * @throws {Error} if any variable is missing
 */
function getFoundryConfig() {
    const endpoint = process.env.FOUNDRY_ENDPOINT;
    const apiKey   = process.env.FOUNDRY_API_KEY;
    const model    = process.env.FOUNDRY_MODEL;

    if (!endpoint || !apiKey || !model) {
        throw new Error(
            "Missing required environment variables: FOUNDRY_ENDPOINT, FOUNDRY_API_KEY, FOUNDRY_MODEL. " +
            "Please check your local.settings.json or Azure Function App configuration."
        );
    }

    return { endpoint: endpoint.replace(/\/+$/, ""), apiKey, model };
}

/**
 * Builds the Azure OpenAI Chat Completions URL from env config.
 * Format: {endpoint}/openai/deployments/{model}/chat/completions?api-version={version}
 */
function buildChatCompletionsUrl(endpoint, model) {
    return `${endpoint}/openai/deployments/${model}/chat/completions?api-version=${API_VERSION}`;
}

/**
 * Sends a prompt to Azure OpenAI Chat Completions and returns the response text.
 *
 * @param {string} prompt
 * @returns {Promise<string>}
 * @throws {Error} on config issues, network errors, non-OK HTTP, or bad response shape.
 */
async function callFoundry(prompt) {
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
        throw new Error("callFoundry: prompt must be a non-empty string.");
    }

    if (prompt.length > MAX_INPUT_LENGTH) {
        throw new Error(
            `callFoundry: prompt length (${prompt.length}) exceeds the maximum of ${MAX_INPUT_LENGTH} characters.`
        );
    }

    const { endpoint, apiKey, model } = getFoundryConfig();
    const url = buildChatCompletionsUrl(endpoint, model);

    let response;
    try {
        response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": apiKey,
            },
            body: JSON.stringify({
                messages: [{ role: "user", content: prompt }],
            }),
        });
    } catch (networkError) {
        throw new Error(`callFoundry: Network request failed — ${networkError.message}`);
    }

    if (!response.ok) {
        const errorBody = await response.text().catch(() => "(unreadable body)");
        throw new Error(
            `callFoundry: API returned HTTP ${response.status} ${response.statusText}. Body: ${errorBody}`
        );
    }

    let result;
    try {
        result = await response.json();
    } catch {
        throw new Error("callFoundry: Failed to parse JSON from API response.");
    }

    const text = result?.choices?.[0]?.message?.content;

    if (typeof text !== "string" || !text.trim()) {
        throw new Error(
            "callFoundry: Unexpected response structure. " +
            `Raw: ${JSON.stringify(result)}`
        );
    }

    return text.trim();
}

module.exports = { callFoundry, getFoundryConfig };

/**
 * @file researchAgent.js
 * @description Reads research data from a local file and returns it alongside
 * the original query and task list produced by the planner. Uses async I/O
 * to avoid blocking the Node.js event loop.
 */

const fs   = require("fs").promises;
const path = require("path");

const DATA_FILE_PATH = path.join(__dirname, "../data/researchData.txt");

/**
 * @param {{ originalQuery: string, tasks: string[], createdAt: string }} plan
 * @returns {Promise<{ originalQuery: string, tasks: string[], findings: string }>}
 * @throws {Error} if the data file cannot be read or is empty.
 */
async function researchAgent(plan) {
    let content;

    try {
        content = await fs.readFile(DATA_FILE_PATH, "utf8");
    } catch (error) {
        throw new Error(
            `researchAgent: Failed to read research data file at "${DATA_FILE_PATH}". ` +
            `Cause: ${error.message}`
        );
    }

    if (!content || !content.trim()) {
        throw new Error(
            "researchAgent: Research data file exists but is empty. " +
            "Please add content to src/data/researchData.txt."
        );
    }

    return {
        originalQuery: plan.originalQuery,
        tasks:         plan.tasks,
        findings:      content.trim(),
    };
}

module.exports = researchAgent;
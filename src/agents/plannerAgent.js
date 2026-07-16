/**
 * @file plannerAgent.js
 * @description Breaks a user query into a structured task plan that guides
 * downstream agents. Validates input and stamps the plan with a timestamp.
 */

/**
 * @param {string} userQuery - The raw query from the user.
 * @returns {Promise<{ originalQuery: string, tasks: string[], createdAt: string }>}
 * @throws {Error} if userQuery is not a valid non-empty string.
 */
async function plannerAgent(userQuery) {
    if (!userQuery || typeof userQuery !== "string" || !userQuery.trim()) {
        throw new Error("plannerAgent: userQuery must be a non-empty string.");
    }

    const query = userQuery.trim();

    const plan = {
        originalQuery: query,
        tasks: [
            `Research information related to: ${query}`,
            "Identify key findings and main concepts",
            "Generate a concise, professional summary",
            "Review and refine the final response for clarity and readability",
        ],
        createdAt: new Date().toISOString(),
    };

    return plan;
}

module.exports = plannerAgent;
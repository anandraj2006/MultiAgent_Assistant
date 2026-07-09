const fs = require("fs").promises;
const path = require("path");

async function researchAgent(plan) {
    const filePath = path.join(
        __dirname,
        "../data/researchData.txt"
    );

    const content = await fs.readFile(filePath, "utf8");

    return {
        originalQuery: plan.originalQuery,
        findings: content
    };
}

module.exports = researchAgent;
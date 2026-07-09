const plannerAgent = require("./plannerAgent");
const researchAgent = require("./researchAgent");
const summarizerAgent = require("./summarizerAgent");
const reviewerAgent = require("./reviewerAgent");

async function orchestratorAgent(userQuery) {

    const plan =await plannerAgent(userQuery);
    const researchResult =await researchAgent(plan);
    const summaryResult =await summarizerAgent(researchResult);
    const reviewedResult =await reviewerAgent(summaryResult);

    return reviewedResult;
}
module.exports = orchestratorAgent;
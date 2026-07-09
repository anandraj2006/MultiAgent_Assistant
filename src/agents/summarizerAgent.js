async function summarizerAgent(researchResult) {

    const foundryEndpoint =process.env.FOUNDRY_ENDPOINT;
    const foundryApiKey =process.env.FOUNDRY_API_KEY;
    const foundryModel =process.env.FOUNDRY_MODEL;
    const prompt = `You are an expert summarization agent.
                    User Query:${researchResult.originalQuery}
                    Research Findings:${researchResult.findings}
                    Create a concise and professional summary.`;

    const aiResponse = await fetch(foundryEndpoint,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "api-key": foundryApiKey
            },
            body: JSON.stringify({
                model: foundryModel,
                input: prompt
            })
        }
    );

    const aiResult =await aiResponse.json();
    const summary =aiResult.output[1].content[0].text;

    return {
        originalQuery:researchResult.originalQuery,

        findings:researchResult.findings,

        summary:summary
    };
}

module.exports = summarizerAgent;
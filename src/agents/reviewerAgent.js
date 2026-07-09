async function reviewerAgent(summaryResult) {

    const foundryEndpoint = process.env.FOUNDRY_ENDPOINT;
    const foundryApiKey = process.env.FOUNDRY_API_KEY;
    const foundryModel = process.env.FOUNDRY_MODEL;

    const prompt = `You are a review agent.

                Review and improve the response.

                Rules:
                - Preserve all important information.
                - Improve readability.
                - Use clear headings when appropriate.
                - Use bullet points for lists.
                - Add blank lines between sections.
                - Add blank lines between bullet points.
                - Make the response easy for a human to scan quickly.
                - Adapt the structure to the topic automatically.
                - Do not force a specific template.
                - Return well-formatted Markdown.
                - Use headings:
                    # Title
                    ## Benefits
                    ## Risks
                    ## Best Practices
                -blank line between each heading


                Summary:
                ${summaryResult.summary}

                Return only the improved response.`;

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

    const aiResult = await aiResponse.json();

    const reviewedResponse = aiResult.output[1].content[0].text;

    return {
        originalQuery: summaryResult.originalQuery,

        findings: summaryResult.findings,

        summary: summaryResult.summary,

        finalResponse: reviewedResponse
    };
}

module.exports = reviewerAgent;
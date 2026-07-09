const { app } = require('@azure/functions');

app.http('TextSummarizer', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {

        const startTime=Date.now();
        context.log("TextSummarizer function started");

        let text;
        let summaryLength="medium";
        
        const foundryEndpoint=process.env.FOUNDRY_ENDPOINT;
        const foundryApiKey=process.env.FOUNDRY_API_KEY;
        const foundryModel=process.env.FOUNDRY_MODEL;

        // context.log(`Endpoint: ${foundryEndpoint}`);
        // context.log(`API Key exists: ${!!foundryApiKey}`);
        // context.log(`Model: ${foundryModel}`);

        if(!foundryEndpoint || !foundryApiKey || !foundryModel){
            return{
                status:500,
                jsonBody:{
                    error: "GPT-5 configuration is missing"
                }
            };
        }
        context.log("Foundry configuration loaded successfully");

        if (request.method === 'GET') {
            text = request.query.get('text');
        } else {
            try {
                const body = await request.json();
                text = body.text;
                summaryLength=body.summaryLength || "medium";
                context.log(`Summary length selected: ${summaryLength}`);
            } catch {
                text = null;
            }
        }

        if (!text) {
            return {
                status: 400,
                jsonBody: {
                    error: 'Please provide text to summarize'
                }
            };
        }

        const validLengths = ['short', 'medium', 'detailed'];

        if (!validLengths.includes(summaryLength)) {
            return {
                status: 400,
                jsonBody: {
                    error: 'summaryLength must be short, medium, or detailed'
                }
            };
        }

        let summaryInstruction;

        if (summaryLength === 'short') {
            summaryInstruction = 'Summarize in 2 sentences.';
        } else if (summaryLength === 'medium') {
            summaryInstruction = 'Summarize in one paragraph.';
        } else {
            summaryInstruction = 'Provide a detailed summary.';
        }

        let summary;

        const aiResponse = await fetch(foundryEndpoint,{
           method:'POST',
           headers:{
            'Content-Type':'application/json',
            'api-key':foundryApiKey
           } ,
           body:JSON.stringify({
            model:foundryModel,
            input:`${summaryInstruction}\n\nText:\n${text}`
           })
        });

        const aiResult=await aiResponse.json();
        // context.log(JSON.stringify(aiResult));
        summary = aiResult.output[1].content[0].text;

        const responseTimeMs=Date.now()-startTime;
        context.log(`Summary generated successfully in ${responseTimeMs} ms`);
        return {
            status: 200,
            jsonBody: {
                // originalText: text,
                summary: summary,
                summaryLength: summaryLength,
                responseTimeMs: responseTimeMs
            }
        };
    }
});
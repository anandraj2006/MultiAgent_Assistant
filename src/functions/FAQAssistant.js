const { app } = require('@azure/functions');
const fs = require('fs');
const path = require('path');

app.http('FAQAssistant', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: async (request, context) => {
        const startTime=Date.now();

        context.log("FAQAssistant function started");

        const body=await request.json();
        const question=body.question;
        context.log(`Question received: ${question}`);

        if(!question){
            return{
                status: 400,
                jsonBody: {
                    error: "Please provide a question"
                }
            };
        }
        
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
                    error: "Foundry configuration is missing"
                }
            };
        }

        const filepath = path.join(process.cwd(),'src','data','knowledgebase.txt');
        const content =  fs.readFileSync(filepath,'utf8');

        const lowerContent = content.toLowerCase();

        const stopWords = [
            "what", "is", "are", "the", "a", "an", "of", "to", "in",
            "for", "and", "or", "on", "with", "about", "tell", "me",
            "explain", "can", "you", "please", "how", "does", "do",
            "give", "describe", "define"
        ];

        const keywords = question
            .toLowerCase()
            .replace(/[^\w\s]/g, "")
            .split(" ")
            .filter(word => word && !stopWords.includes(word));

        context.log(`Extracted keywords: ${keywords.join(", ")}`);

        let relevantContent = "No matching content found.";
        let bestIndex = -1;

        for (const keyword of keywords) {
            const index = lowerContent.indexOf(keyword);

            if (index !== -1) {
                bestIndex = index;
                break;
            }
        }

        if (bestIndex !== -1) {
            const start = Math.max(0, bestIndex - 300);
            const end = Math.min(content.length, bestIndex + 900);

            relevantContent = content.substring(start, end);
        }


        const aiResponse = await fetch(foundryEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': foundryApiKey
            },
            body: JSON.stringify({
                model: foundryModel,
                input: `You are an intelligent FAQ assistant.
                Use only the information provided in the knowledge base context below to answer the user's question.
                Give a clear and concise answer.
                If the answer is not available in the context, say: "I could not find this information in the provided knowledge base."

                Knowledge Base Context:
                ${relevantContent}

                User Question:
                ${question}

                Answer:`
                    })
                });
        
        if (!aiResponse.ok) {
            return {
                status: 500,
                jsonBody: {
                    error: "Failed to get response from AI model"
                }
            };
        }
        
        const aiResult = await aiResponse.json();

        const answer = aiResult.output[1].content[0].text;

        const responseTimeMs=Date.now()-startTime;
        context.log(`Answer generated successfully in ${responseTimeMs} ms`);

        return {
            status: 200,
            jsonBody: {
                question: question,
                answer: answer,
                source: "knowledgebase.txt",
                // relevantContent: relevantContent
                responseTimeMs:responseTimeMs
            }
        };
    }
});
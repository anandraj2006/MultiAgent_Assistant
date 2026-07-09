async function plannerAgent(userQuery){
    const plan ={
        originalQuery:userQuery,
        task:[
            `Research information related to : ${userQuery}`,
            "Identify key findings",
            "Generate concise summary",
            "Review and improve the final response"
        ]
    };
    return plan;
}
module.exports =plannerAgent;
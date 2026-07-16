# 🤖 MultiAgent Assistant

A serverless AI assistant platform built with **Azure Functions** and **Azure AI Foundry**. This project exposes multiple intelligent HTTP endpoints that leverage large language models for text summarization, FAQ answering, meeting notes analysis, and a full multi-agent research pipeline.

---

## 📌 Features

| Function | Description |
|---|---|
| **TextSummarizer** | Summarizes any input text at `short`, `medium`, or `detailed` length |
| **FAQAssistant** | Answers questions grounded in a local knowledge base using RAG-style keyword retrieval |
| **MeetingNotesAnalyzer** | Parses meeting notes and extracts structured JSON: summary, action items, risks, blockers, and dependencies |
| **MultiAgentResearchAssistant** | Orchestrates a 4-agent pipeline (Planner → Researcher → Summarizer → Reviewer) to answer research queries |

---

## 🏗️ Architecture

```
MultiAgent_Assistant/
├── src/
│   ├── agents/                     # Agent modules (multi-agent pipeline)
│   │   ├── orchestratorAgent.js    # Coordinates the full agent pipeline
│   │   ├── plannerAgent.js         # Breaks user query into a task plan
│   │   ├── researchAgent.js        # Reads research data from file
│   │   ├── summarizerAgent.js      # Calls AI Foundry to summarize findings
│   │   └── reviewerAgent.js        # Calls AI Foundry to review & polish output
│   │
│   ├── functions/                  # Azure Function HTTP endpoints
│   │   ├── MultiAgentResearchAssistant.js
│   │   ├── TextSummarizer.js
│   │   ├── FAQAssistant.js
│   │   └── MeetingNotesAnalyzer.js
│   │
│   └── data/                       # Local data files
│       ├── knowledgebase.txt       # FAQ knowledge base
│       ├── meetingnotes.txt        # Sample meeting notes
│       └── researchData.txt        # Research context for the agent pipeline
│
├── host.json                       # Azure Functions host configuration
├── package.json                    # Node.js dependencies
└── .gitignore
```

### Multi-Agent Pipeline Flow

```
User Query
    │
    ▼
┌─────────────┐
│ Planner     │  Breaks query into structured task list
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Researcher  │  Reads researchData.txt and returns relevant findings
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Summarizer  │  Calls Azure AI Foundry to generate a concise summary
└──────┬──────┘
       │
       ▼
┌─────────────┐
│ Reviewer    │  Calls Azure AI Foundry to improve readability & formatting
└──────┬──────┘
       │
       ▼
  Final Markdown Response
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Azure Functions Core Tools](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local) v4+
- An active **Azure AI Foundry** deployment (or Azure OpenAI endpoint)

### Installation

```bash
# Clone the repository
git clone https://github.com/anandraj2006/MultiAgent_Assistant.git
cd MultiAgent_Assistant

# Install dependencies
npm install
```

### Configuration

Create a `local.settings.json` file in the project root (this file is git-ignored):

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "FOUNDRY_ENDPOINT": "https://<your-foundry-resource>.services.ai.azure.com/models/chat/completions?api-version=2025-01-01-preview",
    "FOUNDRY_API_KEY": "<your-api-key>",
    "FOUNDRY_MODEL": "<your-deployed-model-name>",
    "APPLICATIONINSIGHTS_CONNECTION_STRING": "<your-application-insights-connection-string>"
  }
}
```

> **Note:** `local.settings.json` is excluded from version control via `.gitignore`. Never commit your API keys.

> **How to get your connection string:** In the Azure Portal, go to your Application Insights resource (`multi-agent-ai-insights`) → **Overview** → copy the **Connection String** at the top of the page.

### Running Locally

```bash
npm start
# or
func start
```

The functions will be available at `http://localhost:7071/api/`.

---

## 📡 API Reference

### 1. Text Summarizer

**`POST /api/TextSummarizer`**

Summarizes a block of text.

**Request Body:**
```json
{
  "text": "Your long text goes here...",
  "summaryLength": "short"
}
```

| Parameter | Type | Values | Default |
|---|---|---|---|
| `text` | `string` | Any text | Required |
| `summaryLength` | `string` | `short`, `medium`, `detailed` | `medium` |

**Response:**
```json
{
  "summary": "A concise two-sentence summary.",
  "summaryLength": "short",
  "responseTimeMs": 1234
}
```

---

### 2. FAQ Assistant

**`POST /api/FAQAssistant`**

Answers a question using the local knowledge base (`knowledgebase.txt`).

**Request Body:**
```json
{
  "question": "What is Azure AI Foundry?"
}
```

**Response:**
```json
{
  "question": "What is Azure AI Foundry?",
  "answer": "Azure AI Foundry is...",
  "source": "knowledgebase.txt",
  "responseTimeMs": 980
}
```

---

### 3. Meeting Notes Analyzer

**`POST /api/MeetingNotesAnalyzer`**

Analyzes the pre-loaded `meetingnotes.txt` and returns structured data.

**Request Body:** *(no body required)*

**Response:**
```json
{
  "sourceFile": "meetingnotes.txt",
  "analysis": {
    "summary": "The team discussed...",
    "actionItems": ["Deploy staging by Friday", "Review API contracts"],
    "risks": ["Dependency on external vendor API"],
    "blockers": ["Awaiting design sign-off"],
    "dependencies": ["Backend API", "Design team approval"]
  },
  "responseTimeMs": 2100
}
```

> The analysis is also persisted to `analysis-result.json` in the project root.

---

### 4. Multi-Agent Research Assistant

**`POST /api/MultiAgentResearchAssistant`**

Runs a full 4-stage agentic pipeline to research and answer a query.

**Request Body:**
```json
{
  "query": "What are the benefits of serverless computing?"
}
```

**Response:**
```json
{
  "query": "What are the benefits of serverless computing?",
  "plannerAndResearchOutput": {
    "originalQuery": "What are the benefits of serverless computing?",
    "findings": "<raw content from researchData.txt>"
  },
  "summary": "<AI-generated summary>",
  "finalResponse": "<Reviewed and formatted Markdown response>",
  "responseTimeMs": 3500
}
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Serverless Platform | Azure Functions v4 |
| AI Backend | Azure AI Foundry (Azure OpenAI) |
| HTTP Trigger | `@azure/functions` SDK |
| Monitoring | Azure Application Insights |
| Local Dev | Azure Functions Core Tools |

---

## 📂 Data Files

Place your own data in the `src/data/` directory:

| File | Used By | Purpose |
|---|---|---|
| `knowledgebase.txt` | FAQAssistant | Domain-specific knowledge for answering questions |
| `meetingnotes.txt` | MeetingNotesAnalyzer | Meeting notes to be analyzed |
| `researchData.txt` | MultiAgentResearchAssistant | Research context fed to the agent pipeline |

> **Note:** The `src/data/` directory is listed in `.gitignore`. Add your own data files locally.

---

## 📊 Monitoring

This project is connected to **Azure Application Insights** for real-time telemetry, logging, and performance monitoring.

| Detail | Value |
|---|---|
| **Resource Name** | `multi-agent-ai-insights` |
| **Resource Group** | `rg-text-summarizer` |
| **Type** | Application Insights |
| **Subscription** | `20f96ee4-c61d-46a0-8973-f1a60511bef8` |

### What's Automatically Tracked

Because `APPLICATIONINSIGHTS_CONNECTION_STRING` is set and `host.json` has sampling enabled, the following are tracked out of the box:

- ✅ **HTTP request/response** — status codes, durations, URLs
- ✅ **Function invocations** — success/failure per function
- ✅ **Exceptions** — unhandled errors with full stack traces
- ✅ **`context.log()` output** — surfaced as traces in the Logs blade
- ✅ **Dependency calls** — outbound HTTP calls to Azure AI Foundry

### Useful Log Queries (KQL)

Open the **Logs** blade in your Application Insights resource and run these queries:

**View all function invocations and their durations:**
```kql
requests
| where timestamp > ago(1h)
| project timestamp, name, duration, resultCode, success
| order by timestamp desc
```

**Find all failed requests:**
```kql
requests
| where success == false
| project timestamp, name, resultCode, duration
| order by timestamp desc
```

**View AI Foundry outbound call latencies:**
```kql
dependencies
| where timestamp > ago(1h)
| where type == "HTTP"
| project timestamp, name, duration, success, resultCode
| order by duration desc
```

**Tail live `context.log()` traces:**
```kql
traces
| where timestamp > ago(15m)
| project timestamp, message, severityLevel
| order by timestamp desc
```

**Average response time per function:**
```kql
requests
| where timestamp > ago(24h)
| summarize avgDuration = avg(duration), count() by name
| order by avgDuration desc
```

### Sampling Configuration

Request sampling is configured in `host.json` to reduce noise and cost:

```json
"samplingSettings": {
  "isEnabled": true,
  "excludedTypes": "Request"
}
```

> `excludedTypes: "Request"` means **all requests are always logged** (not sampled out), while other telemetry types (dependencies, traces) are subject to adaptive sampling.

---

## 🔒 Security Notes

- All functions use `authLevel: "anonymous"` for local development ease. **Change this to `function` or `admin`** before deploying to production.
- Never commit `local.settings.json` or any file containing API keys.
- Use [Azure Key Vault references](https://learn.microsoft.com/en-us/azure/app-service/app-service-key-vault-references) for secrets in production.

---

## 📦 Deployment

Deploy to Azure using the Azure Functions Core Tools or via CI/CD:

```bash
# Login to Azure
az login

# Deploy
func azure functionapp publish <YOUR_FUNCTION_APP_NAME>
```

Set the following environment variables in your Azure Function App's **Configuration → Application Settings**:

| Variable | Description |
|---|---|
| `FOUNDRY_ENDPOINT` | Your Azure AI Foundry chat completions endpoint URL |
| `FOUNDRY_API_KEY` | Your Azure AI Foundry API key |
| `FOUNDRY_MODEL` | The deployed model name (e.g. `gpt-4o`) |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | Connection string from `multi-agent-ai-insights` → Overview |

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

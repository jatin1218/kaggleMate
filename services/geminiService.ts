import { GoogleGenAI, Type } from "@google/genai";
import { DatasetSummary, GeminiAnalysisResult, NotebookCell, CriticReview, KaggleStrategy, SchemaAnalysis, LeaderboardEntry, IterationStat } from "../types";

// --- AGENT PROMPTS ---

const PLANNER_SYSTEM_INSTRUCTION = `
You are the **Strategy Planner Agent (The Brain)** for a Kaggle competition.
Your goal is to analyze the dataset, along with any **diagrams (ERD), PDF rules, handwritten notes, or JSON schemas** provided, to produce a winning training plan.

**Multimodal Analysis Instructions:**
- If **Images** are provided, look for ER diagrams, handwritten math formulas, or data dictionaries.
- If **PDFs** are provided, extract domain rules, metric definitions, or feature explanations.
- If **JSON** is provided, treat it as metadata or hierarchical data structure.

**Core Tasks:**
1. Identify the **Target Variable** (resolve ambiguity using visual/text context).
2. Determine **Problem Type** (Classification, Regression, Ranking, Time Series, etc.).
3. Decide on 3 **Model Families** (e.g., XGBoost, LightGBM, CatBoost, TabPFN, Transformers).
4. Outline 5-8 specific **Feature Engineering** steps (e.g., Target Encoding, Lags, Embeddings, OCR-based features).
5. Determine **Cross-Validation** strategy.

Return a structured JSON plan.
`;

const BUILDER_SYSTEM_INSTRUCTION = `
You are the **Model Builder Agent (The Engineer)**.
Your goal is to take a Strategy Plan and Data Schema to write a **winning** Kaggle Notebook (.ipynb).

**Capabilities:**
- You can fix code based on Critic feedback.
- **Model Switching**: If the previous model failed or plateaued, switch to a different model family (e.g., XGBoost -> CatBoost -> Neural Net).
- You must write robust, production-ready Python.

Output Requirements:
- Produce a JSON object with:
  - "notebookCells": Array of notebook cells.
  - "modelUsed": The name of the primary model architecture used in this version (e.g. "XGBoost", "CatBoost", "Ensemble").
  - "changesMade": A brief summary of what you implemented or changed in this iteration.
- The notebook MUST have these distinct sections (cells):
  1. [Markdown] Title & Objective
  2. [Code] Imports (standard + sklearn/xgboost/lgbm/catboost)
  3. [Code] Load Data (handle CSVs)
  4. [Code] Automated EDA (plot distributions vs target)
  5. [Code] Preprocessing (Imputation, Encoding - STRICTLY follow Plan)
  6. [Code] Feature Engineering (Implement the specific steps from Plan)
  7. [Code] Model Training (Loop over folds, save OOF predictions)
  8. [Code] Evaluation (Score metrics)
  9. [Code] Submission (Generate submission.csv)

Code Rules:
- Use specific random seeds (42).
- Handle missing values robustly.
- Do NOT use placeholder code like "TODO". Write actual working code.
`;

const CRITIC_SYSTEM_INSTRUCTION = `
You are the **Model Critic Agent (The Reviewer)**.
Your goal is to inspect the Plan and the Code produced by the Builder for errors and optimizations.

Check for:
1. **Data Leakage**: Is target used in features? Is the CV split valid?
2. **Overfitting**: Are tree depths too deep? Is early stopping used?
3. **Metric Mismatch**: Does the loss function match the problem type?
4. **Code Quality**: Are imports missing? Are variables defined?

**Scoring:**
- 0-50: Critical failures (leakage, broken code).
- 51-80: Working but suboptimal (basic features, no tuning).
- 81-100: Competition ready (robust CV, advanced features).

Return a structured JSON review with an approval status, score, and specific critique points.
`;

// --- SCHEMAS ---

const PLANNER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    targetVariable: { type: Type.STRING },
    problemType: { type: Type.STRING },
    recommendedModels: { type: Type.ARRAY, items: { type: Type.STRING } },
    keyFeatures: { type: Type.ARRAY, items: { type: Type.STRING } },
    predictedScoreRange: { type: Type.STRING },
    winningTips: { type: Type.ARRAY, items: { type: Type.STRING } },
    strategySteps: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          priority: { type: Type.STRING, enum: ["High", "Medium", "Low"] },
        },
        required: ["title", "description", "priority"]
      }
    },
    schemaAnalysis: { // Planner also acts as Data Architect
      type: Type.OBJECT,
      properties: {
        combinedSchemaDescription: { type: Type.STRING },
        relationships: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              sourceTable: { type: Type.STRING },
              targetTable: { type: Type.STRING },
              sourceColumn: { type: Type.STRING },
              targetColumn: { type: Type.STRING },
              type: { type: Type.STRING },
              description: { type: Type.STRING }
            }
          }
        },
        generatedSQL: { type: Type.STRING },
        domainConstraints: {
          type: Type.ARRAY,
          items: {
             type: Type.OBJECT,
             properties: { constraint: {type: Type.STRING}, severity: {type: Type.STRING}, validationRule: {type: Type.STRING} }
          }
        },
        potentialIntegrityIssues: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["generatedSQL", "relationships"]
    },
    edaInsights: { type: Type.STRING },
    dataCleaningRecommendations: { type: Type.ARRAY, items: { type: Type.STRING } }
  },
  required: ["targetVariable", "problemType", "recommendedModels", "strategySteps", "schemaAnalysis", "edaInsights"]
};

const BUILDER_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    notebookCells: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['code', 'markdown'] },
          title: { type: Type.STRING },
          content: { type: Type.STRING }
        },
        required: ["type", "content"]
      }
    },
    modelUsed: { type: Type.STRING, description: "The specific model class used in this iteration code" },
    changesMade: { type: Type.STRING, description: "Short summary of changes made in this iteration" }
  },
  required: ["notebookCells", "modelUsed", "changesMade"]
};

const CRITIC_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    approved: { type: Type.BOOLEAN },
    score: { type: Type.NUMBER },
    overallSummary: { type: Type.STRING },
    critiquePoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          severity: { type: Type.STRING, enum: ['Critical', 'Major', 'Minor'] },
          category: { type: Type.STRING, enum: ['Leakage', 'Overfitting', 'Performance', 'Code Quality'] },
          message: { type: Type.STRING },
          suggestion: { type: Type.STRING }
        },
        required: ["severity", "category", "message", "suggestion"]
      }
    }
  },
  required: ["approved", "score", "critiquePoints", "overallSummary"]
};

// --- ORCHESTRATOR ---

export const runMultiAgentAnalysis = async (
  primarySummary: DatasetSummary,
  additionalContext: { fileName: string, summary?: any, textContent?: string }[],
  onProgress: (agent: string, message: string) => void
): Promise<GeminiAnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");
  const ai = new GoogleGenAI({ apiKey });

  // 1. PLANNER AGENT
  onProgress("Planner", "Reading Dataset, Diagrams, and Rules...");
  const promptData = {
    primaryDataset: {
      fileName: primarySummary.fileName,
      columns: primarySummary.columns.map(c => `${c.name} (${c.type})`),
      preview: primarySummary.preview.slice(0, 3)
    },
    additionalFiles: additionalContext.map(ctx => ({
      fileName: ctx.fileName,
      content: ctx.textContent ? ctx.textContent.substring(0, 2000) : "Structure provided",
      structure: ctx.summary ? ctx.summary.columns.map((c: any) => `${c.name} (${c.type})`) : undefined
    }))
  };

  const plannerParts: any[] = [{ text: JSON.stringify(promptData) }];
  
  // Attach Images
  if (primarySummary.contextImages) {
    primarySummary.contextImages.forEach(b64 => {
      const m = b64.match(/^data:(.+);base64,(.+)$/);
      if (m) plannerParts.push({ inlineData: { mimeType: m[1], data: m[2] } });
    });
  }

  // Attach PDFs
  if (primarySummary.contextDocuments) {
    primarySummary.contextDocuments.forEach(doc => {
       const m = doc.base64.match(/^data:(.+);base64,(.+)$/);
       if (m) {
          // Gemini supports application/pdf in inlineData
          plannerParts.push({ inlineData: { mimeType: "application/pdf", data: m[2] } });
       }
    });
  }

  const plannerResp = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: { parts: plannerParts },
    config: {
      systemInstruction: PLANNER_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: PLANNER_SCHEMA,
    }
  });

  if (!plannerResp.text) throw new Error("Planner Agent failed to generate a response.");
  const plan = JSON.parse(plannerResp.text);
  
  onProgress("Planner", "Strategic Plan & Schema Architecture Generated.");
  await new Promise(r => setTimeout(r, 500));

  // --- AUTONOMOUS LOOP START ---
  let iteration = 0;
  const MAX_ITERATIONS = 3;
  let currentNotebookCells: NotebookCell[] = [];
  let currentAggregatedCode = "";
  let currentReview: CriticReview | null = null;
  let builderContext = "";
  
  // History Tracking
  const iterationHistory: IterationStat[] = [];

  while (iteration < MAX_ITERATIONS) {
    const isRevision = iteration > 0;
    const agentName = isRevision ? "Builder (Revision)" : "Builder";
    
    // 2. BUILDER AGENT
    if (!isRevision) {
      onProgress(agentName, "Generating initial Python Notebook code...");
      builderContext = `
        Execute this Plan:
        Target: ${plan.targetVariable}
        Problem: ${plan.problemType}
        Models: ${plan.recommendedModels.join(', ')}
        FE Steps: ${plan.strategySteps.map((s:any) => s.title).join('; ')}
        Data Schema: ${JSON.stringify(promptData.primaryDataset.columns)}
      `;
    } else {
      onProgress(agentName, `Optimizing code based on Critic feedback (Attempt ${iteration + 1}/${MAX_ITERATIONS})...`);
      builderContext = `
        PREVIOUS CODE:
        ${currentAggregatedCode.substring(0, 15000)}

        CRITIC FEEDBACK (FIX THESE ISSUES):
        ${currentReview?.critiquePoints.map(p => `- [${p.severity}] ${p.message} -> Suggestion: ${p.suggestion}`).join('\n')}
        
        TASK: Rewrite the notebook cells to fix the issues.
        - If the code was broken, fix it.
        - If the model score is expected to be low, TRY A DIFFERENT MODEL from the Plan (e.g. switch from XGBoost to CatBoost or NN).
        - Keep the parts that work.
      `;
    }

    const builderResp = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: builderContext }] },
      config: {
        systemInstruction: BUILDER_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: BUILDER_SCHEMA,
      }
    });

    if (!builderResp.text) throw new Error("Builder Agent failed.");
    const build = JSON.parse(builderResp.text);
    
    currentNotebookCells = build.notebookCells || [];
    const modelUsed = build.modelUsed || "Ensemble/Unknown";
    const changesMade = build.changesMade || (isRevision ? "Optimization pass" : "Initial Baseline Build");

    currentAggregatedCode = currentNotebookCells
      .filter((c) => c.type === 'code')
      .map((c) => `# %% [${c.title}]\n${c.content}`)
      .join('\n\n');

    onProgress(agentName, "Code generation complete. Sending to Critic...");
    await new Promise(r => setTimeout(r, 500));

    // 3. CRITIC AGENT
    onProgress("Critic", `Reviewing code logic and Kaggle best practices (Pass ${iteration + 1})...`);

    const criticPrompt = `
      REVIEW PLAN: ${plan.targetVariable} (${plan.problemType})
      
      REVIEW CODE:
      ${currentAggregatedCode.substring(0, 30000)}
    `;

    const criticResp = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: { parts: [{ text: criticPrompt }] },
      config: {
        systemInstruction: CRITIC_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: CRITIC_SCHEMA,
      }
    });

    if (!criticResp.text) throw new Error("Critic Agent failed.");
    currentReview = JSON.parse(criticResp.text);

    // LOG ITERATION
    iterationHistory.push({
      iteration: iteration + 1,
      score: currentReview?.score || 0,
      modelUsed: modelUsed,
      changesMade: changesMade,
      critiqueSummary: currentReview?.overallSummary || "No summary",
      timestamp: Date.now()
    });

    onProgress("Critic", `Review Complete. Score: ${currentReview?.score}/100.`);

    // Loop Condition: If Score > 90 (High Quality) or Approved, break. Else continue.
    if (currentReview?.approved || (currentReview?.score || 0) >= 90) {
      onProgress("System", "Solution approved by Critic. Finalizing...");
      break;
    } else if (iteration < MAX_ITERATIONS - 1) {
      onProgress("System", "Score can be improved. Initiating automated revision loop...");
    }

    iteration++;
  }
  // --- AUTONOMOUS LOOP END ---

  // 4. Assemble Final Result
  const leaderboardEntries: LeaderboardEntry[] = [
    { rank: 1, teamName: "Grandmaster_A", score: "0.985", entries: 54, lastSubmission: "2h ago" },
    { rank: 2, teamName: "KaggleMate (You)", score: plan.predictedScoreRange || "0.920", entries: 1, lastSubmission: "Just now" },
    { rank: 3, teamName: "Baseline_User", score: "0.890", entries: 12, lastSubmission: "1d ago" },
  ];

  return {
    strategy: {
      targetVariable: plan.targetVariable,
      problemType: plan.problemType,
      recommendedModels: plan.recommendedModels,
      keyFeatures: plan.keyFeatures || [],
      strategySteps: plan.strategySteps,
      predictedScoreRange: plan.predictedScoreRange || "N/A",
      winningTips: plan.winningTips || []
    },
    notebookCode: currentAggregatedCode,
    notebookCells: currentNotebookCells,
    criticReview: currentReview!,
    iterationHistory: iterationHistory,
    edaInsights: plan.edaInsights,
    dataCleaningRecommendations: plan.dataCleaningRecommendations || [],
    leaderboardSimulation: {
      metric: "AUC", // Default, could be inferred
      entries: leaderboardEntries
    },
    schemaAnalysis: plan.schemaAnalysis,
    iterations: iteration + 1
  };
};

// Deprecated single-pass function (kept for interface safety if needed, but not used by App)
export const analyzeDatasetWithGemini = async () => { throw new Error("Use runMultiAgentAnalysis"); }

export const generateCleaningCode = async (summary: DatasetSummary, recommendations: string[]): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found in environment");

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Context: A dataset named ${summary.fileName} with columns: ${summary.columns.map(c => c.name).join(', ')}.
    
    Recommendations:
    ${recommendations.map(r => `- ${r}`).join('\n')}
    
    Task: Write a production-ready Python function named 'clean_data(df)' using Pandas that implements these exact recommendations. 
    Include comments explaining each step. Return ONLY the raw Python code, no markdown backticks.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });
    
    let text = response.text || "";
    text = text.replace(/^```python\n/, '').replace(/^```\n/, '').replace(/\n```$/, '');
    return text;
  } catch (error) {
    console.error("Gemini Code Gen Failed", error);
    throw error;
  }
};
📘 KaggleMate — Autonomous Multimodal Kaggle Data Scientist

A three-agent Gemini-powered system that analyzes datasets, builds ML pipelines, self-optimizes, and exports Kaggle-ready notebooks.

🚀 Overview

KaggleMate is a fully autonomous, multimodal AI system designed to replicate the workflow of a Kaggle Grandmaster.
It ingests raw datasets (CSV, PDF rulebooks, images, text notes), performs structured EDA, builds ML models, critiques its own code, iterates improvements, and finally exports a complete Jupyter Notebook ready for Kaggle or Colab.

Built using a closed-loop multi-agent system (Planner → Builder → Critic) powered by Gemini 2.5 Flash, KaggleMate turns hours of data science work into minutes.

🧠 Core Features
🔹 Autonomous Multi-Agent AI System

Planner Agent — Identifies target variable, problem type, model family, FE strategy, and CV methodology.

Builder Agent — Generates a production-ready .ipynb with preprocessing, feature engineering, model training, and submission generation.

Critic Agent — Detects data leakage, metric mismatches, overfitting, and logic issues; assigns a 0–100 quality score.

🔁 Self-Improving Iteration Loop

KaggleMate automatically cycles through:

Plan → Build → Critique → Refine


Up to 3 iterations, enhancing:

Model performance

Code quality

Feature engineering depth

Includes a Self-Improvement Plot and Optimization Timeline.

📊 Automated EDA & Data Intelligence
Smart Data Parsing

Auto-detects delimiters (,, ;, |, \t)

Validates UTF-8 encoding

Detects malformed rows

Infers column types (numeric, categorical, date)

Interactive Visualization

Numeric: Histograms, Area plots, Box plots

Categorical: Bar charts, Word clouds

Datetime: Time-series charts

PNG export for all charts

Schema & Domain Understanding

Table relationship inference (1–1, 1–many)

Auto-generated SQL JOIN queries

Business rule detection (e.g., age > 0)

Domain constraint violation reporting

Actionable Insights

Natural-language summaries of trends, outliers, correlations

Cleaning recommendations

One-click Pandas cleaning function generation

💻 Developer Tools
Notebook Export

Downloads a fully structured .ipynb containing:

Imports

EDA

Cleaning & preprocessing

Feature engineering

ML model training

Evaluation

Submission file creation

Markdown Report

Full project analysis exported as a .md report:

EDA

Strategy

Schema inference

Cleaning steps

Agent logs

Final notebook code

CSV Export

Previewed or cleaned datasets can be exported as CSV.

Syntax-Highlighted Code Viewer

With one-click copy buttons.

🎨 UI Features

Agent Terminal showing real-time Planner/Builder/Critic logs

Leaderboard Simulator predicting hypothetical Kaggle ranking

Session History saved to LocalStorage

Dark/Light theme

Drag-and-drop file uploads (CSV, PDF, images, text, multiple files)

🏗️ Architecture
            User Uploads (CSV | PDF | Images | Text)
                           │
                           ▼
                Multimodal Parser & Analyzer
                           │
      ┌──────────────┬───────────────┬──────────────┐
      │              │               │              │
      ▼              ▼               ▼              │
Planner Agent   Builder Agent   Critic Agent   (Iteration Loop)
 "The Brain"     "Engineer"      "Reviewer"          ↑
      └──────────────┴───────────────┴──────────────┘
                           │
                           ▼
        Output Artifacts (Notebook | Report | UI Results)

🛠️ Tech Stack

Frontend: React, TypeScript, Recharts

AI Engine: Gemini 2.5 Flash

Notebook Generator: JSON → .ipynb builder

Storage: LocalStorage (history)

Styling: TailwindCSS

📦 Installation
git clone https://github.com/yourusername/kagglemate.git
cd kagglemate
npm install
npm run dev

🧪 How to Use

Upload CSV(s), PDFs, images, or text files.

KaggleMate analyzes the dataset using multimodal reasoning.

Agents run the autonomous loop to build and refine the solution.

Explore EDA charts, insights, schema, and cleaning suggestions.

Download the complete .ipynb notebook or .md report.

Upload the notebook directly to Kaggle competitions.



🧩 Future Enhancements

Advanced hyperparameter tuning

Integration with Kaggle API for leaderboard scoring

Automated ensemble generation

Multi-model comparison dashboard

🏅 Contributing

Pull requests are welcome! Please open an issue first to discuss changes.

📜 License

MIT License

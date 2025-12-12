# 📘 KaggleMate — Autonomous Multimodal Kaggle Data Scientist

An autonomous, multi-agent system powered by Gemini 2.5 that analyzes datasets, builds optimal ML pipelines, self-optimizes, and exports Kaggle-ready Jupyter notebooks.



## 🚀 Overview

KaggleMate is designed to replicate and automate the complete end-to-end workflow of a top-tier Kaggle Grandmaster. It significantly reduces the hours of manual data science labor into just a few minutes of autonomous AI reasoning.

The system ingests a variety of raw inputs and transforms them into high-quality machine learning artifacts:

* **Raw Datasets** (CSVs)
* **Supporting Documents** (PDFs)
* **Diagrams** (Images)
* **Text Notes**

### Automated Workflow

KaggleMate performs the following critical data science steps autonomously:

* Automated Exploratory Data Analysis (EDA)
* Schema and relationship inference
* Advanced Feature Engineering strategy
* Optimal Model selection
* Production-ready Code generation
* Error detection and correction
* Iterative optimization
* Kaggle-ready Notebook export

---

## 🧠 Core Features

### 🔺 Autonomous Multi-Agent AI Engine

KaggleMate operates on a closed-loop, multi-agent system powered by Gemini 2.5 Flash, ensuring comprehensive and critical pipeline development. 

| Agent | Role | Key Responsibilities |
| :--- | :--- | :--- |
| **1. Planner Agent** | **"The Brain"** | Reads multimodal inputs, determines target variable & problem type (e.g., classification), recommends models (XGBoost, CatBoost), generates the Feature Engineering blueprint, and suggests CV approach. |
| **2. Builder Agent** | **"The Engineer"** | Generates the full production-ready Jupyter notebook code, implementing preprocessing, FE, CV training loops, evaluation, and submission file creation. Revises code based on Critic feedback and supports Model Switching. |
| **3. Critic Agent** | **"The Reviewer"** | Reviews generated code for data leakage, overfitting, metric/model pairing errors, and logic issues. Assigns a quality score (0–100) and **forces revision if score < 85**. |

### 🔁 Autonomous Iteration Loop

The system completes up to **3 cycles** of: **Plan → Build → Critique → Refine → Re-Evaluate**.

Each iteration is designed to improve:
* Model Score
* Code Correctness
* Feature Engineering Depth
* Pipeline Reliability

Outputs include a **Self-Improvement Plot** (score across iterations) and an **Optimization Timeline** (a log of what changed and why).

---

## 📊 Data Analysis & Auto-EDA

KaggleMate provides deep, actionable insights into the dataset through robust analysis.

### ✔ Robust Smart Data Ingestion

* Auto-detects delimiter (`,`, `;`, `|`, `\t`).
* Checks UTF-8 encoding.
* Detects malformed rows.
* Infers precise column types.

### ✔ Interactive EDA Visualizations

All visualizations are exportable as PNG.

| Column Type | Visualizations |
| :--- | :--- |
| **Numeric** | Histogram, Area Chart, Box Plot (with quartiles) |
| **Categorical** | Bar Chart, Word Cloud |
| **Datetime** | Time-series distribution |

### ✔ Schema & Domain Intelligence

* Relationship inference across multiple CSVs (1–1, 1–many).
* SQL JOIN generation for merging data.
* **Business rule detection**, e.g., $age > 0$ or $signup\_date \le order\_date$.
* Unique key violation detection.

### ✔ Actionable Insights & Cleaning

* Trend analysis and correlation comments.
* Missing value summary and outlier detection.
* Data quality scoring.
* Cleaning recommendations and **one-click generation of a `clean_data()` Pandas script**.

---

## 💻 Developer Tools & Outputs

KaggleMate provides highly organized, competition-ready outputs.

* **📘 Jupyter Notebook Export:** A ready-to-run `.ipynb` file containing: imports, EDA, preprocessing, Feature Engineering, model building, cross-validation scoring, and submission generation.
* **📝 Markdown Report Export:** A comprehensive report including insights, schema analysis, agent strategy, FE plan, and full agent logs.
* **📂 CSV Export:** The processed, feature-engineered preview data can be saved as a CSV.
* **💡 Syntax-Highlighted Code Viewer:** Every generated code block includes one-click copy functionality.

---

## 🎨 UI/UX Features

* **Real-time Agent Terminal:** See the agents' thought process and actions live.
* **Leaderboard Simulator:** Estimates your ranking based on the model's current score.
* **History System:** LocalStorage persistence ensures you never lose your work.
* Dark & Light Mode.
* Drag-and-drop multi-file upload for all input types.

---

---

## 🛠 Tech Stack
* Frontend: React + TypeScript
* AI Engine: Gemini 2.5 Flash (Multi-Agent System)
* Visualization: Recharts
* Styling: TailwindCSS
* Local Persistence: LocalStorage
* Notebook Builder: JSON-to-.ipynb exporter

---

---

## 📦 Installation
**To get started with KaggleMate, clone the repository and install dependencies:**

* Bash
* cd kagglemate
* npm install
* npm run dev

---

---

## 🧪 Usage.
* Upload your data (CSV(s)) and any supporting context (PDFs, Images, Text notes).

* KaggleMate parses the data and constructs the multimodal context.

* The autonomous agent loop runs (up to 3 iterations).

* Review: EDA visualizations, schema inference, and the optimization timeline.

* Download: The final Notebook (.ipynb), Markdown report, and Cleaned data (.csv).

* Upload the notebook directly to your Kaggle competition!

---

---

## 🔮 Future Enhancements

* Automated hyperparameter tuning (e.g., Optuna integration).

* Ensemble model generation (Stacking, Blending).

* Kaggle API leaderboard integration for direct submission.

* LLM-generated feature synthesis (creating entirely new features).

* Plug-in system for custom agents or modules.

---

---
## 🌐 Live Demo:
https://kaggle-mate.vercel.app/

---

**📜 License**
Distributed under the MIT License. See LICENSE for more information. © 2025

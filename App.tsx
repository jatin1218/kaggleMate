import React, { useState, useEffect } from 'react';
import { AppState, DatasetSummary, GeminiAnalysisResult, HistoryItem, AgentStage, AgentLog } from './types';
import { parseCSV } from './services/csvParser';
import { runMultiAgentAnalysis } from './services/geminiService';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import HistoryModal from './components/HistoryModal';
import AgentProgress from './components/AgentProgress';

const HISTORY_KEY = 'kagglemate_history';
const THEME_KEY = 'kagglemate_theme';

// Helper to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

// Helper to read text file
const fileToText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [datasetSummary, setDatasetSummary] = useState<DatasetSummary | null>(null);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Agent Loop State
  const [agentStage, setAgentStage] = useState<AgentStage>('PLANNING');
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([]);
  
  // History State
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Initialize Theme and History
  useEffect(() => {
    // History
    try {
      const stored = localStorage.getItem(HISTORY_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }

    // Theme
    try {
      const storedTheme = localStorage.getItem(THEME_KEY);
      if (storedTheme === 'light') {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    } catch (e) {
      console.error("Failed to load theme", e);
    }
  }, []);

  const addLog = (stage: AgentStage, message: string, agentName?: string) => {
    setAgentLogs(prev => [...prev, {
      id: Date.now().toString() + Math.random(),
      stage,
      agentName,
      message,
      timestamp: Date.now()
    }]);
  };

  const saveToHistory = (summary: DatasetSummary, analysis: GeminiAnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      fileName: summary.fileName,
      summary,
      analysis
    };
    
    const updatedHistory = [newItem, ...history].slice(0, 20); // Keep last 20
    setHistory(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setDatasetSummary(item.summary);
    setAnalysisResult(item.analysis);
    setAppState(AppState.COMPLETE);
    setIsHistoryOpen(false);
  };

  const handleFilesSelect = async (files: File[]) => {
    try {
      setAppState(AppState.ANALYZING_LOCAL);
      setAgentLogs([]);
      setErrorMsg(null);
      
      // 1. Classify Files
      const csvFiles = files.filter(f => f.name.toLowerCase().endsWith('.csv'));
      const textFiles = files.filter(f => f.name.toLowerCase().endsWith('.txt') || f.name.toLowerCase().endsWith('.md'));
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      const pdfFiles = files.filter(f => f.type === 'application/pdf');

      if (csvFiles.length === 0) {
        throw new Error("No CSV file found. Please upload at least one structured dataset file.");
      }

      // 2. Parse All CSVs
      // We parse all CSVs but identify the largest one as the "Primary" for EDA visualization
      let primarySummary: DatasetSummary | null = null;
      let largestSize = 0;
      const additionalContext: { fileName: string, summary?: any, textContent?: string }[] = [];

      // Process Images First (attach to primary later)
      const imagePromises = imageFiles.map(fileToBase64);
      const imagesBase64 = await Promise.all(imagePromises);

      // Process PDFs
      const pdfPromises = pdfFiles.map(async (file) => ({
        name: file.name,
        base64: await fileToBase64(file)
      }));
      const pdfsBase64 = await Promise.all(pdfPromises);

      // Process Text Files
      for (const txt of textFiles) {
        const content = await fileToText(txt);
        additionalContext.push({ fileName: txt.name, textContent: content });
      }

      // Process CSVs
      for (const csv of csvFiles) {
        const summary = await parseCSV(csv);
        
        // Add to context list for Gemini
        additionalContext.push({ fileName: csv.name, summary });

        // Check if this should be the primary visualization target
        if (csv.size > largestSize) {
          largestSize = csv.size;
          primarySummary = summary;
        }
      }

      if (!primarySummary) throw new Error("Failed to process primary dataset.");

      // Attach images and documents to primary summary for the Planner Agent
      primarySummary.contextImages = imagesBase64;
      primarySummary.contextDocuments = pdfsBase64;
      
      setDatasetSummary(primarySummary);
      
      // --- START MULTI-AGENT WORKFLOW ---
      setAppState(AppState.ANALYZING_AI);
      
      // Stage 1: Planning
      setAgentStage('PLANNING');
      addLog('PLANNING', `Initializing Multi-Agent System...`, "System");
      
      const analysis = await runMultiAgentAnalysis(
        primarySummary, 
        additionalContext, 
        (agentName, message) => {
           let stage: AgentStage = 'PLANNING';
           if (agentName.includes('Builder')) stage = agentName.includes('Revision') ? 'REVISION' : 'ACTION';
           if (agentName === 'Critic') stage = 'VALIDATION';
           
           setAgentStage(stage);
           addLog(stage, message, agentName);
        }
      );
      
      setAgentStage('COMPLETE');
      addLog('COMPLETE', 'Analysis Pipeline Finished.', "System");
      await new Promise(r => setTimeout(r, 500));

      setAnalysisResult(analysis);
      
      // 5. Save & Complete
      saveToHistory(primarySummary, analysis);
      setAppState(AppState.COMPLETE);

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred.");
      setAppState(AppState.ERROR);
    }
  };

  const reset = () => {
    setAppState(AppState.IDLE);
    setDatasetSummary(null);
    setAnalysisResult(null);
    setErrorMsg(null);
    setAgentLogs([]);
  };

  return (
    <div className="min-h-screen font-sans selection:bg-kaggle-blue/30 selection:text-kaggle-text">
      
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer group" onClick={reset}>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-kaggle-blue to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(32,190,255,0.4)] group-hover:shadow-[0_0_20px_rgba(32,190,255,0.6)] transition-all duration-300">
              <span className="font-bold text-white text-lg">K</span>
            </div>
            <span className="font-bold text-lg tracking-tight text-kaggle-text group-hover:text-kaggle-blue transition-colors">
              KaggleMate
            </span>
          </div>
          
          <div className="flex items-center gap-6">
             <button 
               onClick={() => setIsHistoryOpen(true)}
               className="flex items-center gap-2 text-sm font-medium text-kaggle-muted hover:text-kaggle-text transition-colors px-3 py-1.5 rounded-md hover:bg-surfaceHighlight"
             >
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6M6 20V10M18 20V4"/></svg>
               History
             </button>
             <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-kaggle-muted bg-surfaceHighlight/50 px-3 py-1 rounded-full border border-border">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               System Online
             </div>
          </div>
        </div>
      </nav>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 min-h-screen flex flex-col">
        
        {appState === AppState.IDLE && (
          <div className="flex-1 flex flex-col items-center justify-center animate-fade-in">
            {/* Hero Section */}
            <div className="text-center mb-16 max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-kaggle-blue/10 border border-kaggle-blue/20 text-kaggle-blue text-xs font-semibold tracking-wide uppercase mb-6 animate-slide-up" style={{animationDelay: '0.1s'}}>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-kaggle-blue opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-kaggle-blue"></span>
                </span>
                AI Data Scientist Agent
              </div>
              
              <h1 className="text-5xl md:text-7xl font-bold text-kaggle-text mb-6 leading-[1.1] tracking-tight animate-slide-up" style={{animationDelay: '0.2s'}}>
                Win Competitions with <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-kaggle-blue via-cyan-400 to-indigo-500">Multimodal Intelligence</span>
              </h1>
              
              <p className="text-lg text-kaggle-muted max-w-2xl mx-auto leading-relaxed animate-slide-up" style={{animationDelay: '0.3s'}}>
                Upload datasets, diagrams, and rules. KaggleMate performs <span className="text-kaggle-text font-medium">Schema Inference</span>, auto-generates <span className="text-kaggle-text font-medium">SQL Joins</span>, and writes the <span className="text-kaggle-text font-medium">winning baseline code</span>.
              </p>
            </div>
            
            {/* Upload Section */}
            <div className="w-full animate-slide-up" style={{animationDelay: '0.4s'}}>
              <FileUpload onFilesSelect={handleFilesSelect} />
            </div>

            {/* Feature Grid */}
            <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-slide-up" style={{animationDelay: '0.5s'}}>
              {[
                { 
                  icon: "⚡", 
                  title: "Planner Agent", 
                  desc: "Analyses problem type and creates a winning feature strategy." 
                },
                { 
                  icon: "🛠️", 
                  title: "Builder Agent", 
                  desc: "Writes production-ready, modular PyTorch/XGBoost notebooks." 
                },
                { 
                  icon: "🔍", 
                  title: "Critic Agent", 
                  desc: "Reviews code for leakage, overfitting, and logic errors." 
                }
              ].map((feature, i) => (
                <div key={i} className="glass-card glass-card-hover p-6 rounded-xl flex flex-col items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surfaceHighlight flex items-center justify-center text-xl border border-border">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-bold text-kaggle-text text-base mb-1">{feature.title}</h3>
                    <p className="text-sm text-kaggle-muted leading-relaxed">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {(appState === AppState.ANALYZING_LOCAL) && (
          <div className="flex flex-col items-center justify-center flex-1">
            <div className="relative w-20 h-20 mb-8">
              <div className="absolute inset-0 border-t-2 border-kaggle-blue rounded-full animate-spin"></div>
              <div className="absolute inset-3 border-r-2 border-cyan-500 rounded-full animate-spin reverse opacity-70"></div>
            </div>
            <h2 className="text-xl font-mono font-medium text-kaggle-text mb-2 tracking-wide">
              PARSING INPUTS
            </h2>
            <p className="text-kaggle-muted text-sm font-mono">
              Analyzing CSV structures and reading context files...
            </p>
          </div>
        )}

        {(appState === AppState.ANALYZING_AI) && (
           <div className="flex flex-col items-center justify-center flex-1 py-12 w-full max-w-4xl mx-auto">
             <div className="w-full mb-8 flex items-center justify-between">
               <h2 className="text-2xl font-bold text-kaggle-text flex items-center gap-3">
                 <span className="w-2 h-2 rounded-full bg-kaggle-blue animate-pulse"></span>
                 Multi-Agent System Active
               </h2>
               <span className="text-xs font-mono text-kaggle-muted bg-surfaceHighlight px-2 py-1 rounded border border-border">
                 SESSION ID: {Math.random().toString(36).substring(7).toUpperCase()}
               </span>
             </div>
             <AgentProgress stage={agentStage} logs={agentLogs} />
           </div>
        )}

        {appState === AppState.ERROR && (
          <div className="flex flex-col items-center justify-center flex-1">
             <div className="glass-card p-8 rounded-2xl max-w-md w-full text-center border-red-500/20">
                <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 mb-6 mx-auto border border-red-500/20">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </div>
                <h2 className="text-xl font-bold text-kaggle-text mb-2">Analysis Failed</h2>
                <p className="text-kaggle-muted mb-8 text-sm">{errorMsg}</p>
                <button 
                  onClick={reset}
                  className="w-full py-3 bg-surfaceHighlight hover:bg-surface border border-border text-kaggle-text rounded-lg transition-all font-medium text-sm"
                >
                  Return to Dashboard
                </button>
             </div>
          </div>
        )}

        {appState === AppState.COMPLETE && datasetSummary && analysisResult && (
          <Dashboard 
            summary={datasetSummary} 
            analysis={analysisResult} 
            onReset={reset}
          />
        )}
      </main>

      <HistoryModal 
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelect={handleHistorySelect}
        onClear={handleClearHistory}
      />
    </div>
  );
};

export default App;
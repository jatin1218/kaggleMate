import React, { useState, useMemo, useEffect } from 'react';
import { DatasetSummary, GeminiAnalysisResult, NotebookCell } from '../types';
import CodeBlock from './CodeBlock';
import { generateCleaningCode } from '../services/geminiService';
import LeaderboardSim from './LeaderboardSim';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line
} from 'recharts';
import { toPng } from 'html-to-image';

interface DashboardProps {
  summary: DatasetSummary;
  analysis: GeminiAnalysisResult;
  onReset: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ summary, analysis, onReset }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'optimization' | 'eda' | 'schema' | 'data' | 'code' | 'leaderboard'>('strategy');
  const [selectedColIndex, setSelectedColIndex] = useState<number>(0);
  const [vizType, setVizType] = useState<'default' | 'alternative'>('default');
  
  const [cleaningCode, setCleaningCode] = useState<string | null>(null);
  const [isGeneratingCleaning, setIsGeneratingCleaning] = useState(false);
  
  const [isDarkMode, setIsDarkMode] = useState(true);

  const { strategy, edaInsights, notebookCells, dataCleaningRecommendations, leaderboardSimulation, schemaAnalysis, criticReview, iterationHistory } = analysis;
  
  const COLORS = ['#20BEFF', '#818cf8', '#34d399', '#f472b6', '#fbbf24'];
  const selectedColumn = summary.columns[selectedColIndex];

  useEffect(() => {
    // Sync state with DOM on mount
    setIsDarkMode(document.documentElement.classList.contains('dark'));
    setVizType('default');
  }, [selectedColIndex]);
  
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    setIsDarkMode(isDark);
    localStorage.setItem('kagglemate_theme', isDark ? 'dark' : 'light');
  };

  const handleGenerateCleaningCode = async () => {
    if (!dataCleaningRecommendations || dataCleaningRecommendations.length === 0) return;
    setIsGeneratingCleaning(true);
    try {
      const code = await generateCleaningCode(summary, dataCleaningRecommendations);
      setCleaningCode(code);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingCleaning(false);
    }
  };

  const handleExportReport = () => {
    const reportLines = [
      `# KaggleMate Analysis Report: ${summary.fileName}`,
      `Generated on: ${new Date().toLocaleString()}`,
      '',
      '## 1. Executive Summary',
      `- **Target Variable:** ${strategy.targetVariable || "Unknown"}`,
      `- **Problem Type:** ${strategy.problemType}`,
      `- **Estimated Score Range:** ${strategy.predictedScoreRange}`,
      '',
      '## 2. Winning Strategy',
      ...strategy.strategySteps.map((step, i) => `${i + 1}. **${step.title}** (${step.priority})\n   ${step.description}`),
      '',
      '## 3. Data Architecture & Schema',
      schemaAnalysis ? schemaAnalysis.combinedSchemaDescription : 'N/A',
      '',
      '## 4. Automated EDA Insights',
      edaInsights,
      '',
      '## 5. Optimization History',
      ...(iterationHistory ? iterationHistory.map(h => `- Iteration ${h.iteration}: ${h.modelUsed} (Score: ${h.score}) - ${h.changesMade}`) : []),
      '',
      '## 6. Data Cleaning Actions',
      ...(dataCleaningRecommendations && dataCleaningRecommendations.length > 0 
          ? dataCleaningRecommendations.map(rec => `- ${rec}`) 
          : ['No specific recommendations.']),
    ];

    const reportContent = reportLines.join('\n');
    const blob = new Blob([reportContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KaggleMate_Report_${summary.fileName.split('.')[0]}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadIpynb = () => {
    if (!notebookCells || notebookCells.length === 0) {
      // Fallback if notebookCells is missing but notebookCode exists (legacy)
      const codeCell = {
         cell_type: "code",
         execution_count: null,
         metadata: {},
         outputs: [],
         source: [analysis.notebookCode]
      };
      downloadIpynb([codeCell]);
      return;
    }

    const cells = notebookCells.map(cell => ({
      cell_type: cell.type,
      metadata: {},
      source: cell.content.split('\n').map(line => line + '\n'),
      ...(cell.type === 'code' ? { execution_count: null, outputs: [] } : {})
    }));

    downloadIpynb(cells);
  };

  const downloadIpynb = (cells: any[]) => {
    const notebook = {
      cells: cells,
      metadata: {
        kernelspec: {
          display_name: "Python 3",
          language: "python",
          name: "python3"
        },
        language_info: {
          codemirror_mode: {
            name: "ipython",
            version: 3
          },
          file_extension: ".py",
          mimetype: "text/x-python",
          name: "python",
          nbconvert_exporter: "python",
          pygments_lexer: "ipython3",
          version: "3.8.5"
        }
      },
      nbformat: 4,
      nbformat_minor: 4
    };

    const blob = new Blob([JSON.stringify(notebook, null, 1)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `KaggleMate_${summary.fileName.split('.')[0]}.ipynb`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadCSV = () => {
    if (!summary.preview || summary.preview.length === 0) return;
    const headers = summary.columns.map(col => col.name);
    const csvRows = [headers.join(',')];
    summary.preview.forEach(row => {
      const values = headers.map(header => {
        const val = row[header];
        const escaped = (val === null || val === undefined ? '' : String(val)).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `processed_${summary.fileName}`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadChart = async (elementId: string, fileName: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;
    try {
      const isDark = document.documentElement.classList.contains('dark');
      const bgColor = isDark ? '#0f172a' : '#ffffff';
      const dataUrl = await toPng(element, { backgroundColor: bgColor });
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Failed to download chart", err);
    }
  };

  const graphData = useMemo(() => {
    if (!selectedColumn.stats) return [];
    if (selectedColumn.type === 'numeric' && selectedColumn.stats.histogram) return selectedColumn.stats.histogram;
    if (selectedColumn.type === 'date' && selectedColumn.stats.histogram) return selectedColumn.stats.histogram;
    if (selectedColumn.type === 'string' && selectedColumn.stats.topValues) {
      return vizType === 'default' ? selectedColumn.stats.topValues.slice(0, 10) : selectedColumn.stats.topValues;
    }
    return [];
  }, [selectedColumn, vizType]);

  const renderBoxPlot = () => {
    const s = selectedColumn.stats;
    if (!s || !s.quantiles || s.min === undefined || s.max === undefined) return null;
    const { min, max } = s;
    const { q1, median, q3 } = s.quantiles;
    const range = (max - min) || 1; 
    const getX = (val: number) => `${((val - min) / range) * 100}%`;

    return (
      <div className="h-full w-full flex flex-col items-center justify-center p-4">
        <svg width="100%" height="100" className="overflow-visible">
          <line x1="0" y1="50%" x2="100%" y2="50%" stroke="var(--color-text-muted)" strokeWidth="1" opacity="0.5" />
          <line x1={getX(min)} y1="50%" x2={getX(max)} y2="50%" stroke="var(--color-text-muted)" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" />
          <rect x={getX(q1)} y="35%" width={`${((q3 - q1) / range) * 100}%`} height="30%" stroke="#20BEFF" strokeWidth="2" fill="#20BEFF" fillOpacity="0.1" rx="2" />
          <line x1={getX(median)} y1="35%" x2={getX(median)} y2="65%" stroke="currentColor" strokeWidth="2" />
          <line x1={getX(min)} y1="40%" x2={getX(min)} y2="60%" stroke="#20BEFF" strokeWidth="2" />
          <line x1={getX(max)} y1="40%" x2={getX(max)} y2="60%" stroke="#20BEFF" strokeWidth="2" />
          
          <text x={getX(min)} y="80%" fill="currentColor" opacity="0.6" fontSize="10" textAnchor="middle">{min.toFixed(1)}</text>
          <text x={getX(max)} y="80%" fill="currentColor" opacity="0.6" fontSize="10" textAnchor="middle">{max.toFixed(1)}</text>
          <text x={getX(median)} y="25%" fill="currentColor" fontSize="10" textAnchor="middle">{median.toFixed(1)}</text>
        </svg>
      </div>
    );
  };

  const renderWordCloud = () => {
     if (!graphData.length) return null;
     const maxVal = Math.max(...graphData.map(d => d.value));
     const minVal = Math.min(...graphData.map(d => d.value));
     return (
       <div className="flex flex-wrap gap-2 items-center justify-center p-4 h-full overflow-y-auto content-center">
         {graphData.map((item, i) => {
            const size = 0.75 + ((item.value - minVal) / (maxVal - minVal || 1)) * 1.25;
            const opacity = 0.5 + ((item.value - minVal) / (maxVal - minVal || 1)) * 0.5;
            return (
              <span key={i} style={{ fontSize: `${size}rem`, opacity, color: COLORS[i % COLORS.length] }} className="font-mono hover:opacity-100 transition-opacity cursor-default" title={`${item.name}: ${item.value}`}>
                {item.name}
              </span>
            )
         })}
       </div>
     )
  }

  // Iteration Data for Optimization Tab
  const iterationData = useMemo(() => {
    return iterationHistory?.map((h) => ({
      name: `Iter ${h.iteration}`,
      score: h.score,
      model: h.modelUsed,
      changes: h.changesMade
    })) || [];
  }, [iterationHistory]);

  return (
    <div className="w-full max-w-7xl mx-auto animate-fade-in pb-12">
      
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 pb-6 border-b border-border">
        <div>
          <h2 className="text-2xl font-bold text-kaggle-text flex items-center gap-3">
             <span className="p-2 rounded bg-surfaceHighlight border border-border">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
             </span>
             {summary.fileName}
          </h2>
          <div className="flex gap-4 mt-2 text-xs font-mono text-kaggle-muted ml-12">
            <span>{summary.rowCount.toLocaleString()} ROWS</span>
            <span className="text-border">|</span>
            <span>{summary.columns.length} COLS</span>
             {summary.contextImages && summary.contextImages.length > 0 && (
               <>
                <span className="text-border">|</span>
                <span className="text-kaggle-blue flex items-center gap-1">
                  MULTIMODAL ON
                </span>
               </>
             )}
          </div>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={toggleTheme}
             className="px-3 py-2 text-sm font-medium text-kaggle-muted hover:text-kaggle-text transition-colors border border-transparent hover:border-border rounded-md"
           >
             {isDarkMode ? 'Light' : 'Dark'}
           </button>
           <button 
             onClick={handleExportReport}
             className="px-4 py-2 text-sm font-medium text-kaggle-text bg-kaggle-blue/10 border border-kaggle-blue/50 hover:bg-kaggle-blue/20 rounded-md transition-all flex items-center gap-2 group"
           >
             <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
             Download Report
           </button>
           <button onClick={onReset} className="px-4 py-2 text-sm font-medium text-kaggle-muted hover:text-kaggle-text transition-colors border border-transparent hover:border-border rounded-md">
            New Analysis
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-8 overflow-x-auto">
        {['strategy', 'optimization', 'eda', 'schema', 'data', 'code', 'leaderboard'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-3 text-sm font-medium transition-all relative whitespace-nowrap
              ${activeTab === tab ? 'text-kaggle-text' : 'text-kaggle-muted hover:text-kaggle-text'}
            `}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-kaggle-blue shadow-[0_0_8px_rgba(32,190,255,0.5)]"></span>
            )}
          </button>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column (Main Content) */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === 'strategy' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="glass-card p-5 rounded-lg border-l-4 border-l-green-500">
                  <h3 className="text-kaggle-muted text-xs uppercase tracking-wider mb-1 font-semibold">Target Variable</h3>
                  <p className="text-lg font-mono text-kaggle-text break-all">{strategy.targetVariable || "N/A"}</p>
                </div>
                <div className="glass-card p-5 rounded-lg border-l-4 border-l-kaggle-blue">
                  <h3 className="text-kaggle-muted text-xs uppercase tracking-wider mb-1 font-semibold">Problem Type</h3>
                  <p className="text-lg font-bold text-kaggle-text">{strategy.problemType}</p>
                </div>
              </div>

              {/* CRITIC AGENT REVIEW BLOCK */}
              {criticReview && (
                <div className={`glass-card p-6 rounded-xl border-l-4 ${criticReview.score > 80 ? 'border-l-green-500' : criticReview.score > 60 ? 'border-l-yellow-500' : 'border-l-red-500'}`}>
                   <div className="flex justify-between items-start mb-4">
                     <h3 className="text-lg font-bold text-kaggle-text flex items-center gap-2">
                       <span className="text-xl">🧐</span> Critic Agent Review
                     </h3>
                     <div className={`px-3 py-1 rounded-full text-sm font-bold ${criticReview.score > 80 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                       Score: {criticReview.score}/100
                     </div>
                   </div>
                   <p className="text-sm text-kaggle-muted mb-4">{criticReview.overallSummary}</p>
                   
                   <div className="space-y-3">
                     {criticReview.critiquePoints.map((point, i) => (
                       <div key={i} className="bg-surfaceHighlight/30 p-3 rounded border border-border text-sm">
                         <div className="flex gap-2 items-center mb-1">
                           <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase
                             ${point.severity === 'Critical' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400'}
                           `}>{point.severity}</span>
                           <span className="font-semibold text-kaggle-text">{point.category}</span>
                         </div>
                         <p className="text-kaggle-muted mb-1">{point.message}</p>
                         <p className="text-kaggle-blue text-xs italic"> Suggestion: {point.suggestion}</p>
                       </div>
                     ))}
                   </div>
                </div>
              )}

              <div className="glass-card rounded-xl overflow-hidden">
                <div className="p-5 border-b border-border bg-surfaceHighlight/30 flex items-center justify-between">
                  <h3 className="font-bold text-kaggle-text text-sm uppercase tracking-wide">Execution Strategy</h3>
                </div>
                <div className="divide-y divide-border">
                  {strategy.strategySteps.map((step, idx) => (
                    <div key={idx} className="p-5 flex gap-4 hover:bg-surfaceHighlight/20 transition-colors">
                      <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold mt-0.5 shrink-0 border
                          ${step.priority === 'High' ? 'border-red-500/30 bg-red-500/10 text-red-400' : 
                            step.priority === 'Medium' ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400' : 
                            'border-blue-500/30 bg-blue-500/10 text-blue-400'}`}>
                           {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-kaggle-text text-sm">{step.title}</h4>
                        </div>
                        <p className="text-sm text-kaggle-muted leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'optimization' && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card p-6 rounded-xl">
                 <h3 className="text-lg font-bold mb-6 text-kaggle-text flex items-center gap-2">
                   <span className="text-kaggle-blue">📈</span> Self-Improvement Loop
                 </h3>
                 
                 <div className="h-64 w-full mb-8">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={iterationData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                         <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                         <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                         <YAxis domain={[0, 100]} stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                         <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '4px', fontSize: '12px' }} />
                         <Line type="monotone" dataKey="score" stroke="#20BEFF" strokeWidth={2} dot={{ r: 4, fill: '#20BEFF' }} activeDot={{ r: 6 }} />
                      </LineChart>
                    </ResponsiveContainer>
                 </div>

                 <div className="space-y-4">
                    <h4 className="text-xs font-bold text-kaggle-muted uppercase tracking-wider mb-2">Optimization Timeline</h4>
                    <div className="relative border-l border-border ml-3 pl-6 space-y-6">
                       {iterationHistory && iterationHistory.map((h, idx) => (
                         <div key={idx} className="relative">
                            <span className="absolute -left-[30px] top-0 w-3 h-3 rounded-full bg-kaggle-blue border-2 border-surface"></span>
                            <div className="flex justify-between items-start mb-1">
                               <div className="font-bold text-kaggle-text text-sm">Iteration {h.iteration}</div>
                               <div className={`text-xs px-2 py-0.5 rounded ${h.score > 85 ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>Score: {h.score}</div>
                            </div>
                            <div className="bg-surfaceHighlight/30 p-3 rounded border border-border">
                               <div className="mb-2 flex items-center gap-2">
                                  <span className="text-xs font-mono text-kaggle-muted bg-surfaceHighlight px-1.5 rounded">Model: {h.modelUsed}</span>
                                  <span className="text-xs text-kaggle-muted">{new Date(h.timestamp).toLocaleTimeString()}</span>
                               </div>
                               <p className="text-sm text-kaggle-muted mb-2">
                                 <span className="text-kaggle-blue font-semibold">Changes:</span> {h.changesMade}
                               </p>
                               <p className="text-xs text-kaggle-muted italic border-t border-border pt-2 mt-2">
                                 " {h.critiqueSummary} "
                               </p>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'schema' && schemaAnalysis && (
            <div className="space-y-6 animate-fade-in">
              <div className="glass-card p-6 rounded-xl">
                <h3 className="text-lg font-bold mb-4 text-kaggle-text">Data Architecture Overview</h3>
                <div className="prose prose-sm max-w-none text-kaggle-muted dark:prose-invert">
                  <p>{schemaAnalysis.combinedSchemaDescription}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="glass-card p-6 rounded-xl">
                  <h3 className="text-sm font-bold text-kaggle-text uppercase tracking-wide mb-4">Inferred Relationships</h3>
                  {schemaAnalysis.relationships.length > 0 ? (
                    <div className="space-y-4">
                      {schemaAnalysis.relationships.map((rel, idx) => (
                         <div key={idx} className="flex flex-col md:flex-row gap-4 p-4 rounded bg-surfaceHighlight/20 border border-border">
                            <div className="flex items-center gap-2 flex-1">
                              <span className="font-mono text-sm text-kaggle-blue font-bold">{rel.sourceTable}.{rel.sourceColumn}</span>
                              <span className="text-kaggle-muted">→</span>
                              <span className="font-mono text-sm text-kaggle-blue font-bold">{rel.targetTable}.{rel.targetColumn}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20">{rel.type}</span>
                            </div>
                         </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-kaggle-muted">No explicit cross-table relationships detected.</p>
                  )}
                </div>

                <div className="glass-card p-6 rounded-xl border-l-4 border-l-yellow-500/30">
                  <h3 className="text-sm font-bold text-kaggle-text uppercase tracking-wide mb-4">Domain Constraints</h3>
                  {schemaAnalysis.domainConstraints.length > 0 ? (
                     <div className="space-y-2">
                       {schemaAnalysis.domainConstraints.map((con, idx) => (
                         <div key={idx} className="flex gap-3 text-sm">
                           <span className={`mt-1 w-2 h-2 rounded-full ${con.severity === 'Critical' ? 'bg-red-500' : 'bg-yellow-500'}`}></span>
                           <div>
                             <p className="text-kaggle-text font-medium">{con.constraint}</p>
                             <p className="text-xs text-kaggle-muted font-mono mt-0.5">{con.validationRule}</p>
                           </div>
                         </div>
                       ))}
                     </div>
                  ) : (
                    <p className="text-sm text-kaggle-muted">No specific domain constraints inferred.</p>
                  )}
                </div>
              </div>

              <div className="glass-card p-6 rounded-xl">
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-kaggle-text uppercase tracking-wide">Auto-Generated SQL</h3>
                 </div>
                 <CodeBlock code={schemaAnalysis.generatedSQL} />
              </div>
            </div>
          )}

          {activeTab === 'eda' && (
             <div className="space-y-6 animate-fade-in">
                {summary.contextImages && summary.contextImages.length > 0 && (
                   <div className="grid grid-cols-3 gap-4 mb-2">
                     {summary.contextImages.map((img, idx) => (
                       <div key={idx} className="glass-card p-1 rounded-lg relative group overflow-hidden">
                          <img src={img} alt={`Context`} className="w-full h-32 object-cover rounded opacity-70 group-hover:opacity-100 transition-all" />
                       </div>
                     ))}
                   </div>
                )}

                <div className="glass-card p-8 rounded-xl">
                  <h3 className="text-lg font-bold mb-6 text-kaggle-text flex items-center gap-2">
                    <span className="text-kaggle-blue">⚡</span> Automated Insights
                  </h3>
                  <div className="prose prose-sm max-w-none text-kaggle-muted dark:prose-invert">
                    <div className="whitespace-pre-wrap font-sans leading-relaxed">
                      {edaInsights}
                    </div>
                  </div>
                </div>

                {dataCleaningRecommendations && dataCleaningRecommendations.length > 0 && (
                   <div className="glass-card p-6 rounded-xl border-l-4 border-l-yellow-500/50">
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-kaggle-text text-sm uppercase tracking-wide">Data Cleaning Actions</h3>
                        {!cleaningCode && (
                          <button
                            onClick={handleGenerateCleaningCode}
                            disabled={isGeneratingCleaning}
                            className="text-xs bg-surfaceHighlight hover:bg-surface border border-border text-kaggle-text px-3 py-1.5 rounded transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {isGeneratingCleaning ? 'Generating...' : 'Generate Python Script'}
                          </button>
                        )}
                     </div>
                     <ul className="space-y-2 mb-4">
                       {dataCleaningRecommendations.map((rec, idx) => (
                         <li key={idx} className="flex gap-3 text-sm text-kaggle-muted">
                           <span className="text-yellow-500/50">•</span>
                           <span>{rec}</span>
                         </li>
                       ))}
                     </ul>
                     {cleaningCode && (
                       <div className="mt-4 pt-4 border-t border-border">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-mono text-kaggle-muted">clean_data.py</span>
                            <button onClick={() => setCleaningCode(null)} className="text-xs text-kaggle-blue hover:underline">Dismiss</button>
                         </div>
                         <CodeBlock code={cleaningCode} />
                       </div>
                     )}
                   </div>
                )}

                <div className="glass-card p-6 rounded-xl min-h-[450px]">
                  <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                    <h3 className="text-sm font-bold text-kaggle-text uppercase tracking-wide">Feature Distribution</h3>
                    <div className="flex gap-2 items-center">
                      <button 
                        onClick={() => handleDownloadChart('visualizer-chart-content', `kagglemate_viz_${selectedColumn.name}`)}
                        className="p-1.5 bg-surfaceHighlight border border-border rounded text-kaggle-muted hover:text-kaggle-text transition-colors mr-2"
                        title="Download Chart as PNG"
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      </button>

                      {selectedColumn.type === 'numeric' && (
                        <div className="flex bg-surfaceHighlight rounded p-0.5 border border-border">
                          <button onClick={() => setVizType('default')} className={`px-2 py-1 text-[10px] rounded transition-all ${vizType === 'default' ? 'bg-kaggle-blue text-surface font-bold' : 'text-kaggle-muted hover:text-kaggle-text'}`}>HIST</button>
                          <button onClick={() => setVizType('alternative')} className={`px-2 py-1 text-[10px] rounded transition-all ${vizType === 'alternative' ? 'bg-kaggle-blue text-surface font-bold' : 'text-kaggle-muted hover:text-kaggle-text'}`}>BOX</button>
                        </div>
                      )}
                       {selectedColumn.type === 'string' && (
                        <div className="flex bg-surfaceHighlight rounded p-0.5 border border-border">
                          <button onClick={() => setVizType('default')} className={`px-2 py-1 text-[10px] rounded transition-all ${vizType === 'default' ? 'bg-kaggle-blue text-surface font-bold' : 'text-kaggle-muted hover:text-kaggle-text'}`}>BAR</button>
                          <button onClick={() => setVizType('alternative')} className={`px-2 py-1 text-[10px] rounded transition-all ${vizType === 'alternative' ? 'bg-kaggle-blue text-surface font-bold' : 'text-kaggle-muted hover:text-kaggle-text'}`}>CLOUD</button>
                        </div>
                      )}
                      <select value={selectedColIndex} onChange={(e) => setSelectedColIndex(Number(e.target.value))} className="bg-surfaceHighlight border border-border text-kaggle-text text-xs rounded focus:ring-1 focus:ring-kaggle-blue block p-1.5 min-w-[150px]">
                        {summary.columns.map((col, idx) => (
                           <option key={idx} value={idx}>{col.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="h-80 w-full relative text-kaggle-text" id="visualizer-chart-content">
                    {graphData.length > 0 || (selectedColumn.type === 'numeric' && selectedColumn.stats?.quantiles) ? (
                      <ResponsiveContainer width="100%" height="100%">
                         {(selectedColumn.type === 'numeric') ? (
                            vizType === 'default' ? (
                              <AreaChart data={graphData}>
                                <defs>
                                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#20BEFF" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#20BEFF" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} dy={5} />
                                <YAxis stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '4px', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="value" stroke="#20BEFF" strokeWidth={2} fill="url(#colorVal)" />
                              </AreaChart>
                            ) : (
                              <div className="h-full w-full">{renderBoxPlot()}</div>
                            )
                         ) : (selectedColumn.type === 'date') ? (
                             <AreaChart data={graphData}>
                                <defs>
                                  <linearGradient id="colorDate" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f472b6" stopOpacity={0.4}/>
                                    <stop offset="95%" stopColor="#f472b6" stopOpacity={0}/>
                                  </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
                                <XAxis dataKey="name" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} minTickGap={30} axisLine={false} tickLine={false} dy={5} />
                                <YAxis stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '4px', fontSize: '12px' }} />
                                <Area type="monotone" dataKey="value" stroke="#f472b6" strokeWidth={2} fill="url(#colorDate)" />
                            </AreaChart>
                         ) : (
                           vizType === 'default' ? (
                             <BarChart data={graphData} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} vertical={false} opacity={0.5} />
                                <XAxis type="number" stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <YAxis dataKey="name" type="category" width={100} stroke="var(--color-text-muted)" tick={{fill: 'var(--color-text-muted)', fontSize: 10}} axisLine={false} tickLine={false} />
                                <RechartsTooltip cursor={{ fill: 'var(--bg-surface-highlight)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-primary)', borderRadius: '4px', fontSize: '12px' }} />
                                <Bar dataKey="value" fill="#20BEFF" radius={[0, 4, 4, 0]}>
                                   {graphData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                                </Bar>
                             </BarChart>
                           ) : (
                             <div className="h-full w-full">{renderWordCloud()}</div>
                           )
                         )}
                      </ResponsiveContainer>
                    ) : (
                       <div className="h-full flex items-center justify-center text-kaggle-muted text-sm">No visualization data available.</div>
                    )}
                  </div>
                </div>
             </div>
          )}

          {activeTab === 'data' && (
              <div className="space-y-6 animate-fade-in">
                  <div className="glass-card rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
                          <h3 className="font-bold text-kaggle-text text-sm uppercase">Raw Data Preview</h3>
                          <button onClick={handleDownloadCSV} className="text-xs text-kaggle-muted hover:text-kaggle-text underline">Export CSV</button>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar">
                          <table className="w-full text-left border-collapse">
                              <thead className="bg-surfaceHighlight text-xs font-mono text-kaggle-muted">
                                  <tr>
                                      {summary.columns.slice(0, 10).map((col, i) => (
                                          <th key={i} className="px-6 py-3 border-b border-border whitespace-nowrap">
                                              {col.name} <span className="opacity-50 ml-1">({col.type})</span>
                                          </th>
                                      ))}
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-border text-sm font-mono">
                                  {summary.preview.slice(0, 15).map((row, idx) => (
                                      <tr key={idx} className="hover:bg-surfaceHighlight/50 transition-colors">
                                          {summary.columns.slice(0, 10).map((col, colIdx) => (
                                              <td key={colIdx} className="px-6 py-2 text-kaggle-text whitespace-nowrap">
                                                  {row[col.name] !== undefined && row[col.name] !== null 
                                                      ? String(row[col.name]).length > 20 ? String(row[col.name]).substring(0, 20) + '...' : String(row[col.name])
                                                      : <span className="text-slate-500 opacity-50">null</span>
                                                  }
                                              </td>
                                          ))}
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'code' && (
             <div className="space-y-4 animate-fade-in">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-kaggle-text text-lg">Kaggle Notebook Solution</h3>
                  <button 
                    onClick={handleDownloadIpynb}
                    className="px-4 py-2 bg-kaggle-blue/10 border border-kaggle-blue/50 text-kaggle-text hover:bg-kaggle-blue/20 rounded-md transition-all flex items-center gap-2 font-medium text-sm group"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:-translate-y-0.5 transition-transform"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    Download .ipynb
                  </button>
               </div>
               
               {/* Render notebook cells if available, otherwise fallback to CodeBlock */}
               {notebookCells && notebookCells.length > 0 ? (
                 <div className="space-y-6">
                   {notebookCells.map((cell, idx) => (
                     <div key={idx} className="group">
                        {cell.type === 'markdown' ? (
                          <div className="prose prose-sm max-w-none text-kaggle-muted dark:prose-invert px-2">
                             {/* Simple markdown rendering by replacing headers */}
                             {cell.content.split('\n').map((line, i) => {
                               if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-bold text-kaggle-text mb-2 mt-4">{line.replace('# ', '')}</h1>
                               if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-bold text-kaggle-text mb-2 mt-4">{line.replace('## ', '')}</h2>
                               if (line.startsWith('### ')) return <h3 key={i} className="text-md font-bold text-kaggle-text mb-2 mt-4">{line.replace('### ', '')}</h3>
                               if (line.trim() === '') return <br key={i}/>
                               return <p key={i} className="mb-1">{line}</p>
                             })}
                          </div>
                        ) : (
                          <div className="relative">
                             <div className="absolute -left-3 top-4 text-xs font-mono text-kaggle-muted opacity-50 select-none">[{idx}]</div>
                             <div className="pl-4">
                               <div className="mb-1 text-xs font-mono text-kaggle-muted opacity-70">
                                 # {cell.title || 'Code Cell'}
                               </div>
                               <CodeBlock code={cell.content} />
                             </div>
                          </div>
                        )}
                     </div>
                   ))}
                 </div>
               ) : (
                  <CodeBlock code={analysis.notebookCode} />
               )}
             </div>
          )}

          {activeTab === 'leaderboard' && (
             <div className="space-y-4 animate-fade-in">
                <LeaderboardSim simulation={leaderboardSimulation} />
             </div>
          )}
        </div>

        {/* Right Column (Stats) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 rounded-xl">
             <h4 className="text-xs font-bold mb-4 text-kaggle-text uppercase tracking-wider">Dataset Columns</h4>
             <div className="space-y-3">
               {summary.columns.slice(0, 8).map((col, i) => (
                 <div key={i} className="flex justify-between items-center text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                   <div className="flex items-center gap-2">
                     <span className={`w-1.5 h-1.5 rounded-full ${col.type === 'numeric' ? 'bg-blue-400' : col.type === 'date' ? 'bg-pink-400' : 'bg-yellow-400'}`}></span>
                     <span className="font-mono text-kaggle-text opacity-90">{col.name}</span>
                   </div>
                   <div className="text-kaggle-muted">{col.type}</div>
                 </div>
               ))}
               {summary.columns.length > 8 && <div className="text-center text-xs text-kaggle-muted pt-2">+ {summary.columns.length - 8} more</div>}
             </div>
          </div>

          <div className="glass-card p-0 rounded-xl overflow-hidden border-indigo-500/20">
            <div className="p-6 bg-gradient-to-br from-indigo-900/20 to-purple-900/20">
               <h4 className="text-indigo-400 text-xs uppercase tracking-wide font-bold mb-2">Estimated Metric</h4>
               <div className="text-3xl font-bold text-kaggle-text mb-2">{strategy.predictedScoreRange}</div>
               <p className="text-xs text-indigo-300/60">Based on baseline complexity.</p>
            </div>
          </div>

           <div className="glass-card p-6 rounded-xl">
              <h4 className="text-xs font-bold mb-4 text-kaggle-text uppercase tracking-wider">Winning Tips</h4>
              <ul className="space-y-4">
                {strategy.winningTips.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm text-kaggle-muted">
                    <span className="text-kaggle-blue mt-0.5">•</span>
                    <span className="leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
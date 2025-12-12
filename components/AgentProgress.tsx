import React, { useEffect, useRef } from 'react';
import { AgentStage, AgentLog } from '../types';

interface AgentProgressProps {
  stage: AgentStage;
  logs: AgentLog[];
}

const steps: { id: AgentStage; label: string }[] = [
  { id: 'PLANNING', label: 'Plan' },
  { id: 'ACTION', label: 'Execute' },
  { id: 'VALIDATION', label: 'Validate' },
  { id: 'REVISION', label: 'Refine' },
];

const AgentProgress: React.FC<AgentProgressProps> = ({ stage, logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getStepStatus = (stepId: AgentStage) => {
    const order = ['PLANNING', 'ACTION', 'VALIDATION', 'REVISION', 'COMPLETE'];
    const currentIndex = order.indexOf(stage);
    const stepIndex = order.indexOf(stepId);

    if (stage === 'COMPLETE') return 'completed';
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <div className="w-full bg-surface border border-border rounded-xl overflow-hidden shadow-2xl animate-fade-in flex flex-col md:flex-row h-96">
      
      {/* Left Panel: Visual State */}
      <div className="w-full md:w-1/3 bg-surfaceHighlight/30 border-r border-border p-6 flex flex-col justify-center">
         <div className="space-y-6">
            {steps.map((step) => {
               const status = getStepStatus(step.id);
               return (
                 <div key={step.id} className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 transition-all duration-300
                      ${status === 'active' ? 'bg-kaggle-blue border-kaggle-blue shadow-[0_0_10px_rgba(32,190,255,0.5)]' : 
                        status === 'completed' ? 'bg-green-500 border-green-500' : 'border-slate-600 bg-transparent'}
                    `}></div>
                    <span className={`text-sm font-mono uppercase tracking-wider transition-colors
                       ${status === 'active' ? 'text-white font-bold' : status === 'completed' ? 'text-slate-400 line-through decoration-slate-600' : 'text-slate-600'}
                    `}>{step.label}</span>
                 </div>
               );
            })}
         </div>
         <div className="mt-8 pt-8 border-t border-border">
           <div className="text-[10px] text-kaggle-muted font-mono mb-2">CURRENT OP</div>
           <div className="text-white font-mono text-sm">
             {logs[logs.length - 1]?.message || "Initializing..."}
           </div>
         </div>
      </div>

      {/* Right Panel: Terminal Log */}
      <div className="w-full md:w-2/3 bg-[#0a0a0a] p-4 font-mono text-xs flex flex-col">
         <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5 text-slate-500">
            <span>TERMINAL OUTPUT</span>
            <span>bash</span>
         </div>
         <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1" ref={scrollRef}>
             {logs.map((log) => (
               <div key={log.id} className="flex gap-3">
                 <span className="text-slate-600 select-none">{new Date(log.timestamp).toLocaleTimeString([], {hour12: false, minute:'2-digit', second:'2-digit'})}</span>
                 <div className="flex-1 break-words">
                   <span className={`${
                     log.stage === 'PLANNING' ? 'text-purple-400' :
                     log.stage === 'ACTION' ? 'text-blue-400' :
                     log.stage === 'VALIDATION' ? 'text-yellow-400' :
                     log.stage === 'REVISION' ? 'text-orange-400' : 'text-green-400'
                   } font-bold mr-2`}>
                     [{log.stage}]
                   </span>
                   <span className="text-slate-300">{log.message}</span>
                 </div>
               </div>
             ))}
             {stage !== 'COMPLETE' && (
               <div className="animate-pulse text-kaggle-blue">_</div>
             )}
         </div>
      </div>
    </div>
  );
};

export default AgentProgress;
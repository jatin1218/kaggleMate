import React from 'react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect, onClear }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-kaggle-card border border-kaggle-border w-full max-w-2xl max-h-[80vh] rounded-xl shadow-2xl flex flex-col m-4 animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-kaggle-border">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="text-kaggle-blue">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            </span> 
            Analysis History
          </h2>
          <button 
            onClick={onClose}
            className="text-kaggle-secondary hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
          {history.length === 0 ? (
            <div className="text-center py-12 text-kaggle-secondary">
              <div className="mb-4 opacity-50">
                <svg className="mx-auto" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <p>No history yet.</p>
              <p className="text-sm">Analyze a dataset to save it here.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="bg-kaggle-dark border border-kaggle-border hover:border-kaggle-blue/50 rounded-lg p-4 cursor-pointer transition-all hover:bg-white/5 group"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-mono text-white font-medium mb-1 group-hover:text-kaggle-blue transition-colors">
                      {item.fileName}
                    </h3>
                    <div className="flex gap-3 text-xs text-kaggle-secondary">
                      <span>{new Date(item.timestamp).toLocaleDateString()} {new Date(item.timestamp).toLocaleTimeString()}</span>
                      <span>•</span>
                      <span>{item.summary.rowCount.toLocaleString()} rows</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-1 rounded text-[10px] font-bold bg-kaggle-blue/10 text-kaggle-blue border border-kaggle-blue/20">
                      {item.analysis.strategy.problemType}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                   <div className="text-xs text-kaggle-secondary truncate max-w-[80%]">
                      Target: <span className="text-white">{item.analysis.strategy.targetVariable}</span>
                   </div>
                   <div className="text-kaggle-blue opacity-0 group-hover:opacity-100 transition-opacity text-xs font-semibold flex items-center gap-1">
                     Load Report
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                   </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-kaggle-border flex justify-end">
            <button 
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/10"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              Clear History
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryModal;
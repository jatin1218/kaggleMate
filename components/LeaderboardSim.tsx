import React from 'react';
import { LeaderboardSimulation } from '../types';

interface LeaderboardSimProps {
  simulation: LeaderboardSimulation;
}

const LeaderboardSim: React.FC<LeaderboardSimProps> = ({ simulation }) => {
  return (
    <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
      <div className="p-4 border-b border-border flex justify-between items-center bg-surfaceHighlight/30">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-kaggle-text uppercase tracking-wide">
            Leaderboard Simulation
          </h3>
        </div>
        <div className="px-3 py-1 rounded bg-surface border border-border">
          <span className="text-[10px] text-kaggle-muted uppercase tracking-wider mr-2">Metric</span>
          <span className="text-sm font-mono font-bold text-kaggle-blue">{simulation.metric}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface/50 text-xs uppercase text-kaggle-muted font-semibold tracking-wider">
            <tr>
              <th className="px-6 py-4 border-b border-border w-16 text-center">#</th>
              <th className="px-6 py-4 border-b border-border">Competitor</th>
              <th className="px-6 py-4 border-b border-border text-right">Score</th>
              <th className="px-6 py-4 border-b border-border text-right">Entries</th>
              <th className="px-6 py-4 border-b border-border text-right">Last Sub</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {simulation.entries.sort((a,b) => a.rank - b.rank).map((entry, idx) => {
              const isUser = entry.teamName.includes('KaggleMate');
              return (
                <tr 
                  key={idx} 
                  className={`transition-colors ${
                    isUser 
                      ? 'bg-kaggle-blue/5 border-l-2 border-l-kaggle-blue' 
                      : 'hover:bg-surfaceHighlight/30 border-l-2 border-l-transparent'
                  }`}
                >
                  <td className="px-6 py-3 text-center font-mono text-kaggle-muted">
                    {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                       <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold uppercase border
                         ${isUser ? 'bg-kaggle-blue text-black border-kaggle-blue' : 'bg-surfaceHighlight text-kaggle-muted border-border'}
                       `}>
                         {entry.teamName.substring(0, 1)}
                       </div>
                      <div>
                        <span className={`font-medium block ${isUser ? 'text-kaggle-text' : 'text-kaggle-text opacity-90'}`}>
                          {entry.teamName}
                        </span>
                      </div>
                      {isUser && <span className="px-1.5 py-0.5 rounded-sm bg-kaggle-blue/20 text-kaggle-blue text-[9px] uppercase font-bold tracking-wide">YOU</span>}
                    </div>
                  </td>
                  <td className={`px-6 py-3 text-right font-mono font-medium ${isUser ? 'text-kaggle-text' : 'text-kaggle-muted'}`}>
                    {entry.score}
                  </td>
                  <td className="px-6 py-3 text-right text-kaggle-muted font-mono text-xs">
                    {entry.entries}
                  </td>
                   <td className="px-6 py-3 text-right text-kaggle-muted text-xs font-mono">
                    {entry.lastSubmission}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default LeaderboardSim;
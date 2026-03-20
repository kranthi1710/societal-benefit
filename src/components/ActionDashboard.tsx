import React from 'react';
import type { ActionPayload } from '../types';
import { AlertTriangle, HeartPulse, Car, Radio } from 'lucide-react';

interface ActionDashboardProps {
  actions: ActionPayload[];
}

const getSeverityStyles = (severity: string) => {
  switch (severity) {
    case 'CRITICAL': return { color: 'var(--status-critical)', bg: 'rgba(255, 42, 95, 0.15)' };
    case 'HIGH': return { color: 'var(--status-high)', bg: 'rgba(255, 140, 0, 0.15)' };
    case 'MEDIUM': return { color: 'var(--status-medium)', bg: 'rgba(255, 215, 0, 0.15)' };
    default: return { color: 'var(--status-low)', bg: 'rgba(0, 230, 118, 0.15)' };
  }
};

const getCategoryIcon = (cat: string) => {
  switch (cat) {
    case 'MEDICAL': return <HeartPulse size={30} aria-label="Medical Event" />;
    case 'EMERGENCY': return <AlertTriangle size={30} aria-label="Emergency Event" />;
    case 'TRAFFIC': return <Car size={30} aria-label="Traffic Event" />;
    default: return <Radio size={30} aria-label="News Event" />;
  }
};

export const ActionDashboard: React.FC<ActionDashboardProps> = ({ actions }) => {
  if (actions.length === 0) {
    return (
      <div 
        className="w-full max-w-4xl mx-auto mt-4 text-center text-[var(--text-muted)] text-lg font-light tracking-wide animate-enter delay-300"
        aria-live="polite"
      >
        Waiting for incoming reality streams...
      </div>
    );
  }

  return (
    <section 
      className="w-full max-w-4xl mx-auto mt-12 flex flex-col gap-8"
      aria-label="Verified Actions Feed"
    >
      <div className="flex items-center gap-6 mb-2 pl-2">
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          System Actions
        </h2>
        <div className="h-[2px] flex-1 bg-gradient-to-r from-[var(--border-glow)] to-transparent"></div>
      </div>
      
      <div className="flex flex-col gap-8" role="feed" aria-busy="false">
        {actions.map((action, idx) => {
          const { color, bg } = getSeverityStyles(action.severity);
          return (
            <article 
              key={idx} 
              className="glass-card flex flex-col md:flex-row gap-8 items-start animate-enter"
              style={{ padding: '2.5rem' }}
              tabIndex={0}
              aria-labelledby={`action-title-${idx}`}
            >
              <div 
                className="p-6 rounded-2xl shrink-0 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-[rgba(255,255,255,0.05)]"
                style={{ backgroundColor: bg, color: color, boxShadow: `0 0 40px ${bg}` }}
                aria-hidden="true"
              >
                {getCategoryIcon(action.category)}
              </div>
              
              <div className="flex-1 w-full flex flex-col justify-center">
                <div className="flex flex-wrap gap-4 items-center justify-between w-full mb-6">
                  <div className="flex gap-4">
                    <span 
                      className="status-badge" 
                      style={{ backgroundColor: bg, color: color, border: `1px solid ${color}` }}
                    >
                      <span className="w-2.5 h-2.5 rounded-full hidden sm:inline-block shadow" style={{ backgroundColor: color }}></span>
                      {action.severity}
                    </span>
                    <span className="status-badge bg-[rgba(255,255,255,0.05)] text-white border border-[rgba(255,255,255,0.1)] shadow-inner">
                      {action.category}
                    </span>
                  </div>
                  <span className="text-sm text-[var(--text-muted)] font-medium bg-[rgba(0,0,0,0.4)] px-4 py-1.5 rounded-xl border border-[rgba(255,255,255,0.05)] shadow-inner" aria-label={`Confidence score: ${(action.confidenceScore * 100).toFixed(0)} percent`}>
                    Confidence: <strong className="text-white ml-1">{(action.confidenceScore * 100).toFixed(1)}%</strong>
                  </span>
                </div>
                
                <h3 id={`action-title-${idx}`} className="text-2xl font-bold mb-6 text-white leading-snug">
                  {action.extractedIntent}
                </h3>
                
                <div className="code-block mt-2">
                  <span className="text-[12px] text-[var(--brand-cyan)] font-extrabold uppercase tracking-[0.2em] block mb-4 opacity-90 drop-shadow-md">
                    // Executing Sub-system Payload
                  </span>
                  <div className="flex items-start text-base gap-3">
                    <span className="text-[var(--brand-pink)] select-none mt-[2px] text-lg font-bold">&gt;</span>
                    <span className="text-gray-100 leading-relaxed font-semibold text-lg">
                      {action.recommendedAction}
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

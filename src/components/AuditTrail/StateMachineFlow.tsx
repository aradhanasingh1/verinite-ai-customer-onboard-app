// src/components/AuditTrail/StateMachineFlow.tsx
'use client';

import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Clock } from 'lucide-react';
import { TreeView } from './TreeView';
import { useState } from 'react';

interface StateTransition {
  state: string;
  timestamp: string;
  data?: {
    agentOutput?: {
      proposal?: string;
      confidence?: number;
      reasons?: string[];
      policy_refs?: string[];
      flags?: Record<string, any>;
      metadata?: {
        agent_name?: string;
        slot?: string;
        [key: string]: any;
      };
    };
    durationMs?: number;
  };
}

interface StateMachineFlowProps {
  history: StateTransition[];
  finalDecision?: string;
}

export function StateMachineFlow({ history, finalDecision }: StateMachineFlowProps) {
  const [expandedStates, setExpandedStates] = useState<Set<number>>(new Set([history.length - 1])); // Expand last state by default

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedStates);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedStates(newExpanded);
  };

  const getStateStyle = (state: string, proposal?: string) => {
    // Completed states
    if (state.includes('COMPLETED')) {
      if (proposal === 'approve') {
        return { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-300', icon: <CheckCircle2 size={16} /> };
      } else if (proposal === 'deny') {
        return { bg: 'from-red-500 to-rose-600', text: 'text-red-300', icon: <XCircle size={16} /> };
      } else if (proposal === 'escalate') {
        return { bg: 'from-amber-500 to-orange-600', text: 'text-amber-300', icon: <AlertTriangle size={16} /> };
      }
      return { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-300', icon: <CheckCircle2 size={16} /> };
    }
    
    // Started states
    if (state.includes('STARTED')) {
      return { bg: 'from-slate-500 to-gray-600', text: 'text-slate-300', icon: <Clock size={16} /> };
    }
    
    // Default
    return { bg: 'from-violet-500 to-purple-600', text: 'text-violet-300', icon: <div className="w-2 h-2 rounded-full bg-white" /> };
  };

  const formatStateName = (state: string) => {
    return state
      .replace(/_/g, ' ')
      .split(' ')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
          🔄
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">State Machine Flow</h3>
          <p className="text-xs text-slate-400">Orchestration state transitions and agent decisions</p>
        </div>
      </div>

      {/* State transitions */}
      <div className="relative">
        {/* Vertical connector line */}
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-white/20 via-white/10 to-transparent" />

        <div className="space-y-3">
          {history.map((transition, index) => {
            const style = getStateStyle(transition.state, transition.data?.agentOutput?.proposal);
            const isExpanded = expandedStates.has(index);
            const hasData = transition.data?.agentOutput;

            return (
              <div key={index} className="relative">
                {/* State card */}
                <button
                  onClick={() => hasData && toggleExpand(index)}
                  className={`w-full text-left group ${hasData ? 'cursor-pointer' : 'cursor-default'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* State icon */}
                    <div className={`relative z-10 w-12 h-12 rounded-xl bg-gradient-to-br ${style.bg} shadow-lg flex items-center justify-center transition-transform ${hasData ? 'group-hover:scale-110' : ''}`}>
                      <div className="text-white">
                        {style.icon}
                      </div>
                    </div>

                    {/* State content */}
                    <div className={`flex-1 bg-white/5 border border-white/10 rounded-xl p-4 transition-colors ${hasData ? 'hover:bg-white/8' : ''}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          {/* State name and timestamp */}
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="text-sm font-semibold text-white">{formatStateName(transition.state)}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{formatTimestamp(transition.timestamp)}</span>
                            {transition.data?.durationMs && (
                              <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                                {transition.data.durationMs}ms
                              </span>
                            )}
                          </div>

                          {/* Agent info */}
                          {hasData && transition.data && (
                            <div className="flex items-center gap-2 flex-wrap">
                              {transition.data.agentOutput?.metadata?.agent_name && (
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/40">
                                  🤖 {transition.data.agentOutput.metadata.agent_name}
                                </span>
                              )}
                              {transition.data.agentOutput?.metadata?.slot && (
                                <span className="text-[10px] bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full border border-violet-500/40">
                                  📍 {transition.data.agentOutput.metadata.slot}
                                </span>
                              )}
                              {transition.data.agentOutput?.proposal && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                  transition.data.agentOutput.proposal === 'approve' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                  transition.data.agentOutput.proposal === 'deny' ? 'bg-red-500/20 text-red-300 border-red-500/40' :
                                  'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                  {transition.data.agentOutput.proposal.toUpperCase()}
                                </span>
                              )}
                              {transition.data.agentOutput?.confidence !== undefined && (
                                <span className="text-[10px] text-slate-400">
                                  Confidence: {Math.round(transition.data.agentOutput.confidence * 100)}%
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Expand indicator */}
                        {hasData && (
                          <div className={`text-slate-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && hasData && transition.data && (
                  <div className="ml-16 mt-2 space-y-3 animate-in slide-in-from-top-2 duration-200">
                    {/* Proposal section */}
                    {transition.data.agentOutput?.proposal && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Proposal</div>
                        <div className={`text-sm font-semibold ${style.text}`}>
                          {transition.data.agentOutput.proposal.toUpperCase()}
                        </div>
                      </div>
                    )}

                    {/* Reasons section */}
                    {transition.data.agentOutput?.reasons && transition.data.agentOutput.reasons.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Reasons ({transition.data.agentOutput.reasons.length})
                        </div>
                        <ul className="space-y-1">
                          {transition.data.agentOutput.reasons.map((reason, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-amber-400 mt-0.5">•</span>
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Policy refs section */}
                    {transition.data.agentOutput?.policy_refs && transition.data.agentOutput.policy_refs.length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Policy References
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {transition.data.agentOutput.policy_refs.map((ref, i) => (
                            <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-1 rounded border border-blue-500/40 font-mono">
                              {ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Flags section */}
                    {transition.data.agentOutput?.flags && Object.keys(transition.data.agentOutput.flags).length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Flags
                        </div>
                        <div className="bg-black/30 rounded-lg p-2">
                          <TreeView data={transition.data.agentOutput.flags} />
                        </div>
                      </div>
                    )}

                    {/* Metadata section */}
                    {transition.data.agentOutput?.metadata && Object.keys(transition.data.agentOutput.metadata).length > 0 && (
                      <div className="bg-white/5 border border-white/10 rounded-lg p-3">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                          Metadata
                        </div>
                        <div className="bg-black/30 rounded-lg p-2 max-h-60 overflow-y-auto">
                          <TreeView data={transition.data.agentOutput.metadata} />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Arrow connector */}
                {index < history.length - 1 && (
                  <div className="absolute left-6 top-16 flex items-center justify-center">
                    <ArrowRight size={16} className="text-white/20 rotate-90" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Final Decision */}
      {finalDecision && (
        <>
          <div className="flex items-center justify-center py-2">
            <div className="flex flex-col items-center gap-2">
              <ArrowRight size={24} className="text-white/30 rotate-90" />
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Final Decision</span>
              <ArrowRight size={24} className="text-white/30 rotate-90" />
            </div>
          </div>

          <div className={`relative overflow-hidden rounded-2xl p-6 shadow-2xl border-2 ${
            finalDecision === 'APPROVE' ? 'bg-gradient-to-br from-emerald-500 to-green-600 border-emerald-500/50' :
            finalDecision === 'DENY' ? 'bg-gradient-to-br from-red-500 to-rose-600 border-red-500/50' :
            finalDecision === 'ESCALATE' ? 'bg-gradient-to-br from-amber-500 to-orange-600 border-amber-500/50' :
            'bg-gradient-to-br from-slate-500 to-gray-600 border-slate-500/50'
          }`}>
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.8),transparent_50%)]" />
            </div>

            <div className="relative flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-lg">
                {finalDecision === 'APPROVE' && <CheckCircle2 size={32} className="text-white" />}
                {finalDecision === 'DENY' && <XCircle size={32} className="text-white" />}
                {finalDecision === 'ESCALATE' && <AlertTriangle size={32} className="text-white" />}
              </div>

              <div className="flex-1">
                <div className="text-xs text-white/80 uppercase tracking-wider mb-1">Final Decision</div>
                <div className="text-2xl font-bold text-white">{finalDecision}</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper function to extract state machine flow from legacy metadata
export function extractStateMachineFlow(metadata: any): { history: StateTransition[]; finalDecision?: string } | null {
  try {
    const result = metadata?.result || metadata;
    const stateMachine = result?.stateMachine;
    
    if (!stateMachine?.history) {
      return null;
    }

    return {
      history: stateMachine.history,
      finalDecision: result?.final || result?.finalDecision
    };
  } catch (error) {
    console.error('Failed to extract state machine flow:', error);
    return null;
  }
}

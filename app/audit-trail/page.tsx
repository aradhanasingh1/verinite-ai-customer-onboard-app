'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getCurrentSession, clearAudit, getRiskToleranceAsync, setRiskTolerance, determineApplicationStatus } from '@/lib/auditStore';
import type { AuditSession, StepStatus } from '@/lib/auditStore';
import type { AuditStep, RiskToleranceLevel } from '@/types/audit';
import { RiskToleranceToggle } from '@/components/AuditTrail/RiskToleranceToggle';
import { TreeView } from '@/components/AuditTrail/TreeView';
import { DecisionFlowDiagram, extractDecisionFlow } from '@/components/AuditTrail/DecisionFlowDiagram';
import { StateMachineFlow, extractStateMachineFlow } from '@/components/AuditTrail/StateMachineFlow';
import { parseLegacyMetadataToSteps, hasLegacyMetadata, extractFinalDecision } from '@/utils/legacyMetadataParser';

// ─── Step category metadata ───────────────────────────────────────────────────
const CATEGORY_META: Record<string, { label: string; gradient: string; glow: string }> = {
    session: { label: 'Session Start', gradient: 'from-violet-500 to-purple-600', glow: 'shadow-violet-500/30' },
    identity: { label: 'Identity Info', gradient: 'from-blue-500 to-cyan-600', glow: 'shadow-blue-500/30' },
    address: { label: 'Address Check', gradient: 'from-cyan-500 to-teal-500', glow: 'shadow-cyan-500/30' },
    documents: { label: 'Document Upload', gradient: 'from-amber-500 to-orange-500', glow: 'shadow-amber-500/30' },
    kyc: { label: 'KYC Verification', gradient: 'from-indigo-500 to-violet-600', glow: 'shadow-indigo-500/30' },
    aml: { label: 'AML Screening', gradient: 'from-rose-500 to-pink-600', glow: 'shadow-rose-500/30' },
    credit: { label: 'Credit Assessment', gradient: 'from-emerald-500 to-green-600', glow: 'shadow-emerald-500/30' },
    risk: { label: 'Risk Evaluation', gradient: 'from-orange-500 to-red-500', glow: 'shadow-orange-500/30' },
    decision: { label: 'Final Decision', gradient: 'from-slate-500 to-gray-700', glow: 'shadow-slate-500/30' },
    chat: { label: 'Conversation', gradient: 'from-violet-400 to-indigo-500', glow: 'shadow-indigo-500/20' },
};

const STATUS_STYLES: Record<StepStatus, { dot: string; badge: string; label: string }> = {
    completed: { dot: 'bg-emerald-400', badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700', label: 'Completed' },
    in_progress: { dot: 'bg-amber-400 animate-pulse', badge: 'bg-amber-900/50 text-amber-300 border-amber-700', label: 'In Progress' },
    failed: { dot: 'bg-red-500', badge: 'bg-red-900/50 text-red-300 border-red-700', label: 'Failed' },
    skipped: { dot: 'bg-slate-500', badge: 'bg-slate-800 text-slate-400 border-slate-600', label: 'Skipped' },
    pending: { dot: 'bg-slate-600', badge: 'bg-slate-900 text-slate-500 border-slate-700', label: 'Pending' },
};

const APPLICATION_STATUS_META = {
    in_progress: { label: 'In Progress', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: '⏳' },
    approved: { label: 'Approved ✓', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/30', icon: '✅' },
    denied: { label: 'Denied', color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: '❌' },
    escalated: { label: 'Under Manual Review', color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: '⚠️' },
    pending: { label: 'Pending', color: 'text-slate-400', bg: 'bg-slate-500/10 border-slate-500/30', icon: '🕐' },
};

function formatTs(iso: string): string {
    return new Date(iso).toLocaleString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: true
    });
}

function formatDuration(ms?: number): string {
    if (!ms) return '';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
}

function elapsed(start: string, end?: string): string {
    const ms = (end ? new Date(end) : new Date()).getTime() - new Date(start).getTime();
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
}

// ─── Single flow node ────────────────────────────────────────────────────────
function FlowNode({ step, index, isLast }: { step: AuditStep; index: number; isLast: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const [metadataLoaded, setMetadataLoaded] = useState(false);
    const cat = CATEGORY_META[step.category] || CATEGORY_META.session;
    const st = STATUS_STYLES[step.status];

    // Lazy load metadata when expanded
    const handleExpand = () => {
        setExpanded(e => !e);
        if (!expanded && !metadataLoaded) {
            // Simulate lazy loading - in a real implementation, this would fetch from API
            setMetadataLoaded(true);
        }
    };

    // Get decision outcome from agent metadata
    const decision = step.agentMetadata?.decision;
    const hasDecision = decision && decision.outcome;

    // Decision outcome visual indicators
    const getDecisionStyle = (outcome: string) => {
        const lower = outcome.toLowerCase();
        if (lower.includes('approve') || lower.includes('pass') || lower.includes('success')) {
            return { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40', icon: '✓' };
        }
        if (lower.includes('deny') || lower.includes('fail') || lower.includes('reject')) {
            return { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/40', icon: '✗' };
        }
        if (lower.includes('escalate') || lower.includes('review') || lower.includes('manual')) {
            return { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500/40', icon: '⚠' };
        }
        return { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40', icon: 'ℹ' };
    };

    const decisionStyle = hasDecision ? getDecisionStyle(decision.outcome) : null;

    return (
        <div className="relative flex gap-4 sm:gap-6 group">
            {/* Connector line */}
            {!isLast && (
                <div className="absolute left-[22px] sm:left-[26px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-white/10 to-transparent z-0" />
            )}

            {/* Icon bubble */}
            <div className="relative z-10 flex-shrink-0">
                <div
                    className={`w-11 h-11 sm:w-13 sm:h-13 rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-lg ${cat.glow} flex items-center justify-center text-xl transition-transform duration-300 group-hover:scale-110`}
                    style={{ fontSize: '1.1rem' }}
                >
                    {step.icon || '•'}
                </div>
                {/* Status dot */}
                <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${st.dot}`} />
            </div>

            {/* Card */}
            <div className="flex-1 pb-8">
                <button
                    onClick={handleExpand}
                    className="w-full text-left group/card"
                >
                    <div className="rounded-2xl bg-white/5 border border-white/10 hover:border-white/20 hover:bg-white/8 transition-all duration-300 p-4 sm:p-5 shadow-lg">
                        {/* Header row */}
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-semibold uppercase tracking-widest opacity-50">{cat.label}</span>
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${st.badge}`}>
                                        {st.label}
                                    </span>
                                    {/* Agent name badge - prominent display */}
                                    {step.agentName && step.agentName !== 'legacy' && (
                                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                                            🤖 {step.agentName}
                                        </span>
                                    )}
                                </div>
                                <h3 className="mt-1 text-base sm:text-lg font-semibold text-white leading-snug">{step.title}</h3>
                                <p className="mt-1 text-sm text-slate-400 leading-relaxed">{step.description}</p>
                                
                                {/* Decision outcome indicator */}
                                {hasDecision && decisionStyle && (
                                    <div className={`mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${decisionStyle.bg} ${decisionStyle.text} border ${decisionStyle.border} text-xs font-semibold`}>
                                        <span>{decisionStyle.icon}</span>
                                        <span>Decision: {decision.outcome}</span>
                                        {decision.confidence !== undefined && (
                                            <span className="opacity-75">({Math.round(decision.confidence * 100)}%)</span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {/* Expand chevron */}
                            <div className={`flex-shrink-0 text-slate-500 transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>
                        </div>

                        {/* Footer row */}
                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                            <span>🕐 {formatTs(step.timestamp)}</span>
                            {step.durationMs && <span>⚡ {formatDuration(step.durationMs)}</span>}
                            <span className="ml-auto opacity-50">Step #{index + 1}</span>
                        </div>
                    </div>
                </button>

                {/* Expanded details - lazy loaded */}
                {expanded && (
                    <div className="mt-2 ml-1 rounded-2xl bg-slate-800/50 border border-white/5 p-4 text-sm space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {/* Agent metadata section */}
                        {metadataLoaded && step.agentMetadata && step.agentName !== 'legacy' && (
                            <div className="space-y-3">
                                {/* Agent info header */}
                                <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Agent Information</span>
                                    {step.agentMetadata.agentVersion && (
                                        <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full">
                                            v{step.agentMetadata.agentVersion}
                                        </span>
                                    )}
                                </div>

                                {/* Decision details */}
                                {decision && (
                                    <div>
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Decision Details</div>
                                        <div className="bg-black/30 rounded-lg p-3 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-slate-500">Outcome:</span>
                                                <span className={`text-sm font-semibold ${decisionStyle?.text}`}>{decision.outcome}</span>
                                            </div>
                                            {decision.confidence !== undefined && (
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs text-slate-500">Confidence:</span>
                                                    <span className="text-sm text-slate-300">{Math.round(decision.confidence * 100)}%</span>
                                                </div>
                                            )}
                                            {decision.reasoning && (
                                                <div className="pt-2 border-t border-white/5">
                                                    <span className="text-xs text-slate-500 block mb-1">Reasoning:</span>
                                                    <p className="text-xs text-slate-300 leading-relaxed">{decision.reasoning}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Inputs section with tree view */}
                                {step.agentMetadata.inputs && Object.keys(step.agentMetadata.inputs).length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span>📥 Inputs</span>
                                            <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                                {Object.keys(step.agentMetadata.inputs).length} fields
                                            </span>
                                        </div>
                                        <div className="bg-black/30 rounded-lg px-3 py-2 max-h-80 overflow-y-auto">
                                            <TreeView data={step.agentMetadata.inputs} />
                                        </div>
                                    </div>
                                )}

                                {/* Outputs section with tree view */}
                                {step.agentMetadata.outputs && Object.keys(step.agentMetadata.outputs).length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span>📤 Outputs</span>
                                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                                                {Object.keys(step.agentMetadata.outputs).length} fields
                                            </span>
                                        </div>
                                        <div className="bg-black/30 rounded-lg px-3 py-2 max-h-80 overflow-y-auto">
                                            <TreeView data={step.agentMetadata.outputs} />
                                        </div>
                                    </div>
                                )}

                                {/* Execution time */}
                                {step.agentMetadata.executionTime !== undefined && (
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-slate-500">Execution Time:</span>
                                        <span className="text-slate-300 font-mono">{formatDuration(step.agentMetadata.executionTime)}</span>
                                    </div>
                                )}

                                {/* Errors section */}
                                {step.agentMetadata.errors && step.agentMetadata.errors.length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <span>⚠ Errors</span>
                                            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
                                                {step.agentMetadata.errors.length}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            {step.agentMetadata.errors.map((error, i) => (
                                                <div key={i} className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[10px] font-mono text-red-400">{error.code}</span>
                                                        <span className="text-[10px] text-slate-500">{formatTs(error.timestamp)}</span>
                                                    </div>
                                                    <p className="text-xs text-red-300">{error.message}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Context section */}
                                {step.agentMetadata.context && Object.keys(step.agentMetadata.context).length > 0 && (
                                    <div>
                                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Additional Context</div>
                                        <pre className="text-slate-300 text-xs bg-black/30 rounded-lg px-3 py-2 overflow-x-auto max-h-40 overflow-y-auto">
                                            <code className="language-json">{JSON.stringify(step.agentMetadata.context, null, 2)}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Legacy metadata handling */}
                        {step.metadata && (step.metadata['transcript'] as any) && Array.isArray(step.metadata['transcript']) && (
                            <div className="mt-4 border-t border-white/5 pt-4">
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <span>💬 Full Conversation Log</span>
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">{(step.metadata['transcript'] as any[]).length} messages</span>
                                </div>
                                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                    {(step.metadata['transcript'] as any[]).map((msg: any, i: number) => (
                                        <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs ${msg.role === 'user'
                                                ? 'bg-indigo-600/20 text-indigo-100 rounded-tr-none'
                                                : 'bg-white/5 text-slate-300 rounded-tl-none'
                                                }`}>
                                                <div className="font-bold text-[10px] mb-1 opacity-50 flex items-center gap-1">
                                                    {msg.role === 'user' ? '👤 YOU' : '🤖 AI'}
                                                </div>
                                                {String(msg.content)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {step.detail && !step.metadata?.['transcript'] && (
                            <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Detail</div>
                                <div className="text-slate-300 font-mono text-sm bg-black/30 rounded-lg px-3 py-2">{String(step.detail)}</div>
                            </div>
                        )}
                        {step.metadata && Object.keys(step.metadata).length > 0 && !step.metadata['transcript'] && (
                            <div>
                                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Legacy Metadata</div>
                                <pre className="text-slate-300 text-xs bg-black/30 rounded-lg px-3 py-2 overflow-x-auto whitespace-pre-wrap max-h-60 overflow-y-auto">
                                    {JSON.stringify(step.metadata, null, 2)}
                                </pre>
                            </div>
                        )}
                        <div className="text-xs text-slate-500 pt-2 border-t border-white/5">
                            Step ID: <span className="font-mono">{step.id}</span>
                            {step.createdAt && (
                                <span className="ml-3">Created: <span className="font-mono">{formatTs(step.createdAt)}</span></span>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Category group header ────────────────────────────────────────────────────
function CategoryDivider({ category }: { category: string }) {
    const cat = CATEGORY_META[category] || CATEGORY_META.session;
    return (
        <div className="flex items-center gap-3 mb-2 mt-2">
            <div className={`h-px flex-1 bg-gradient-to-r ${cat.gradient} opacity-30`} />
            <span className={`text-[10px] font-bold uppercase tracking-[0.2em] bg-gradient-to-r ${cat.gradient} bg-clip-text text-transparent`}>
                {cat.label}
            </span>
            <div className={`h-px flex-1 bg-gradient-to-l ${cat.gradient} opacity-30`} />
        </div>
    );
}

// ─── Virtualized Timeline for large step counts ──────────────────────────────
function VirtualizedTimeline({ groupedSteps }: { groupedSteps: { step: AuditStep; showDivider: boolean }[] }) {
    const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
    const containerRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        
        const handleScroll = () => {
            const scrollTop = node.scrollTop;
            const itemHeight = 200; // Approximate height per item
            const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 10);
            const end = Math.min(groupedSteps.length, start + 60);
            
            setVisibleRange({ start, end });
        };
        
        node.addEventListener('scroll', handleScroll);
        return () => node.removeEventListener('scroll', handleScroll);
    }, [groupedSteps.length]);
    
    const visibleSteps = groupedSteps.slice(visibleRange.start, visibleRange.end);
    const topPadding = visibleRange.start * 200;
    const bottomPadding = (groupedSteps.length - visibleRange.end) * 200;
    
    return (
        <div ref={containerRef} className="max-h-[800px] overflow-y-auto">
            <div style={{ paddingTop: `${topPadding}px`, paddingBottom: `${bottomPadding}px` }}>
                {visibleSteps.map(({ step, showDivider }, i) => {
                    const actualIndex = visibleRange.start + i;
                    return (
                        <div key={step.id} id={showDivider ? `cat-${step.category}` : undefined}>
                            {showDivider && <CategoryDivider category={step.category} />}
                            <FlowNode
                                step={step}
                                index={actualIndex}
                                isLast={actualIndex === groupedSteps.length - 1}
                            />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState() {
    return (
        <div className="flex flex-col items-center justify-center py-24 text-center gap-6">
            <div className="w-24 h-24 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center text-5xl">
                🔍
            </div>
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">No Audit Trail Yet</h2>
                <p className="text-slate-400 max-w-sm">
                    Your onboarding journey will appear here once you start the application process.
                </p>
            </div>
            <div className="flex gap-3">
                <Link
                    href="/"
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5"
                >
                    Start Application →
                </Link>
                <Link
                    href="/chat"
                    className="px-6 py-3 rounded-xl bg-white/10 border border-white/20 text-white font-semibold text-sm hover:bg-white/15 transition-all duration-300"
                >
                    Try Chat
                </Link>
            </div>
        </div>
    );
}

// ─── Status card ──────────────────────────────────────────────────────────────
function StatusCard({ session }: { session: AuditSession }) {
    const appMeta = APPLICATION_STATUS_META[session.applicationStatus];
    const totalSteps = session.steps.length;
    const doneSteps = session.steps.filter(s => s.status === 'completed').length;
    const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

    return (
        <div className={`rounded-2xl border p-5 sm:p-6 ${appMeta.bg} backdrop-blur-sm`}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Application Status</div>
                    <div className={`text-2xl sm:text-3xl font-black ${appMeta.color} flex items-center gap-2`}>
                        <span>{appMeta.icon}</span>
                        <span>{appMeta.label}</span>
                    </div>
                    {session.applicantName && (
                        <div className="mt-1 text-slate-400 text-sm">
                            Applicant: <span className="text-white font-medium">{session.applicantName}</span>
                        </div>
                    )}
                </div>
                <div className="text-right text-sm text-slate-400 space-y-1">
                    <div>Started: <span className="text-slate-300">{formatTs(session.startedAt)}</span></div>
                    {session.completedAt && (
                        <div>Completed: <span className="text-slate-300">{formatTs(session.completedAt)}</span></div>
                    )}
                    <div>Duration: <span className="text-slate-300">{elapsed(session.startedAt, session.completedAt)}</span></div>
                    {session.traceId && (
                        <div className="font-mono text-xs opacity-50">Trace: {session.traceId}</div>
                    )}
                </div>
            </div>

            {/* Progress bar */}
            <div className="mt-5">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                    <span>{doneSteps} / {totalSteps} steps completed</span>
                    <span className={appMeta.color}>{progressPct}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full bg-gradient-to-r ${appMeta.color === 'text-emerald-400' ? 'from-emerald-500 to-teal-400' : appMeta.color === 'text-amber-400' ? 'from-amber-500 to-yellow-400' : appMeta.color === 'text-red-400' ? 'from-red-500 to-rose-400' : 'from-orange-500 to-amber-400'} transition-all duration-1000`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>
            </div>

            {/* Final decision badge */}
            {session.finalDecision && (
                <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="text-xs text-slate-400 mb-1">Final Decision</div>
                    <div className={`text-lg font-bold uppercase tracking-wide ${appMeta.color}`}>
                        {session.finalDecision}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Main page component  ─────────────────────────────────────────────────────
export default function AuditTrailPage() {
    const [session, setSession] = useState<AuditSession | null>(null);
    const [loading, setLoading] = useState(true);
    const [confirmClear, setConfirmClear] = useState(false);
    const [useVirtualization, setUseVirtualization] = useState(false);
    const [riskTolerance, setRiskToleranceState] = useState<RiskToleranceLevel | null>(null);
    const [loadingRiskTolerance, setLoadingRiskTolerance] = useState(true);

    const load = useCallback(() => {
        const currentSession = getCurrentSession();
        
        // Parse legacy metadata if present and inject steps
        if (currentSession) {
            const legacyStep = currentSession.steps.find(s => hasLegacyMetadata(s));
            
            if (legacyStep && legacyStep.metadata) {
                // Parse legacy metadata into audit steps
                const parsedSteps = parseLegacyMetadataToSteps(legacyStep.metadata, currentSession.sessionId);
                
                if (parsedSteps.length > 0) {
                    // Remove the legacy step and replace with parsed steps
                    const otherSteps = currentSession.steps.filter(s => s.id !== legacyStep.id);
                    currentSession.steps = [...otherSteps, ...parsedSteps].sort((a, b) => 
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    );
                    
                    // Extract final decision if not already set
                    if (!currentSession.finalDecision) {
                        const finalDecision = extractFinalDecision(legacyStep.metadata);
                        if (finalDecision) {
                            currentSession.finalDecision = finalDecision;
                        }
                    }
                }
            }
        }
        
        setSession(currentSession);
        // Enable virtualization for >100 steps
        setUseVirtualization((currentSession?.steps.length || 0) > 100);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    // Load risk tolerance level
    useEffect(() => {
        const loadRiskTolerance = async () => {
            if (!session?.sessionId) {
                setLoadingRiskTolerance(false);
                return;
            }
            
            try {
                const level = await getRiskToleranceAsync(session.sessionId);
                setRiskToleranceState(level);
            } catch (error) {
                console.error('Failed to load risk tolerance:', error);
            } finally {
                setLoadingRiskTolerance(false);
            }
        };
        
        loadRiskTolerance();
    }, [session?.sessionId]);

    const handleRiskToleranceChange = async (newLevel: RiskToleranceLevel) => {
        if (!session?.sessionId) return;
        
        // Update local state immediately for responsive UI
        setRiskToleranceState(newLevel);
        
        // Determine new application status based on risk tolerance
        const newStatus = determineApplicationStatus(newLevel);
        
        // Update session status after a brief delay (as per requirement 2.3: within 500ms)
        setTimeout(() => {
            const updatedSession = getCurrentSession();
            if (updatedSession) {
                updatedSession.applicationStatus = newStatus;
                setSession({ ...updatedSession });
            }
        }, 100);
    };

    const handleClear = () => {
        clearAudit();
        setSession(null);
        setConfirmClear(false);
    };

    // Group steps by category for section dividers
    // Filter to show only completed and failed steps (exclude pending and in_progress)
    const filteredSteps = (session?.steps || []).filter(step => 
        step.status === 'completed' || step.status === 'failed'
    );
    
    const groupedSteps: { step: AuditStep; showDivider: boolean }[] = [];
    let lastCat = '';
    filteredSteps.forEach((step) => {
        groupedSteps.push({ step, showDivider: step.category !== lastCat });
        lastCat = step.category;
    });

    return (
        <div className="min-h-screen bg-[#080b14] text-white">
            {/* Ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[600px] h-64 bg-cyan-600/5 rounded-full blur-3xl" />
            </div>

            {/* Branded Header */}
            <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5 py-4 mb-8">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center gap-4">
                    <Link href="/" className="bg-white rounded-lg px-2.5 py-1.5 flex items-center justify-center shadow-lg hover:scale-105 transition-transform">
                        <img src="/verinite-logo.png" alt="Verinite" className="h-6 w-auto object-contain" />
                    </Link>
                    <div className="h-8 w-px bg-white/10 mx-1" />
                    <div>
                        <h1 className="text-white font-bold text-lg leading-none tracking-tight">Dashboard</h1>
                        <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            Official Record
                        </div>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                        <Link
                            href="/chat"
                            className="text-xs font-bold text-slate-400 hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 flex items-center gap-2"
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            CHAT
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 sm:px-6">

                {/* ── Summary Info ─── */}
                <div className="mb-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <p className="text-slate-400 text-sm sm:text-base max-w-md">
                                Comprehensive verification logs for <span className="text-white font-semibold">{session?.applicantName || 'Applicant'}</span>.
                            </p>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={load}
                                className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200 flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                            {session && (
                                <>
                                    {confirmClear ? (
                                        <div className="flex gap-2">
                                            <button onClick={handleClear} className="px-3 py-2 rounded-xl bg-red-600 text-sm text-white hover:bg-red-500 transition-colors">
                                                Yes, clear
                                            </button>
                                            <button onClick={() => setConfirmClear(false)} className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 transition-colors">
                                                Cancel
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setConfirmClear(true)}
                                            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-400 hover:text-red-400 hover:border-red-900 transition-all duration-200"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Content ─── */}
                {loading ? (
                    <div className="flex items-center justify-center py-24">
                        <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : !session || session.steps.length === 0 ? (
                    <EmptyState />
                ) : (
                    <div className="space-y-6">
                        {/* Status card */}
                        <StatusCard session={session} />

                        {/* State Machine Flow - Show if legacy metadata exists */}
                        {(() => {
                            // Check if any step has legacy metadata with state machine
                            const legacyStep = session.steps.find(s => s.metadata && typeof s.metadata === 'object');
                            const stateMachineData = legacyStep ? extractStateMachineFlow(legacyStep.metadata) : null;
                            
                            if (stateMachineData) {
                                return (
                                    <div className="rounded-2xl bg-white/3 border border-white/8 p-4 sm:p-6">
                                        <StateMachineFlow
                                            history={stateMachineData.history}
                                            finalDecision={stateMachineData.finalDecision}
                                        />
                                    </div>
                                );
                            }
                            
                            // Fallback to Decision Flow Diagram if no legacy metadata but has agent steps
                            if (session.finalDecision && session.steps.some(s => s.agentMetadata && s.agentName !== 'legacy')) {
                                return (
                                    <div className="rounded-2xl bg-white/3 border border-white/8 p-4 sm:p-6">
                                        <DecisionFlowDiagram
                                            steps={extractDecisionFlow(session.steps)}
                                            finalDecision={session.finalDecision as 'APPROVE' | 'DENY' | 'ESCALATE' | 'PENDING'}
                                            riskTolerance={riskTolerance || undefined}
                                        />
                                    </div>
                                );
                            }
                            
                            return null;
                        })()}

                        {/* Risk Tolerance Toggle - positioned prominently after status card */}
                        {/* {!loadingRiskTolerance && (
                            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 sm:p-6">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-xl shadow-lg shadow-orange-500/30">
                                        ⚖️
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400">Risk Management</h3>
                                        <p className="text-xs text-slate-500 mt-0.5">Control approval threshold for this application</p>
                                    </div>
                                </div>
                                <RiskToleranceToggle
                                    currentLevel={riskTolerance || 'HIGH'}
                                    onChange={handleRiskToleranceChange}
                                    applicationId={session.sessionId}
                                    disabled={session.applicationStatus === 'approved' || session.applicationStatus === 'denied'}
                                />
                            </div>
                        )} */}

                        {/* Nav quick links */}
                        <div className="flex gap-2 text-xs flex-wrap">
                            <span className="text-slate-500 font-semibold uppercase tracking-wider self-center">Jump to:</span>
                            {Array.from(new Set(filteredSteps.map(s => s.category))).map(cat => {
                                const meta = CATEGORY_META[cat];
                                return (
                                    <a
                                        key={cat}
                                        href={`#cat-${cat}`}
                                        className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                                    >
                                        {meta?.label || cat}
                                    </a>
                                );
                            })}
                        </div>

                        {/* ── Flow / Timeline ─── */}
                        <div className="rounded-2xl bg-white/3 border border-white/8 p-4 sm:p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-sm font-bold uppercase tracking-widest text-slate-400">
                                    📋 Journey Timeline — {filteredSteps.length} Steps
                                </h2>
                                {useVirtualization && (
                                    <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/40">
                                        ⚡ Virtualized Rendering
                                    </span>
                                )}
                            </div>

                            {useVirtualization ? (
                                <VirtualizedTimeline groupedSteps={groupedSteps} />
                            ) : (
                                <div>
                                    {groupedSteps.map(({ step, showDivider }, i) => (
                                        <div key={step.id} id={showDivider ? `cat-${step.category}` : undefined}>
                                            {showDivider && <CategoryDivider category={step.category} />}
                                            <FlowNode
                                                step={step}
                                                index={i}
                                                isLast={i === groupedSteps.length - 1}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 justify-center pt-2">
                            <Link
                                href="/"
                                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-300 hover:bg-white/10 hover:text-white transition-all duration-200"
                            >
                                ← Back to Application
                            </Link>
                            <Link
                                href="/chat"
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm text-white font-semibold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300 hover:-translate-y-0.5"
                            >
                                Open Chat →
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

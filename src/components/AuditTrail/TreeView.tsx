// src/components/AuditTrail/TreeView.tsx
'use client';

import { useState } from 'react';

interface TreeViewProps {
  data: any;
  level?: number;
  label?: string;
}

export function TreeView({ data, level = 0, label }: TreeViewProps) {
  const [expanded, setExpanded] = useState(level < 2); // Auto-expand first 2 levels

  if (data === null || data === undefined) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        <span className="opacity-50">null</span>
      </div>
    );
  }

  // Primitive values
  if (typeof data !== 'object') {
    return (
      <div className="flex items-center gap-2">
        {label && <span className="text-slate-400 text-xs">{label}:</span>}
        <span className={`text-xs font-mono ${
          typeof data === 'string' ? 'text-emerald-300' :
          typeof data === 'number' ? 'text-blue-300' :
          typeof data === 'boolean' ? 'text-amber-300' :
          'text-slate-300'
        }`}>
          {typeof data === 'string' ? `"${data}"` : String(data)}
        </span>
      </div>
    );
  }

  // Arrays
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <div className="flex items-center gap-2 text-slate-500 text-xs">
          {label && <span className="text-slate-400">{label}:</span>}
          <span className="opacity-50">[]</span>
        </div>
      );
    }

    return (
      <div className="space-y-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 hover:bg-white/5 rounded px-1 py-0.5 transition-colors w-full text-left"
        >
          <span className={`text-slate-500 transition-transform text-xs ${expanded ? 'rotate-90' : ''}`}>
            ▶
          </span>
          {label && <span className="text-slate-400 text-xs font-semibold">{label}:</span>}
          <span className="text-slate-500 text-xs">Array({data.length})</span>
        </button>
        {expanded && (
          <div className="ml-4 border-l border-white/10 pl-3 space-y-1">
            {data.map((item, index) => (
              <TreeView key={index} data={item} level={level + 1} label={`[${index}]`} />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Objects
  const keys = Object.keys(data);
  if (keys.length === 0) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-xs">
        {label && <span className="text-slate-400">{label}:</span>}
        <span className="opacity-50">{'{}'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 hover:bg-white/5 rounded px-1 py-0.5 transition-colors w-full text-left"
      >
        <span className={`text-slate-500 transition-transform text-xs ${expanded ? 'rotate-90' : ''}`}>
          ▶
        </span>
        {label && <span className="text-slate-400 text-xs font-semibold">{label}:</span>}
        <span className="text-slate-500 text-xs">Object({keys.length})</span>
      </button>
      {expanded && (
        <div className="ml-4 border-l border-white/10 pl-3 space-y-1">
          {keys.map((key) => (
            <TreeView key={key} data={data[key]} level={level + 1} label={key} />
          ))}
        </div>
      )}
    </div>
  );
}

import React from 'react';
import { History, Clock, ArrowRight, ShieldAlert, Award, FilePlus } from 'lucide-react';

export function ActivityLog({ events = [] }) {
  if (!events || events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
        No auction activity recorded yet.
      </div>
    );
  }

  function renderIcon(type) {
    switch (type) {
      case 'EXTENSION_APPLIED':
        return <Clock className="w-4 h-4 text-amber-600" />;
      case 'EXTENSION_CAPPED':
        return <ShieldAlert className="w-4 h-4 text-purple-600" />;
      case 'BID_SUBMITTED':
        return <Award className="w-4 h-4 text-blue-600" />;
      case 'AUCTION_CREATED':
      case 'AUCTION_STARTED':
        return <FilePlus className="w-4 h-4 text-emerald-600" />;
      default:
        return <History className="w-4 h-4 text-slate-500" />;
    }
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
        <History className="w-4 h-4 text-slate-600" />
        <h3 className="text-sm font-bold text-slate-900">Live Auction Activity & Extension Audit Log</h3>
      </div>

      <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {events.map((e) => {
          const isExtension = e.event_type === 'EXTENSION_APPLIED' || e.event_type === 'EXTENSION_CAPPED';
          return (
            <div key={e.id} className="relative">
              <div className={`absolute -left-[27px] top-0.5 w-6 h-6 rounded-full flex items-center justify-center border-2 bg-white ${
                isExtension ? 'border-amber-500 bg-amber-50' : 'border-slate-300'
              }`}>
                {renderIcon(e.event_type)}
              </div>

              <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors p-3 rounded-lg border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-semibold uppercase tracking-wider ${
                    isExtension ? 'text-amber-700' : 'text-slate-700'
                  }`}>
                    {e.event_type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    {formatTime(e.created_at)}
                  </span>
                </div>

                <p className="text-xs text-slate-800 font-medium leading-relaxed">
                  {e.reason}
                </p>

                {isExtension && e.old_close_time && e.new_close_time && (
                  <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center space-x-2 text-xs font-mono text-slate-600">
                    <span className="text-slate-400">Close:</span>
                    <span className="line-through text-slate-400">{formatTime(e.old_close_time)}</span>
                    <ArrowRight className="w-3 h-3 text-amber-600 inline" />
                    <span className="font-bold text-amber-800">{formatTime(e.new_close_time)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

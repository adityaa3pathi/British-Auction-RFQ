import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

export function parseDate(dateStr) {
  if (!dateStr) return 0;
  if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
    return new Date(dateStr + 'Z').getTime();
  }
  return new Date(dateStr).getTime();
}

export function CountdownTimer({ currentCloseTime, forcedCloseTime, serverTime, status, triggerWindowMinutes }) {
  const [timeLeft, setTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0, totalMs: 0 });
  const [forcedTimeLeft, setForcedTimeLeft] = useState({ hours: 0, minutes: 0, seconds: 0 });
  const [isInWindow, setIsInWindow] = useState(false);

  useEffect(() => {
    if (!currentCloseTime || status !== 'ACTIVE') return;

    // Server-time offset calibration
    const serverTimestamp = serverTime ? parseDate(serverTime) : Date.now();
    const localAtReceive = Date.now();
    const clockOffset = serverTimestamp - localAtReceive;

    function tick() {
      const now = Date.now() + clockOffset;
      const target = parseDate(currentCloseTime);
      const forcedTarget = parseDate(forcedCloseTime);

      const diff = Math.max(0, target - now);
      const forcedDiff = Math.max(0, forcedTarget - now);

      const totalSec = Math.floor(diff / 1000);
      const hours = Math.floor(totalSec / 3600);
      const minutes = Math.floor((totalSec % 3600) / 60);
      const seconds = totalSec % 60;

      const fTotalSec = Math.floor(forcedDiff / 1000);
      const fHours = Math.floor(fTotalSec / 3600);
      const fMinutes = Math.floor((fTotalSec % 3600) / 60);
      const fSeconds = fTotalSec % 60;

      setTimeLeft({ hours, minutes, seconds, totalMs: diff });
      setForcedTimeLeft({ hours: fHours, minutes: fMinutes, seconds: fSeconds });

      if (triggerWindowMinutes) {
        const windowMs = triggerWindowMinutes * 60 * 1000;
        setIsInWindow(diff > 0 && diff <= windowMs);
      }
    }

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [currentCloseTime, forcedCloseTime, serverTime, status, triggerWindowMinutes]);

  const pad = (n) => String(n).padStart(2, '0');

  if (status !== 'ACTIVE') {
    return (
      <div className="bg-slate-100 rounded-xl p-4 border border-slate-200 text-center">
        <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold block mb-1">
          Bidding Status
        </span>
        <div className="text-xl font-bold text-slate-700">
          {status === 'SCHEDULED' ? 'Auction Scheduled' : 'Auction Concluded'}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-4 border transition-all ${
      isInWindow
        ? 'bg-amber-50/80 border-amber-300 shadow-sm shadow-amber-500/10'
        : 'bg-white border-slate-200'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5">
          <Clock className={`w-4 h-4 ${isInWindow ? 'text-amber-600 animate-bounce' : 'text-slate-500'}`} />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Current Bid Close
          </span>
        </div>
        {isInWindow && (
          <span className="inline-flex items-center text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Trigger Window Active ({triggerWindowMinutes}m)
          </span>
        )}
      </div>

      <div className="flex items-baseline space-x-2">
        <span className={`text-3xl font-extrabold tracking-tight font-mono ${
          isInWindow ? 'text-amber-900' : 'text-slate-900'
        }`}>
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
        <span className="text-xs text-slate-500">remaining</span>
      </div>

      <div className="mt-3 pt-2.5 border-t border-slate-200/70 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400 mr-1" />
          Hard Forced Close Ceiling:
        </span>
        <span className="font-mono font-medium text-slate-700">
          {pad(forcedTimeLeft.hours)}h {pad(forcedTimeLeft.minutes)}m {pad(forcedTimeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
}

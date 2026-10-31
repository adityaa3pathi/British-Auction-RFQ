import React, { useState } from 'react';
import { ArrowLeft, PlusCircle, Sparkles, AlertCircle, Check } from 'lucide-react';
import { createRfq } from '../api/client';

export function CreateRfqPage({ onBack, onCreated }) {
  const now = new Date();
  const formatInputDateTime = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultStart = new Date(now.getTime());
  const defaultClose = new Date(now.getTime() + 20 * 60000);
  const defaultForced = new Date(now.getTime() + 45 * 60000);
  const defaultPickup = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0];

  const [name, setName] = useState('Shenzhen to Hamburg, 40ft Container');
  const [referenceId, setReferenceId] = useState(`RFQ-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [pickupDate, setPickupDate] = useState(defaultPickup);

  const [bidStartTime, setBidStartTime] = useState(formatInputDateTime(defaultStart));
  const [bidCloseTime, setBidCloseTime] = useState(formatInputDateTime(defaultClose));
  const [forcedBidCloseTime, setForcedBidCloseTime] = useState(formatInputDateTime(defaultForced));

  const [triggerWindowMinutes, setTriggerWindowMinutes] = useState(10);
  const [extensionDurationMinutes, setExtensionDurationMinutes] = useState(5);
  const [extensionTrigger, setExtensionTrigger] = useState('L1_RANK_CHANGE');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Preset generator for quick live evaluation
  function applyPreset(presetType) {
    const base = new Date();
    if (presetType === 'quick') {
      // 2 minute live demo auction
      const s = new Date(base.getTime());
      const c = new Date(base.getTime() + 90 * 1000); // 90 seconds
      const f = new Date(base.getTime() + 300 * 1000); // 5 minutes
      setBidStartTime(formatInputDateTime(s));
      setBidCloseTime(formatInputDateTime(c));
      setForcedBidCloseTime(formatInputDateTime(f));
      setTriggerWindowMinutes(2);
      setExtensionDurationMinutes(1);
      setExtensionTrigger('L1_RANK_CHANGE');
      setName('Express 2-Min Demo: Antwerp to Newark');
      setReferenceId(`DEMO-${Math.floor(1000 + Math.random() * 9000)}`);
    } else if (presetType === 'standard') {
      const s = new Date(base.getTime());
      const c = new Date(base.getTime() + 30 * 60000);
      const f = new Date(base.getTime() + 60 * 60000);
      setBidStartTime(formatInputDateTime(s));
      setBidCloseTime(formatInputDateTime(c));
      setForcedBidCloseTime(formatInputDateTime(f));
      setTriggerWindowMinutes(10);
      setExtensionDurationMinutes(5);
      setExtensionTrigger('ANY_RANK_CHANGE');
    }
  }

  const isCloseAfterStart = new Date(bidCloseTime) > new Date(bidStartTime);
  const isForcedAfterClose = new Date(forcedBidCloseTime) > new Date(bidCloseTime);
  const isValid = isCloseAfterStart && isForcedAfterClose;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isCloseAfterStart) {
      setError('Bid Close Time must be strictly after Bid Start Time.');
      return;
    }
    if (!isForcedAfterClose) {
      setError('Forced Bid Close Time must be strictly after Bid Close Time.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        reference_id: referenceId,
        pickup_date: pickupDate,
        bid_start_time: new Date(bidStartTime).toISOString(),
        bid_close_time: new Date(bidCloseTime).toISOString(),
        forced_bid_close_time: new Date(forcedBidCloseTime).toISOString(),
        config: {
          trigger_window_minutes: parseInt(triggerWindowMinutes, 10),
          extension_duration_minutes: parseInt(extensionDurationMinutes, 10),
          extension_trigger: extensionTrigger,
        },
      };

      const res = await createRfq(payload);
      onCreated(res.id);
    } catch (err) {
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Auctions</span>
        </button>

        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium">Quick Presets:</span>
          <button
            type="button"
            onClick={() => applyPreset('quick')}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-300 rounded-md hover:bg-amber-100 transition-colors"
          >
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>2-Min Live Demo</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset('standard')}
            className="px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 rounded-md hover:bg-slate-200 transition-colors"
          >
            Standard 30-Min
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="pb-4 border-b border-slate-100 mb-6">
          <h1 className="text-xl font-bold text-slate-900">Create British Auction RFQ</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure freight details, dynamic trigger windows, extension durations, and forced close boundaries.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lane & Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RFQ Name / Freight Lane
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="e.g. Shanghai to Rotterdam, 40ft HC"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reference ID
              </label>
              <input
                type="text"
                required
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="RFQ-2026-001"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Pickup / Service Date</label>
            <input
              type="date"
              required
              value={pickupDate}
              onChange={(e) => setPickupDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Timing Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Auction Timings (Server Authoritative)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bid Start Time</label>
                <input
                  type="datetime-local"
                  required
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Initial Bid Close</label>
                <input
                  type="datetime-local"
                  required
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {!isCloseAfterStart && (
                  <span className="text-[11px] text-red-600 mt-1 block">Must be after Start Time</span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Forced Bid Close</label>
                <input
                  type="datetime-local"
                  required
                  value={forcedBidCloseTime}
                  onChange={(e) => setForcedBidCloseTime(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                {!isForcedAfterClose && (
                  <span className="text-[11px] text-red-600 mt-1 block">Must be after Close Time</span>
                )}
              </div>
            </div>
          </div>

          {/* British Auction Config Options */}
          <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
              British Auction Dynamic Extension Rules
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trigger Window X (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={triggerWindowMinutes}
                  onChange={(e) => setTriggerWindowMinutes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Monitors bidding activity in the last {triggerWindowMinutes} minutes before close
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Extension Duration Y (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={extensionDurationMinutes}
                  onChange={(e) => setExtensionDurationMinutes(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Extends close time by +{extensionDurationMinutes} mins upon qualifying trigger
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Extension Trigger Condition
              </label>
              <select
                value={extensionTrigger}
                onChange={(e) => setExtensionTrigger(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg py-2 px-3 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="L1_RANK_CHANGE">
                  (c) Lowest Bidder (L1) Rank Change in Last X Minutes (Recommended)
                </option>
                <option value="ANY_RANK_CHANGE">
                  (b) Any Supplier Rank Change in Last X Minutes
                </option>
                <option value="BID_RECEIVED">
                  (a) Any Bid Received in Last X Minutes
                </option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{loading ? 'Creating British Auction RFQ...' : 'Create British Auction RFQ'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

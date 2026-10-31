import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Clock, Sliders, Shield, RefreshCw, AlertCircle } from 'lucide-react';
import { fetchRfqDetails, fetchRfqEvents, fetchSuppliers } from '../api/client';
import { useAuctionStream } from '../api/useAuctionStream';
import { StatusBadge } from '../components/StatusBadge';
import { CountdownTimer } from '../components/CountdownTimer';
import { RankingsTable } from '../components/RankingsTable';
import { BidModal } from '../components/BidModal';
import { ActivityLog } from '../components/ActivityLog';
import { AuctionFlowVisualizer } from '../components/AuctionFlowVisualizer';

export function AuctionDetailPage({ rfqId, onBack }) {
  const [rfq, setRfq] = useState(null);
  const [events, setEvents] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFlow, setShowFlow] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [details, activity, sups] = await Promise.all([
        fetchRfqDetails(rfqId),
        fetchRfqEvents(rfqId),
        fetchSuppliers(),
      ]);
      setRfq(details);
      setEvents(activity);
      setSuppliers(sups);
    } catch (err) {
      setError(err.message || 'Failed to load auction details');
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Real-time SSE Handler
  const handleStreamEvent = useCallback((event) => {
    if (event.type === 'bid_submitted') {
      const { current_bid_close_time, rankings, bid } = event.payload.data;
      setRfq((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          current_bid_close_time: current_bid_close_time || prev.current_bid_close_time,
          rankings: rankings || prev.rankings,
          lowest_bid_amount: rankings?.[0]?.total_price ?? prev.lowest_bid_amount,
          all_bids: [bid, ...prev.all_bids],
        };
      });
      // Refresh event log
      fetchRfqEvents(rfqId).then(setEvents);
    } else if (event.type === 'auction_extended' || event.type === 'auction_closed' || event.type === 'auction_started') {
      loadData();
    }
  }, [rfqId, loadData]);

  const { isConnected } = useAuctionStream(rfqId, handleStreamEvent);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-2" />
        <p className="text-sm text-slate-500">Loading auction details...</p>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="bg-red-50 p-6 rounded-xl border border-red-200 text-center">
        <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-2" />
        <h3 className="text-base font-bold text-red-800">Error Loading Auction</h3>
        <p className="text-sm text-red-600 mt-1">{error || 'RFQ not found'}</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-1.5 bg-white border border-red-300 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-100"
        >
          Return to Auctions
        </button>
      </div>
    );
  }

  const triggerLabel = {
    BID_RECEIVED: 'Any Bid Received in Window',
    ANY_RANK_CHANGE: 'Any Supplier Rank Change in Window',
    L1_RANK_CHANGE: 'Lowest Bidder (L1) Shift in Window',
  }[rfq.config?.extension_trigger] || rfq.config?.extension_trigger;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Auctions</span>
        </button>

        <div className="flex items-center space-x-3 text-xs">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${
            isConnected ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`}></span>
            {isConnected ? 'Real-Time SSE Connected' : 'Connecting Stream...'}
          </span>
          <button
            onClick={() => setShowFlow(!showFlow)}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 underline cursor-pointer"
          >
            {showFlow ? 'Hide Architecture Flow' : 'Show Architecture Flow'}
          </button>
        </div>
      </div>

      {/* RFQ Header Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {rfq.reference_id}
              </span>
              <StatusBadge status={rfq.status} />
              <span className="text-xs text-slate-400">• Pickup: {rfq.pickup_date}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">{rfq.name}</h1>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right">
              <span className="text-xs text-slate-400 block uppercase font-semibold">Current L1 Price</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">
                {rfq.lowest_bid_amount !== null
                  ? `$${rfq.lowest_bid_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Dynamic British Auction Timing & Config Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
          <CountdownTimer
            currentCloseTime={rfq.current_bid_close_time}
            forcedCloseTime={rfq.forced_bid_close_time}
            serverTime={rfq.server_time}
            status={rfq.status}
            triggerWindowMinutes={rfq.config?.trigger_window_minutes}
          />

          {/* Config Detail */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center space-x-1.5 mb-2">
              <Sliders className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                British Auction Rules
              </span>
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Trigger Window (X):</span>
                <span className="font-bold text-slate-800">{rfq.config?.trigger_window_minutes} Minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Extension Duration (Y):</span>
                <span className="font-bold text-slate-800">+{rfq.config?.extension_duration_minutes} Minutes</span>
              </div>
              <div className="pt-1 border-t border-slate-200 text-slate-600">
                <span className="text-[11px] block font-medium text-slate-500">Trigger Condition:</span>
                <span className="font-semibold text-blue-700">{triggerLabel}</span>
              </div>
            </div>
          </div>

          {/* Forced Close Ceiling Safeguard */}
          <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center space-x-1.5 mb-2">
              <Shield className="w-4 h-4 text-slate-600" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Ceiling Safeguard
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              British Auction extensions are strictly bounded. The auction will terminate at forced close even if new bids arrive.
            </p>
            <div className="pt-2 border-t border-slate-200 text-xs flex justify-between font-mono text-slate-700">
              <span className="text-slate-500 font-sans">Hard Limit:</span>
              <span className="font-bold">
                {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* React Flow Visualizer */}
      {showFlow && (
        <AuctionFlowVisualizer
          rfq={rfq}
          isInTriggerWindow={rfq.in_trigger_window}
        />
      )}

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Rankings & Bid Submission */}
        <div className="lg:col-span-2 space-y-6">
          <RankingsTable rankings={rfq.rankings} />

          {rfq.status === 'ACTIVE' && (
            <BidModal
              rfqId={rfq.id}
              suppliers={suppliers}
              existingBids={rfq.all_bids}
              onSuccess={() => {
                loadData();
              }}
            />
          )}
        </div>

        {/* Right Column: Live Event Audit Log */}
        <div className="lg:col-span-1">
          <ActivityLog events={events} />
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Search, Filter, Plus, ArrowUpRight, Clock, Award, ShieldAlert } from 'lucide-react';
import { fetchRfqs } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';

export function AuctionListPage({ onSelectRfq, onNavigateCreate }) {
  const [rfqs, setRfqs] = useState([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const data = await fetchRfqs(statusFilter, searchQuery);
      setRfqs(data);
    } catch (err) {
      console.error('Failed to load RFQs', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [statusFilter, searchQuery]);

  const activeCount = rfqs.filter((r) => r.status === 'ACTIVE').length;
  const closedCount = rfqs.filter((r) => r.status === 'CLOSED' || r.status === 'FORCE_CLOSED').length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Total RFQs</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{rfqs.length}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            All
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-emerald-600 tracking-wider">Active Bidding</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{activeCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Concluded</span>
            <div className="text-2xl font-bold text-slate-900 mt-1">{closedCount}</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center font-bold">
            ✓
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {['ALL', 'ACTIVE', 'SCHEDULED', 'CLOSED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                statusFilter === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name or RFQ ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
          />
        </div>
      </div>

      {/* RFQ Listing Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">RFQ Reference</th>
                <th className="py-3 px-4 text-left">Lane / Description</th>
                <th className="py-3 px-4 text-left">Status</th>
                <th className="py-3 px-4 text-right">Current Lowest (L1)</th>
                <th className="py-3 px-4 text-left">Bid Close Time</th>
                <th className="py-3 px-4 text-left">Forced Close</th>
                <th className="py-3 px-4 text-center">Bids</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-400">
                    Loading auctions...
                  </td>
                </tr>
              ) : rfqs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-10 text-center text-slate-400">
                    No British Auctions found matching the criteria.
                  </td>
                </tr>
              ) : (
                rfqs.map((rfq) => (
                  <tr
                    key={rfq.id}
                    onClick={() => onSelectRfq(rfq.id)}
                    className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 whitespace-nowrap">
                      {rfq.reference_id}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div>{rfq.name}</div>
                      <span className="text-[11px] text-slate-400">Pickup: {rfq.pickup_date}</span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <StatusBadge status={rfq.status} />
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-semibold">
                      {rfq.lowest_bid_amount !== null ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          ${rfq.lowest_bid_amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">No bids</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-700 font-mono">
                      {new Date(rfq.current_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                      {new Date(rfq.forced_bid_close_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-slate-700">
                      {rfq.bids_count}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectRfq(rfq.id);
                        }}
                        className="inline-flex items-center space-x-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-md transition-colors"
                      >
                        <span>Details & Bid</span>
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

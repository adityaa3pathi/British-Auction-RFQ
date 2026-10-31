import React from 'react';
import { Award, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';

export function RankingsTable({ rankings = [] }) {
  if (!rankings || rankings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          <TrendingDown className="w-6 h-6" />
        </div>
        <h4 className="text-base font-semibold text-slate-900 mb-1">No Quotes Submitted Yet</h4>
        <p className="text-sm text-slate-500 max-w-sm mx-auto">
          Suppliers can submit quotes below. The lowest price will automatically capture the L1 leader position.
        </p>
      </div>
    );
  }

  const l1Bid = rankings[0];

  return (
    <div className="space-y-4">
      {/* L1 Spotlight Banner */}
      {l1Bid && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-200/60 px-2 py-0.5 rounded">
                  Current Lowest Bidder (L1)
                </span>
                <span className="text-xs text-emerald-600 font-medium">{l1Bid.carrier_name}</span>
              </div>
              <h3 className="text-base font-bold text-slate-900">{l1Bid.supplier_name}</h3>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-xs text-slate-500 block">Total Landed Quote</span>
            <span className="text-2xl font-black text-emerald-700 font-mono">
              ${l1Bid.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/70 flex justify-between items-center">
          <h3 className="text-sm font-semibold text-slate-900">
            Supplier Leaderboard & Charges Breakdown
          </h3>
          <span className="text-xs text-slate-500 font-medium">
            {rankings.length} {rankings.length === 1 ? 'quote' : 'competing quotes'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3 px-4 text-left">Rank</th>
                <th className="py-3 px-4 text-left">Supplier</th>
                <th className="py-3 px-4 text-left">Carrier</th>
                <th className="py-3 px-4 text-right">Freight</th>
                <th className="py-3 px-4 text-right">Origin</th>
                <th className="py-3 px-4 text-right">Dest.</th>
                <th className="py-3 px-4 text-right font-bold text-slate-700">Total Price</th>
                <th className="py-3 px-4 text-center">Transit</th>
                <th className="py-3 px-4 text-left">Valid Until</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rankings.map((bid) => {
                const isL1 = bid.rank === 1;
                return (
                  <tr
                    key={bid.bid_id}
                    className={`transition-colors hover:bg-slate-50/80 ${
                      isL1 ? 'bg-emerald-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                          isL1
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : bid.rank === 2
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {bid.rank_label}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-900 font-semibold">
                      {bid.supplier_name}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                      {bid.carrier_name}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ${bid.freight_charges.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ${bid.origin_charges.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-600">
                      ${bid.destination_charges.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      <span className={isL1 ? 'text-emerald-700 text-base' : 'text-slate-900'}>
                        ${bid.total_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-600">
                      {bid.transit_time_days} days
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 text-xs">
                      {bid.quote_valid_until}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

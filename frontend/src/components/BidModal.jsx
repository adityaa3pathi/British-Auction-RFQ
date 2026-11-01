import React, { useState, useEffect } from 'react';
import { Send, AlertCircle, Check, DollarSign, Building2, Truck, Calendar } from 'lucide-react';
import { submitBid } from '../api/client';

export function BidModal({ rfqId, suppliers = [], existingBids = [], onSuccess }) {
  const [supplierId, setSupplierId] = useState('');
  const [carrierName, setCarrierName] = useState('Maersk Line');
  const [freightCharges, setFreightCharges] = useState(1100);
  const [originCharges, setOriginCharges] = useState(150);
  const [destinationCharges, setDestinationCharges] = useState(150);
  const [transitTimeDays, setTransitTimeDays] = useState(25);
  const [quoteValidUntil, setQuoteValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Set default supplier once loaded
  useEffect(() => {
    if (suppliers.length > 0 && !supplierId) {
      setSupplierId(suppliers[0].id);
    }
  }, [suppliers, supplierId]);

  // Find supplier's current lowest prior bid on this RFQ
  const supplierBids = existingBids.filter((b) => b.supplier_id === supplierId);
  const latestPriorBid = supplierBids.length > 0 ? supplierBids[0] : null;

  const totalPrice = (
    (parseFloat(freightCharges) || 0) +
    (parseFloat(originCharges) || 0) +
    (parseFloat(destinationCharges) || 0)
  );

  const isLowerThanPrevious = !latestPriorBid || totalPrice < latestPriorBid.total_price;

  async function handleSubmit(e) {
    e.preventDefault();
    setErrorMessage('');
    setSuccessNotice('');

    if (!isLowerThanPrevious) {
      setErrorMessage(
        `Continuous Lowering Rule: Your total bid ($${totalPrice.toFixed(2)}) must be strictly lower than your previous bid ($${latestPriorBid.total_price.toFixed(2)}).`
      );
      return;
    }

    setLoading(true);
    try {
      const res = await submitBid(rfqId, {
        supplier_id: supplierId,
        carrier_name: carrierName,
        freight_charges: parseFloat(freightCharges),
        origin_charges: parseFloat(originCharges),
        destination_charges: parseFloat(destinationCharges),
        transit_time_days: parseInt(transitTimeDays, 10),
        quote_valid_until: quoteValidUntil,
      });

      setSuccessNotice(
        res.extended
          ? `🎉 Quote submitted! British Auction triggered: ${res.extension_reason}`
          : `✅ Quote submitted! (Auction did not extend: ${res.extension_reason})`
      );
      // Decrement freight by 50 so next potential bid is pre-filled validly without red alert
      setFreightCharges((prev) => Math.max(0, parseFloat(prev) - 50));
      onSuccess?.(res);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to submit quote');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
        <div>
          <h3 className="text-base font-bold text-slate-900">Submit Competitive Quote</h3>
          <p className="text-xs text-slate-500">
            Submit a new quote to compete for L1 rank. Quotes lower than existing bids will trigger auction extensions.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start space-x-2">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start space-x-2">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
          <span>{successNotice}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Supplier Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Act As Supplier (Demo Simulation)
          </label>
          <div className="relative">
            <select
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg py-2 pl-3 pr-10 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            >
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.email})
                </option>
              ))}
            </select>
          </div>
          {latestPriorBid ? (
            <div className="mt-1.5 text-xs text-slate-500 flex items-center space-x-1">
              <span>Your previous quote:</span>
              <span className="font-semibold text-slate-700 font-mono">
                ${latestPriorBid.total_price.toFixed(2)}
              </span>
              <span className="text-blue-600">(Target to beat: &lt; ${latestPriorBid.total_price.toFixed(2)})</span>
            </div>
          ) : (
            <span className="text-xs text-emerald-600 mt-1 block">First quote for this supplier</span>
          )}
        </div>

        {/* Carrier Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Carrier Name</label>
          <input
            type="text"
            required
            value={carrierName}
            onChange={(e) => setCarrierName(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            placeholder="e.g. Maersk, CMA CGM, Hapag-Lloyd"
          />
        </div>

        {/* Charges Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Freight ($)</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={freightCharges}
              onChange={(e) => setFreightCharges(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Origin Charges ($)</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={originCharges}
              onChange={(e) => setOriginCharges(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dest. Charges ($)</label>
            <input
              type="number"
              step="0.01"
              required
              min="0"
              value={destinationCharges}
              onChange={(e) => setDestinationCharges(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Live Total Price Preview Card */}
        <div className={`p-3 rounded-lg border flex items-center justify-between ${
          !isLowerThanPrevious
            ? 'bg-red-50/70 border-red-200 text-red-900'
            : 'bg-slate-50 border-slate-200 text-slate-900'
        }`}>
          <div>
            <span className="text-xs font-medium text-slate-500 block">Calculated Total Landed Price</span>
            {!isLowerThanPrevious && (
              <span className="text-xs text-red-600 font-semibold block">
                Must be lower than previous ${latestPriorBid?.total_price.toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-xl font-bold font-mono tracking-tight">
              ${totalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Transit Time & Validity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Transit Time (Days)</label>
            <input
              type="number"
              required
              min="1"
              value={transitTimeDays}
              onChange={(e) => setTransitTimeDays(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Quote Validity Date</label>
            <input
              type="date"
              required
              value={quoteValidUntil}
              onChange={(e) => setQuoteValidUntil(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg py-1.5 px-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isLowerThanPrevious}
          className="w-full mt-2 inline-flex items-center justify-center space-x-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          <Send className="w-4 h-4" />
          <span>{loading ? 'Submitting Quote...' : 'Submit Quote to Auction'}</span>
        </button>
      </form>
    </div>
  );
}

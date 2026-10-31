import React from 'react';
import { Layers, Plus, Activity } from 'lucide-react';

export function Navbar({ activePage, setActivePage }) {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActivePage('list')}>
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-slate-900 tracking-tight block">
                British Auction RFQ
              </span>
              <span className="text-xs text-slate-500 font-medium">Dynamic Extension Engine</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => setActivePage('list')}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activePage === 'list'
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              All Auctions
            </button>
            <button
              onClick={() => setActivePage('create')}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create RFQ</span>
            </button>
            <div className="hidden sm:flex items-center pl-3 border-l border-slate-200 text-xs text-emerald-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
              Live Sync
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

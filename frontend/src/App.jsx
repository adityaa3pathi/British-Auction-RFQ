import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { AuctionListPage } from './pages/AuctionListPage';
import { AuctionDetailPage } from './pages/AuctionDetailPage';
import { CreateRfqPage } from './pages/CreateRfqPage';

export function App() {
  const [activePage, setActivePage] = useState('list'); // 'list' | 'details' | 'create'
  const [selectedRfqId, setSelectedRfqId] = useState(null);

  function handleSelectRfq(rfqId) {
    setSelectedRfqId(rfqId);
    setActivePage('details');
  }

  function handleRfqCreated(newId) {
    setSelectedRfqId(newId);
    setActivePage('details');
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar
        activePage={activePage}
        setActivePage={(page) => {
          setActivePage(page);
          if (page === 'list') setSelectedRfqId(null);
        }}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activePage === 'list' && (
          <AuctionListPage
            onSelectRfq={handleSelectRfq}
            onNavigateCreate={() => setActivePage('create')}
          />
        )}

        {activePage === 'details' && selectedRfqId && (
          <AuctionDetailPage
            rfqId={selectedRfqId}
            onBack={() => setActivePage('list')}
          />
        )}

        {activePage === 'create' && (
          <CreateRfqPage
            onBack={() => setActivePage('list')}
            onCreated={handleRfqCreated}
          />
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        British Auction RFQ System • Built with FastAPI, SQLAlchemy, React & React Flow
      </footer>
    </div>
  );
}

export default App;

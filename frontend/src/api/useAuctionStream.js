import { useEffect, useRef, useState } from 'react';
import { API_BASE } from './client';

export function useAuctionStream(rfqId, onEvent) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!rfqId) return;

    let eventSource = null;
    let reconnectTimeout = null;

    function connect() {
      eventSource = new EventSource(`${API_BASE}/rfqs/${rfqId}/stream`);

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('connected', () => {
        setIsConnected(true);
      });

      eventSource.addEventListener('bid_submitted', (e) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.({ type: 'bid_submitted', payload });
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      });

      eventSource.addEventListener('auction_extended', (e) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.({ type: 'auction_extended', payload });
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      });

      eventSource.addEventListener('auction_closed', (e) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.({ type: 'auction_closed', payload });
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      });

      eventSource.addEventListener('auction_started', (e) => {
        try {
          const payload = JSON.parse(e.data);
          onEventRef.current?.({ type: 'auction_started', payload });
        } catch (err) {
          console.error('Failed to parse SSE payload', err);
        }
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        // Reconnect after 3s
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (eventSource) eventSource.close();
    };
  }, [rfqId]);

  return { isConnected };
}

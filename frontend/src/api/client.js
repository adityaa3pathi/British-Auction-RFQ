const API_BASE = '/api';

export async function fetchRfqs(status = 'ALL', query = '') {
  const params = new URLSearchParams();
  if (status && status !== 'ALL') params.append('status', status);
  if (query) params.append('q', query);

  const res = await fetch(`${API_BASE}/rfqs?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch RFQs');
  return res.json();
}

export async function fetchRfqDetails(rfqId) {
  const res = await fetch(`${API_BASE}/rfqs/${rfqId}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail?.message || 'Failed to load RFQ details');
  }
  return res.json();
}

export async function fetchRfqEvents(rfqId) {
  const res = await fetch(`${API_BASE}/rfqs/${rfqId}/events`);
  if (!res.ok) throw new Error('Failed to fetch activity log');
  return res.json();
}

export async function createRfq(payload) {
  const res = await fetch(`${API_BASE}/rfqs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.detail?.message || 'Failed to create RFQ');
  }
  return res.json();
}

export async function submitBid(rfqId, payload) {
  const res = await fetch(`${API_BASE}/rfqs/${rfqId}/bids`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    const message = error.detail?.message || error.detail || 'Failed to submit quote';
    const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
    err.code = error.detail?.code;
    err.details = error.detail;
    throw err;
  }
  return res.json();
}

export async function fetchSuppliers() {
  const res = await fetch(`${API_BASE}/suppliers`);
  if (!res.ok) throw new Error('Failed to fetch suppliers');
  return res.json();
}

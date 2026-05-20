/**
 * api.js — Centralized API client for the Admin Portal
 *
 * HOW TOKEN ACQUISITION WORKS:
 * - In dev mode:   uses 'dev-mock-token-admin' (backend auth.js accepts it)
 * - In production: pass `getToken` from useEmployeeAuth() to each api group factory
 *
 * Usage in components:
 *   const { getToken } = useAuthContext();
 *   const api = createApi(getToken);
 *   const result = await api.customers.getAll();
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const isDev    = import.meta.env.DEV;

const handleResponse = async (res) => {
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── Factory: creates an authenticated API client ─────────────────────────
export const createApi = (getToken) => {
  const h = async () => {
    const token = isDev ? 'dev-mock-token-admin' : await getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const get    = async (path)         => fetch(`${BASE_URL}${path}`,             { headers: await h() }).then(handleResponse);
  const post   = async (path, body)   => fetch(`${BASE_URL}${path}`,             { method: 'POST',   headers: await h(), body: JSON.stringify(body) }).then(handleResponse);
  const put    = async (path, body)   => fetch(`${BASE_URL}${path}`,             { method: 'PUT',    headers: await h(), body: JSON.stringify(body) }).then(handleResponse);
  const patch  = async (path, body)   => fetch(`${BASE_URL}${path}`,             { method: 'PATCH',  headers: await h(), body: JSON.stringify(body) }).then(handleResponse);
  const del    = async (path)         => fetch(`${BASE_URL}${path}`,             { method: 'DELETE', headers: await h() }).then(handleResponse);

  return {
    customers: {
      getAll:   ()              => get('/customers'),
      getById:  (id)            => get(`/customers/${id}`),
      create:   (data)          => post('/customers', data),
      update:   (id, data)      => put(`/customers/${id}`, data),
      delete:   (id)            => del(`/customers/${id}`),
      freeze:   (id, reason)    => patch(`/customers/${id}/freeze`,   { reason }),
      unfreeze: (id)            => patch(`/customers/${id}/unfreeze`, {}),
      flag:     (id, reason)    => patch(`/customers/${id}/flag`,     { reason }),
    },
    transactions: {
      getAll: (params = {}) => {
        const q = new URLSearchParams();
        if (params.limit) q.append('limit', params.limit);
        if (params.offset) q.append('offset', params.offset);
        if (params.type) q.append('type', params.type);
        if (params.minAmount) q.append('minAmount', params.minAmount);
        if (params.search) q.append('search', params.search);
        if (params.flagged) q.append('flagged', params.flagged);
        return get(`/transactions?${q.toString()}`);
      },
      getStats: ()                     => get('/transactions/stats'),
      getByCustomer: (cid, limit = 50) => get(`/transactions/customer/${cid}?limit=${limit}`),
      getByAccount:  (aid, limit = 50) => get(`/transactions/account/${aid}?limit=${limit}`),
      create:  (data)                  => post('/transactions', data),
    },
    accounts: {
      getByCustomer: (cid)  => get(`/accounts/customer/${cid}`),
      open:          (data) => post('/accounts', data),
    },
    kyc: {
      getPending:  ()                              => get('/kyc/pending'),
      approve:     (subId, customerId)             => patch(`/kyc/${subId}/approve`, { customer_id: customerId }),
      reject:      (subId, customerId, note)       => patch(`/kyc/${subId}/reject`,  { customer_id: customerId, note }),
      getAmlFlags: (cid)                           => get(`/kyc/aml/${cid}`),
      resolveFlag: (fid, note)                     => patch(`/kyc/aml/${fid}/resolve`, { note }),
    },
    audit: {
      getAll: (limit = 100, offset = 0)            => get(`/audit?limit=${limit}&offset=${offset}`),
    },
    health: () => fetch(`${BASE_URL}/health`).then(r => r.json()),
  };
};

// ── Simple default client for dev (no token factory needed) ──────────────
export const devApi = createApi(() => Promise.resolve('dev-mock-token-admin'));

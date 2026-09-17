import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token expiration / unauth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isAuthUrl = error.config.url.includes('/auth/login');
      if (!isAuthUrl) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

// --- AUTH API ---
export const authAPI = {
  login: async (username, password) => {
    const response = await api.post('/auth/login', { username, password });
    return response.data;
  },
  getMe: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// --- PURCHASE REQUESTS API ---
export const prAPI = {
  getAll: async () => {
    const response = await api.get('/purchase-requests');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/purchase-requests/${id}`);
    return response.data;
  },
  create: async (data) => {
    const response = await api.post('/purchase-requests', data);
    return response.data;
  },
  getCompliance: async (id) => {
    const response = await api.get(`/purchase-requests/${id}/compliance`);
    return response.data;
  },
};

// --- VENDORS API (GOVERNMENT FACING) ---
export const vendorAPI = {
  getAll: async () => {
    const response = await api.get('/vendors');
    return response.data;
  },
  getRecommendations: async (prId) => {
    const response = await api.get(`/vendors/recommendations/${prId}`);
    return response.data;
  },
  negotiate: async (prId) => {
    const response = await api.post(`/vendors/negotiate/${prId}`);
    return response.data;
  },
  getAllNegotiations: async () => {
    const response = await api.get('/gov/vendors/negotiations');
    return response.data;
  },
  getNegotiationHistory: async (sessionId) => {
    const response = await api.get(`/gov/vendors/negotiation/${sessionId}`);
    return response.data;
  },
  actionEscalation: async (sessionId, decision, comment) => {
    const response = await api.post(`/gov/vendors/negotiation/${sessionId}/escalation`, {
      decision,
      comment,
    });
    return response.data;
  },
  resumeNegotiation: async (sessionId) => {
    const response = await api.post(`/gov/vendors/negotiation/${sessionId}/resume`);
    return response.data;
  },
};

// --- NEGOTIATIONS API ---
export const negotiationsAPI = {
  getAll: async () => {
    const response = await api.get('/gov/vendors/negotiations');
    return response.data;
  },
  getHistory: async (sessionId) => {
    const response = await api.get(`/gov/vendors/negotiation/${sessionId}`);
    return response.data;
  },
  actionEscalation: async (sessionId, decision, comment) => {
    const response = await api.post(`/gov/vendors/negotiation/${sessionId}/escalation`, {
      decision,
      comment,
    });
    return response.data;
  },
  counterOffer: async (sessionId, price, deliveryDays, message) => {
    const response = await api.post(`/gov/vendors/negotiation/${sessionId}/counter`, {
      price: Number(price),
      delivery_days: Number(deliveryDays),
      message: message || undefined,
    });
    return response.data;
  },
  resumeNegotiation: async (sessionId) => {
    const response = await api.post(`/gov/vendors/negotiation/${sessionId}/resume`);
    return response.data;
  },
  negotiate: async (prId) => {
    const response = await api.post(`/gov/vendors/negotiate/${prId}`);
    return response.data;
  },
};

// --- VENDOR PORTAL API ---
export const vendorPortalAPI = {
  getOrders: async () => {
    const response = await api.get('/vendor/orders');
    return response.data;
  },
  getMyBids: async () => {
    const response = await api.get('/vendor/bids');
    return response.data;
  },
  submitBid: async (bidData) => {
    const response = await api.post('/vendor/bids', bidData);
    return response.data;
  },
  getNegotiations: async () => {
    const response = await api.get('/vendor/negotiation');
    return response.data;
  },
  getNegotiationDetail: async (sessionId) => {
    const response = await api.get(`/vendor/negotiation/${sessionId}`);
    return response.data;
  },
  actionEscalation: async (sessionId, decision, comment) => {
    const response = await api.post(`/vendor/negotiation/${sessionId}/escalation`, {
      decision,
      comment,
    });
    return response.data;
  },
  counterOffer: async (sessionId, price, deliveryDays, message) => {
    const response = await api.post(`/vendor/negotiation/${sessionId}/counter`, {
      price: Number(price),
      delivery_days: Number(deliveryDays),
      message: message || undefined,
    });
    return response.data;
  },
  resumeNegotiation: async (sessionId) => {
    const response = await api.post(`/vendor/negotiation/${sessionId}/resume`);
    return response.data;
  },
};

// --- APPROVALS & POS API ---
export const approvalsAPI = {
  getQueue: async (statusFilter) => {
    const params = statusFilter ? { status: statusFilter } : {};
    const response = await api.get('/approvals/queue', { params });
    return response.data;
  },
  takeAction: async (approvalId, action, comment) => {
    const response = await api.post(`/approvals/${approvalId}/action`, null, {
      params: { action, comment },
    });
    return response.data;
  },
  generatePO: async (prId, vendorId, comment) => {
    const params = {};
    if (vendorId) params.vendor_id = vendorId;
    if (comment) params.comment = comment;
    const response = await api.post(`/approvals/po/generate/${prId}`, null, { params });
    return response.data;
  },
  updatePOStatus: async (poNumber, newStatus) => {
    const response = await api.patch(`/approvals/po/${poNumber}/status`, { new_status: newStatus });
    return response.data;
  },
  getAllPOs: async () => {
    const response = await api.get('/approvals/pos');
    return response.data;
  },
  getNetSuiteSync: async (poNumber) => {
    const response = await api.get(`/approvals/po/${poNumber}/netsuite-sync`);
    return response.data;
  },
  getDownloadUrl: (poNumber) => `${API_BASE_URL}/approvals/po/${poNumber}/download`,
  downloadPDF: async (poNumber) => {
    const response = await api.get(`/approvals/po/${poNumber}/download`, {
      responseType: 'blob',
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${poNumber}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

// --- DASHBOARD API ---
export const dashboardAPI = {
  getMetrics: async () => {
    const response = await api.get('/dashboard/metrics');
    return response.data;
  },
  runAIAnalysis: async (prId) => {
    const response = await api.post(`/dashboard/ai-analysis/${prId}`);
    return response.data;
  },
};

export default api;

import api from './api';

// Panel del partner_admin — métricas agregadas + facturación de SU partner.
export const getPartnerMetrics = (partnerId, month) =>
  api.get(`/partners/${partnerId}/metrics`, { params: month ? { month } : {} });

export const getPartnerBilling = (partnerId, month) =>
  api.get(`/partners/${partnerId}/billing`, { params: month ? { month } : {} });

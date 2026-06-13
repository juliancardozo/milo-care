import api from './api';

// Álbum / registros de vínculo (logros, travesuras, momentos)

export const getBehaviors = (dogId, params) => api.get(`/dogs/${dogId}/behaviors`, { params });
export const createBehavior = (dogId, data) => api.post(`/dogs/${dogId}/behaviors`, data);
export const updateBehavior = (dogId, id, data) => api.patch(`/dogs/${dogId}/behaviors/${id}`, data);
export const deleteBehavior = (dogId, id) => api.delete(`/dogs/${dogId}/behaviors/${id}`);

import api from './api';

// Envía el historial completo y devuelve { reply, lead }.
// El backend es stateless: mandamos toda la conversación en cada turno.
export const postMiloMessage = (messages) => api.post('/milo-chat', { messages });

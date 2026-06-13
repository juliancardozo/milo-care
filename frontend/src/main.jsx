import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store/index.js';
import App from './App.jsx';
import { I18nProvider } from './i18n/I18nProvider.jsx';
import './utils/pwaInstall'; // captura beforeinstallprompt lo antes posible

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <I18nProvider>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </I18nProvider>
  </React.StrictMode>
);

// Registrar el Service Worker (necesario para notificaciones push).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => {
      console.warn('[sw] registro falló:', err.message);
    });
  });
}

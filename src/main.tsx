import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to trigger status refresh after mutations
const originalFetch = window.fetch;
try {
  Object.defineProperty(window, 'fetch', {
    value: async function(this: any, ...args: any[]) {
      const response = await originalFetch.apply(this, args);
      const url = typeof args[0] === 'string' ? args[0] : (args[0] instanceof Request ? args[0].url : '');
      
      if (url.includes('/api/') && !url.includes('/api/status') && !url.includes('/api/settings')) {
        // If it's a POST/DELETE/PUT, it might be a mutation. Dispatch refresh event.
        const method = args[1]?.method || 'GET';
        if (method.toUpperCase() !== 'GET') {
          window.dispatchEvent(new Event('app:refresh-status'));
        }
      }
      
      return response;
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Could not patch window.fetch directly due to sandbox restrictions:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

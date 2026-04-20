import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import './assets/tailwind.css';

import { ThemeProvider } from '@material-tailwind/react';

import App from './app/app';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js');
  });
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>
);

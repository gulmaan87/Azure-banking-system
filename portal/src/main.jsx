import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PublicClientApplication } from '@azure/msal-browser';
import { MsalProvider } from '@azure/msal-react';
import { msalConfig } from './auth/authConfig.js';
import App from './App.jsx';
import './index.css';

// Initialise MSAL once at the app root
const msalInstance = new PublicClientApplication(msalConfig);

// Initialize MSAL before rendering the React application
msalInstance.initialize().then(() => {
  const isInIframe = window.self !== window.top;

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        {isInIframe ? (
          <div style={{ display: 'none' }}>MSAL Active Frame</div>
        ) : (
          <App />
        )}
      </MsalProvider>
    </StrictMode>,
  );
}).catch(err => {
  console.error("MSAL initialization failed:", err);
});

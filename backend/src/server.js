import 'dotenv/config';
import { loadSecretsFromKeyVault } from './config/secrets.js';

// ── Bootstrap: load secrets from Azure Key Vault BEFORE anything else ─────
// On Azure VM: uses Managed Identity (no credentials needed)
// Locally: KEY_VAULT_URL not set → uses .env values
await loadSecretsFromKeyVault();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { rateLimit } from 'express-rate-limit';


import customersRouter    from './routes/customers.js';
import accountsRouter     from './routes/accounts.js';
import transactionsRouter from './routes/transactions.js';
import kycRouter          from './routes/kyc.js';
import healthRouter       from './routes/health.js';
import auditRouter        from './routes/audit.js';
import { initSignalR }   from './services/signalr.js';
import { initSentinel }  from './services/SentinelService.js';
import { initBlobStorage } from './services/BlobStorageService.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Parse FRONTEND_URLS (comma-separated), trim, dedupe
const allowedOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);

// Fallback to FRONTEND_URL if FRONTEND_URLS is empty or not set
if (allowedOrigins.length === 0 && process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}

// Default fallback for development
if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}

// Remove duplicates
const uniqueOrigins = [...new Set(allowedOrigins)];

console.log('🔒 Configured CORS Allowed Origins:', uniqueOrigins);

// Custom CORS origin validation middleware to return explicit 403 response for disallowed origins
const corsValidationMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  // Allow requests without Origin header (server-to-server, curl, health check etc.)
  if (!origin) {
    return next();
  }

  const isAllowed = uniqueOrigins.includes(origin);
  if (!isAllowed) {
    console.warn(`[CORS REJECTED] Origin "${origin}" is not in the allowed list.`);
    return res.status(403).json({
      error: 'CORS request denied: Origin not allowed.'
    });
  }

  next();
};

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(corsValidationMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    // If it reaches here, it has already been validated by corsValidationMiddleware
    // or is a request without Origin header (which is undefined).
    if (!origin || uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiter: 100 requests per 15 mins per IP
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);

// ── Body Parsing + Logging ─────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/health',       healthRouter);
app.use('/api/customers',    customersRouter);
app.use('/api/accounts',     accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/kyc',          kycRouter);
app.use('/api/audit',        auditRouter);

// ── SignalR Negotiate Endpoint ─────────────────────────────────────────────
// Clients call this to get the SignalR service URL + access token
// In Serverless mode the backend acts as a token broker
app.get('/api/signalr/negotiate', (req, res) => {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) {
    // Dev mode: no real SignalR — return a mock response
    return res.json({ url: null, accessToken: null, devMode: true });
  }

  try {
    // Parse the connection string to extract endpoint and key
    const parts    = Object.fromEntries(connStr.split(';').map(p => p.split('=')));
    const endpoint = `https://${parts.Endpoint?.replace('https://', '') || ''}client/hubs/adminHub`;
    // In production you'd sign a JWT here; for now return the endpoint
    res.json({ url: endpoint, devMode: false });
  } catch (err) {
    res.status(500).json({ error: 'SignalR negotiation failed' });
  }
});

// ── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message, err.stack);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

app.listen(PORT, () => {
  console.log(`🏦 Azure Bank API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   Tenant ID   : ${process.env.AZURE_TENANT_ID}`);
  // Initialize SignalR broadcaster after server is up
  initSignalR();
  // Initialize Azure Monitor / Sentinel log ingestion
  initSentinel();
  // Initialize Azure Blob Storage for KYC documents
  initBlobStorage();
});

export default app;

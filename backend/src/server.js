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

// ── Security Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

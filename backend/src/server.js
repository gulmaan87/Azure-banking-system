import 'dotenv/config';
import { loadSecretsFromKeyVault } from './config/secrets.js';




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


const allowedOrigins = (process.env.FRONTEND_URLS || '')
  .split(',')
  .map(o => o.trim())
  .filter(o => o.length > 0);


if (allowedOrigins.length === 0 && process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.trim());
}


if (allowedOrigins.length === 0) {
  allowedOrigins.push('http://localhost:5173');
}


const uniqueOrigins = [...new Set(allowedOrigins)];

console.log('🔒 Configured CORS Allowed Origins:', uniqueOrigins);


const corsValidationMiddleware = (req, res, next) => {
  const origin = req.headers.origin;

  
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


app.use(helmet());
app.use(corsValidationMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    
    
    if (!origin || uniqueOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));


const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use(limiter);


app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));


app.use('/api/health',       healthRouter);
app.use('/api/customers',    customersRouter);
app.use('/api/accounts',     accountsRouter);
app.use('/api/transactions', transactionsRouter);
app.use('/api/kyc',          kycRouter);
app.use('/api/audit',        auditRouter);




app.get('/api/signalr/negotiate', (req, res) => {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) {
    
    return res.json({ url: null, accessToken: null, devMode: true });
  }

  try {
    
    const parts    = Object.fromEntries(connStr.split(';').map(p => p.split('=')));
    const endpoint = `https://${parts.Endpoint?.replace('https://', '') || ''}client/hubs/adminHub`;
    
    res.json({ url: endpoint, devMode: false });
  } catch (err) {
    res.status(500).json({ error: 'SignalR negotiation failed' });
  }
});


app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


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
  
  initSignalR();
  
  initSentinel();
  
  initBlobStorage();
});

export default app;

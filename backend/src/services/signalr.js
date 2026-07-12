












import crypto from 'crypto';

let signalrEndpoint = null;
let signalrKey = null;





const parseConnectionString = (connStr) => {
  const parts = {};
  connStr.split(';').forEach(part => {
    const idx = part.indexOf('=');
    if (idx > 0) {
      parts[part.slice(0, idx)] = part.slice(idx + 1);
    }
  });
  return {
    endpoint: parts['Endpoint']?.replace(/\/$/, ''),
    key: parts['AccessKey'],
  };
};





const generateToken = (endpoint, key) => {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({
    aud: endpoint,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
  })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', key)
    .update(`${header}.${payload}`)
    .digest('base64url');
  return `${header}.${payload}.${signature}`;
};

export const initSignalR = () => {
  const connStr = process.env.SIGNALR_CONNECTION_STRING;
  if (!connStr) {
    console.log('ℹ️  SIGNALR_CONNECTION_STRING not set — real-time events disabled (dev mode)');
    return;
  }

  try {
    const { endpoint, key } = parseConnectionString(connStr);
    signalrEndpoint = endpoint;
    signalrKey      = key;
    console.log(`✅ SignalR broadcaster ready → ${endpoint}`);
  } catch (err) {
    console.error('❌ SignalR init failed:', err.message);
  }
};






export const broadcast = async (event, data) => {
  if (!signalrEndpoint || !signalrKey) return;

  const url   = `${signalrEndpoint}/api/v1/hubs/adminHub`;
  const token = generateToken(url, signalrKey);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ target: event, arguments: [data] }),
    });
    if (!res.ok) {
      console.error(`[SignalR] Broadcast '${event}' failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[SignalR] Broadcast '${event}' error:`, err.message);
  }
};





export const broadcastToUser = async (userId, event, data) => {
  if (!signalrEndpoint || !signalrKey) return;

  const url   = `${signalrEndpoint}/api/v1/hubs/adminHub/users/${encodeURIComponent(userId)}`;
  const token = generateToken(url, signalrKey);

  try {
    const res = await fetch(url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ target: event, arguments: [data] }),
    });
    if (!res.ok) {
      console.error(`[SignalR] Send to user '${userId}' failed: HTTP ${res.status}`);
    }
  } catch (err) {
    console.error(`[SignalR] Send to user '${userId}' error:`, err.message);
  }
};

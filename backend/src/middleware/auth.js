import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

const TENANT_ID  = process.env.AZURE_TENANT_ID;
const CLIENT_ID  = process.env.AZURE_CLIENT_ID;

// Azure AD JWKS endpoint — validates token signatures
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  rateLimit: true,
});

const getSigningKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    callback(null, key.getPublicKey());
  });
};

/**
 * verifyToken middleware
 * Validates the Azure AD Bearer JWT on every protected route.
 * Attaches decoded claims to req.user.
 */
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(
    token,
    getSigningKey,
    {
      audience: `api://${CLIENT_ID}`,
      issuer: `https://sts.windows.net/${TENANT_ID}/`,
      algorithms: ['RS256'],
    },
    (err, decoded) => {
      if (err) {
        console.warn('[Auth] Token verification failed:', err.message);
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      req.user = decoded;
      next();
    }
  );
};

/**
 * For local development: skip real token verification.
 * Set NODE_ENV=development and use this mock middleware.
 */
export const devMockToken = (req, res, next) => {
  // Simulates a bank_admins member (Walter White)
  req.user = {
    oid: 'mock-oid-walter',
    upn: 'walter@yourtenant.onmicrosoft.com',
    name: 'Walter White',
    groups: [process.env.AZURE_GROUP_BANK_ADMINS],
  };
  next();
};

// Export the right middleware based on environment
export const authMiddleware =
  process.env.NODE_ENV === 'development' ? devMockToken : verifyToken;

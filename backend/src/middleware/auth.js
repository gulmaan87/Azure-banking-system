import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { query } from '../db/connection.js';

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

  // In development/test if mock token matches employee admin bypass
  if (process.env.NODE_ENV === 'development' && token === 'dev-mock-token-admin') {
    req.user = {
      oid: 'mock-oid-walter',
      upn: 'walter@yourtenant.onmicrosoft.com',
      name: 'Walter White',
      groups: [process.env.AZURE_GROUP_BANK_ADMINS],
    };
    return next();
  }

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
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer dev-mock-token-customer-')) {
    const customerId = authHeader.replace('Bearer dev-mock-token-customer-', '').trim();
    // Determine email/name based on customerId
    let email = 'walter@mohdgulman87outlook.onmicrosoft.com';
    let name = 'Walter White';
    if (customerId === 'CUS-1002') {
      email = 'jesse@mohdgulman87outlook.onmicrosoft.com';
      name = 'Jesse Pinkman';
    } else if (customerId === 'CUS-1003') {
      email = 'gus@mohdgulman87outlook.onmicrosoft.com';
      name = 'Gustavo Fring';
    } else if (customerId === 'CUS-1004') {
      email = 'jane@mohdgulman87outlook.onmicrosoft.com';
      name = 'Jane Margolis';
    }
    req.user = {
      oid: `mock-oid-${customerId}`,
      upn: email,
      name: name,
      groups: [],
    };
    return next();
  }

  // Default: Walter White employee/admin
  req.user = {
    oid: 'mock-oid-walter',
    upn: 'walter@yourtenant.onmicrosoft.com',
    name: 'Walter White',
    groups: [process.env.AZURE_GROUP_BANK_ADMINS],
  };
  next();
};

/**
 * resolveCustomerIdentity middleware
 * Resolves the authenticated Azure AD claims (oid/sub and email) to a database customer.
 * If not found by oid/sub, attempts email lookup for first-time dynamic mapping.
 * Passes through for employee callers.
 */
export const resolveCustomerIdentity = async (req, res, next) => {
  const principalId = req.user?.oid || req.user?.sub;
  const email = req.user?.upn || req.user?.preferred_username || req.user?.email;

  if (!principalId) {
    return res.status(401).json({ error: 'Unauthorized: missing oid or sub claim' });
  }

  try {
    // 1. Try to find customer by customer_principal_id
    let result = await query('SELECT * FROM customers WHERE customer_principal_id = @principalId', { principalId });
    if (result.recordset.length > 0) {
      req.customer = result.recordset[0];
      return next();
    }

    // 2. If not found, try to find customer by email to perform dynamic mapping
    if (email) {
      result = await query('SELECT * FROM customers WHERE email = @email', { email });
      if (result.recordset.length > 0) {
        const customer = result.recordset[0];
        // Perform dynamic mapping
        await query('UPDATE customers SET customer_principal_id = @principalId, updated_at = GETUTCDATE() WHERE id = @id', {
          principalId,
          id: customer.id
        });
        customer.customer_principal_id = principalId;
        req.customer = customer;
        console.log(`[Auth] Dynamically mapped customer ${customer.id} to principal ID ${principalId}`);
        return next();
      }
    }

    // 3. Fallback: check if caller is an employee/staff
    const userGroups = req.user?.groups || [];
    const hasStaffRole = userGroups.some(group => 
      group === process.env.AZURE_GROUP_BANK_ADMINS ||
      group === process.env.AZURE_GROUP_SECURITY_AUDITORS ||
      group === process.env.AZURE_GROUP_APP_DEVELOPERS ||
      group === process.env.AZURE_GROUP_DATA_ENGINEERS
    );

    if (hasStaffRole) {
      return next();
    }

    // Otherwise, unauthorized customer context
    return res.status(403).json({ error: 'Access denied: unrecognized account or role context' });
  } catch (err) {
    console.error('[Auth] Error resolving customer identity:', err);
    return res.status(500).json({ error: 'Internal server error resolving identity' });
  }
};

// Export the right entry point middleware based on environment
const baseVerify = process.env.NODE_ENV === 'development' ? devMockToken : verifyToken;
export const authMiddleware = [baseVerify, resolveCustomerIdentity];

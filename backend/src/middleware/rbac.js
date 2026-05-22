/**
 * rbac.js — Role-Based Access Control middleware
 * Maps Azure AD Group Object IDs → internal role names.
 * Used as: router.get('/route', requireRole(['ADMIN', 'AUDITOR']), handler)
 */

const GROUP_ROLE_MAP = {
  [process.env.AZURE_GROUP_BANK_ADMINS]:         'ADMIN',
  [process.env.AZURE_GROUP_SECURITY_AUDITORS]:   'AUDITOR',
  [process.env.AZURE_GROUP_APP_DEVELOPERS]:      'DEVELOPER',
  [process.env.AZURE_GROUP_DATA_ENGINEERS]:      'DATA',
};

/**
 * Resolves the employee's role from their Azure AD group claims.
 * Returns the highest-privilege role found.
 */
export const resolveRole = (userGroups = []) => {
  for (const group of userGroups) {
    if (GROUP_ROLE_MAP[group]) return GROUP_ROLE_MAP[group];
  }
  return null;
};

/**
 * requireRole(['ADMIN', 'AUDITOR'])
 * Returns a middleware that allows only specified roles through.
 * Attaches req.role for use in controllers.
 */
export const requireRole = (allowedRoles) => (req, res, next) => {
  const userGroups = req.user?.groups || [];
  const role = resolveRole(userGroups);

  if (!role) {
    return res.status(403).json({ error: 'Access denied: no recognized role assigned' });
  }

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      error: `Access denied: requires ${allowedRoles.join(' or ')} role, you have ${role}`,
    });
  }

  req.role = role;
  next();
};

/**
 * requireSelfOrStaff(allowedRoles)
 * Permits access if the caller is the customer themselves (where req.params.id or req.params.customerId matches req.customer.id),
 * OR if the caller is an employee with one of the allowedRoles.
 */
export const requireSelfOrStaff = (allowedRoles) => (req, res, next) => {
  // 1. If caller is a customer
  if (req.customer) {
    const customerIdParam = req.params.customerId || req.params.id;
    if (customerIdParam && req.customer.id === customerIdParam) {
      // It is the customer accessing their own resource
      return next();
    }
    // Customer trying to access another customer's data - Forbidden!
    return res.status(403).json({ error: 'Access denied: you do not own this resource' });
  }

  // 2. Otherwise, check employee roles
  const userGroups = req.user?.groups || [];
  const role = resolveRole(userGroups);

  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  }

  req.role = role;
  next();
};

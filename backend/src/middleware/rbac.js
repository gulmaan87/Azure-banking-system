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

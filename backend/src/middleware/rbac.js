





const GROUP_ROLE_MAP = {
  [process.env.AZURE_GROUP_BANK_ADMINS]:         'ADMIN',
  [process.env.AZURE_GROUP_SECURITY_AUDITORS]:   'AUDITOR',
  [process.env.AZURE_GROUP_APP_DEVELOPERS]:      'DEVELOPER',
  [process.env.AZURE_GROUP_DATA_ENGINEERS]:      'DATA',
};





export const resolveRole = (userGroups = []) => {
  for (const group of userGroups) {
    if (GROUP_ROLE_MAP[group]) return GROUP_ROLE_MAP[group];
  }
  return null;
};






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






export const requireSelfOrStaff = (allowedRoles) => (req, res, next) => {
  
  if (req.customer) {
    const customerIdParam = req.params.customerId || req.params.id;
    if (customerIdParam && req.customer.id === customerIdParam) {
      
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied: you do not own this resource' });
  }

  
  const userGroups = req.user?.groups || [];
  const role = resolveRole(userGroups);

  if (!role || !allowedRoles.includes(role)) {
    return res.status(403).json({ error: 'Access denied: insufficient permissions' });
  }

  req.role = role;
  next();
};

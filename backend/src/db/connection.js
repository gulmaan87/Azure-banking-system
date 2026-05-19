import sql from 'mssql';

// Config pulled from env — Key Vault integration added in production
const config = {
  server:   process.env.DB_SERVER   || 'localhost',
  port:     parseInt(process.env.DB_PORT) || 1433,
  database: process.env.DB_NAME     || 'BankingDB',
  user:     process.env.DB_USER     || 'bankapp',
  password: process.env.DB_PASSWORD || 'YourStrong@Passw0rd',
  options: {
    encrypt: process.env.NODE_ENV === 'production', // true on Azure, false locally
    trustServerCertificate: process.env.NODE_ENV !== 'production',
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

export const getPool = async () => {
  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server');
  }
  return pool;
};

// Helper: run a parameterized query with named params
// Usage: query('SELECT * FROM customers WHERE id = @id', { id: 'CUS-1001' })
export const query = async (queryStr, params = {}) => {
  const db = await getPool();
  const request = db.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(queryStr);
};

export default { getPool, query };

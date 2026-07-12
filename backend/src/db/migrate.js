import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sql from 'mssql';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const server = process.env.DB_SERVER || 'localhost';
const port = parseInt(process.env.DB_PORT) || 1433;
const user = process.env.DB_USER || 'sa';
const password = process.env.DB_PASSWORD || 'YourStrong@Passw0rd';

async function runSqlFile(pool, filePath) {
  console.log(`Running SQL file: ${path.basename(filePath)}`);
  const content = fs.readFileSync(filePath, 'utf8');
  
  
  const batches = content.split(/\r?\nGO\r?\n|\r?\ngo\r?\n/i);
  
  for (let i = 0; i < batches.length; i++) {
    const rawBatch = batches[i].trim();
    if (!rawBatch) continue;
    
    
    if (rawBatch.toUpperCase().startsWith('CREATE DATABASE') || rawBatch.toUpperCase().startsWith('USE ')) {
      continue;
    }
    
    try {
      const request = new sql.Request(pool);
      await request.query(rawBatch);
      console.log(`  Batch ${i + 1}/${batches.length} executed successfully.`);
    } catch (err) {
      console.error(`❌ Error in batch ${i + 1}:`, err.message);
      console.error('Batch SQL:', rawBatch.substring(0, 200) + '...');
      throw err;
    }
  }
}

async function main() {
  const useDummyDb = process.env.USE_DUMMY_DB !== 'false';
  if (useDummyDb) {
    console.log('🔌 [Database] Bypassing migrations: Running in-memory dummy database mode.');
    process.exit(0);
  }

  const masterConfig = {
    server,
    port,
    user,
    password,
    database: 'master',
    options: {
      encrypt: process.env.NODE_ENV === 'production',
      trustServerCertificate: true,
    }
  };

  console.log(`Connecting to SQL Server at ${server}:${port} (database: master)...`);
  let pool;
  try {
    pool = await sql.connect(masterConfig);
    console.log('Connected. Ensuring BankingDB database exists...');
    
    
    await pool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BankingDB')
      BEGIN
        CREATE DATABASE BankingDB;
      END
    `);
    console.log('Database BankingDB verified.');
    await pool.close();
  } catch (err) {
    console.error('❌ Failed to ensure database exists:', err.message);
    process.exit(1);
  }

  const dbConfig = {
    server,
    port,
    user,
    password,
    database: 'BankingDB',
    options: {
      encrypt: process.env.NODE_ENV === 'production',
      trustServerCertificate: true,
    }
  };

  console.log(`Connecting to BankingDB at ${server}:${port}...`);
  try {
    pool = await sql.connect(dbConfig);
    console.log('Connected. Running migrations...');
    
    await runSqlFile(pool, path.join(__dirname, 'schema.sql'));
    await runSqlFile(pool, path.join(__dirname, 'migration_007_kyc_blob_storage.sql'));
    await runSqlFile(pool, path.join(__dirname, 'migration_008_customer_auth.sql'));
    
    console.log('🎉 Database migrations completed successfully!');
    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    if (pool) await pool.close();
    process.exit(1);
  }
}

main();

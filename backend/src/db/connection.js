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

// Check if we should use the in-memory dummy database
const useDummyDb = process.env.USE_DUMMY_DB !== 'false';

// ── IN-MEMORY DATABASE STATE ────────────────────────────────────────────────
const DB = {
  customers: [],
  accounts: [],
  transactions: [],
  kyc_submissions: [],
  aml_flags: [],
  audit_log: []
};

// ── SEED INITIAL MOCK DATA ──────────────────────────────────────────────────
if (useDummyDb) {
  console.log('🔌 [Database] Initializing in-memory dummy database with seed data...');
  
  const now = new Date();
  const daysAgo = (d) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000).toISOString();

  // 1. Customers
  DB.customers = [
    {
      id: 'CUS-1001',
      full_name: 'Walter White',
      email: 'walter@mohdgulman87outlook.onmicrosoft.com',
      phone: '555-0192',
      address: '308 Negra Arroyo Lane, Albuquerque, NM',
      date_of_birth: '1958-09-07',
      nationality: 'American',
      status: 'Active',
      risk_level: 'Low',
      kyc_verified: true,
      created_at: daysAgo(30),
      updated_at: daysAgo(30)
    },
    {
      id: 'CUS-1002',
      full_name: 'Jesse Pinkman',
      email: 'jesse@mohdgulman87outlook.onmicrosoft.com',
      phone: '555-0143',
      address: '9809 Maderia Drive NE, Albuquerque, NM',
      date_of_birth: '1984-09-24',
      nationality: 'American',
      status: 'Active',
      risk_level: 'Medium',
      kyc_verified: true,
      created_at: daysAgo(20),
      updated_at: daysAgo(20)
    },
    {
      id: 'CUS-1003',
      full_name: 'Gustavo Fring',
      email: 'gus@mohdgulman87outlook.onmicrosoft.com',
      phone: '555-0178',
      address: '1213 Jefferson St NE, Albuquerque, NM',
      date_of_birth: '1955-04-26',
      nationality: 'Chilean',
      status: 'Active',
      risk_level: 'High',
      kyc_verified: true,
      created_at: daysAgo(40),
      updated_at: daysAgo(10)
    },
    {
      id: 'CUS-1004',
      full_name: 'Jane Margolis',
      email: 'jane@mohdgulman87outlook.onmicrosoft.com',
      phone: '555-0100',
      address: 'Albuquerque, NM',
      date_of_birth: '1982-12-04',
      nationality: 'American',
      status: 'Review KYC',
      risk_level: 'Low',
      kyc_verified: false,
      created_at: daysAgo(2),
      updated_at: daysAgo(2)
    }
  ];

  // 2. Accounts
  DB.accounts = [
    {
      id: 'ACC-1001',
      customer_id: 'CUS-1001',
      account_type: 'Savings',
      balance: 500000.00,
      currency: 'USD',
      is_frozen: false,
      opened_at: daysAgo(30)
    },
    {
      id: 'ACC-1002',
      customer_id: 'CUS-1001',
      account_type: 'Checking',
      balance: 50000.00,
      currency: 'USD',
      is_frozen: false,
      opened_at: daysAgo(30)
    },
    {
      id: 'ACC-2001',
      customer_id: 'CUS-1002',
      account_type: 'Savings',
      balance: 80000.00,
      currency: 'USD',
      is_frozen: false,
      opened_at: daysAgo(20)
    },
    {
      id: 'ACC-3001',
      customer_id: 'CUS-1003',
      account_type: 'Checking',
      balance: 2500000.00,
      currency: 'USD',
      is_frozen: false,
      opened_at: daysAgo(40)
    }
  ];

  // 3. Transactions
  DB.transactions = [
    {
      id: 'TX-001',
      account_id: 'ACC-1001',
      type: 'Deposit',
      amount: 450000.00,
      balance_after: 500000.00,
      description: 'Initial seed funding',
      counterparty: 'Chemical Supply Corp',
      reference: 'INV-9921',
      country: 'US',
      ip_address: '102.16.4.5',
      created_by_emp: 'walter@mohdgulman87outlook.onmicrosoft.com',
      aml_flagged: false,
      created_at: daysAgo(29)
    },
    {
      id: 'TX-002',
      account_id: 'ACC-2001',
      type: 'Deposit',
      amount: 80000.00,
      balance_after: 80000.00,
      description: 'Contract payment',
      counterparty: 'A1A Carwash',
      reference: 'CLEAN-33',
      country: 'US',
      ip_address: '102.16.4.8',
      created_by_emp: 'system-agent',
      aml_flagged: false,
      created_at: daysAgo(19)
    },
    {
      id: 'TX-003',
      account_id: 'ACC-3001',
      type: 'Deposit',
      amount: 15000.00,
      balance_after: 2500000.00,
      description: 'Madrigal Electromotive Wire',
      counterparty: 'Madrigal GmbH',
      reference: 'MAD-2026',
      country: 'DE',
      ip_address: '194.55.22.1',
      created_by_emp: 'gus@mohdgulman87outlook.onmicrosoft.com',
      aml_flagged: true,
      created_at: daysAgo(5)
    }
  ];

  // 4. KYC Submissions
  DB.kyc_submissions = [
    {
      id: 'KYC-001',
      customer_id: 'CUS-1001',
      documents_json: JSON.stringify({ passport: 'https://mohdggulmaanbankr1.blob.core.windows.net/kyc-documents/walter_passport.pdf' }),
      status: 'Approved',
      submitted_by: 'walter@mohdgulman87outlook.onmicrosoft.com',
      reviewed_by: 'admin@mohdgulman87outlook.onmicrosoft.com',
      review_note: 'Verified driving license & utility bill.',
      submitted_at: daysAgo(30),
      reviewed_at: daysAgo(29)
    },
    {
      id: 'KYC-002',
      customer_id: 'CUS-1004',
      documents_json: JSON.stringify({ passport: 'https://mohdggulmaanbankr1.blob.core.windows.net/kyc-documents/jane_id.jpg' }),
      status: 'Pending',
      submitted_by: 'walter@mohdgulman87outlook.onmicrosoft.com',
      reviewed_by: null,
      review_note: null,
      submitted_at: daysAgo(2),
      reviewed_at: null
    }
  ];

  // 5. AML Flags
  DB.aml_flags = [
    {
      id: 'AML-001',
      customer_id: 'CUS-1003',
      transaction_id: 'TX-003',
      rule: 'LARGE_CASH',
      severity: 'High',
      description: 'Transaction of $15,000.00 exceeds $10,000 regulatory threshold',
      resolved: false,
      resolved_by: null,
      created_at: daysAgo(5),
      resolved_at: null
    }
  ];

  // 6. Audit Log
  DB.audit_log = [
    {
      id: 'AUD-001',
      action: 'APPROVE_KYC',
      entity_type: 'customer',
      entity_id: 'CUS-1001',
      performed_by: 'admin@mohdgulman87outlook.onmicrosoft.com',
      ip_address: '127.0.0.1',
      details_json: JSON.stringify({ note: 'Verified driving license' }),
      timestamp: daysAgo(29)
    }
  ];
}

// ── MOCK SQL QUERY HANDLER ──────────────────────────────────────────────────
export const handleMockQuery = async (queryStr, params = {}) => {
  const normalized = queryStr.toLowerCase().replace(/\s+/g, ' ').trim();

  // SELECT 1 (Health check)
  if (normalized === 'select 1') {
    return { recordset: [{ '1': 1 }], rowsAffected: [1] };
  }

  // ── CUSTOMERS TABLE ───────────────────────────────────────────────────────
  if (normalized.includes('from customers')) {
    // delete
    if (normalized.startsWith('delete')) {
      const id = params.id;
      const idx = DB.customers.findIndex(c => c.id === id);
      if (idx !== -1) {
        DB.customers.splice(idx, 1);
        DB.accounts = DB.accounts.filter(a => a.customer_id !== id);
      }
      return { recordset: [], rowsAffected: [idx !== -1 ? 1 : 0] };
    }
    // update kyc_verified & status
    if (normalized.includes('kyc_verified = 1') && normalized.includes("status = 'active'")) {
      const id = params.customerId || params.id;
      const cust = DB.customers.find(c => c.id === id);
      if (cust) {
        cust.kyc_verified = true;
        cust.status = 'Active';
        cust.updated_at = new Date().toISOString();
      }
      return { recordset: [], rowsAffected: [cust ? 1 : 0] };
    }
    // update status
    if (normalized.includes('set status = @status')) {
      const id = params.id || params.customerId || params.cid;
      const cust = DB.customers.find(c => c.id === id);
      if (cust) {
        cust.status = params.status;
        cust.updated_at = new Date().toISOString();
      }
      return { recordset: [], rowsAffected: [cust ? 1 : 0] };
    }
    // update risk_level
    if (normalized.includes('set risk_level = @risk')) {
      const id = params.id;
      const cust = DB.customers.find(c => c.id === id);
      if (cust) {
        cust.risk_level = params.risk;
        cust.updated_at = new Date().toISOString();
      }
      return { recordset: [], rowsAffected: [cust ? 1 : 0] };
    }
    // select single by ID
    if (normalized.includes('where id = @id')) {
      const match = DB.customers.filter(c => c.id === params.id);
      return { recordset: match, rowsAffected: [match.length] };
    }
    // select single by email
    if (normalized.includes('where email = @email')) {
      const match = DB.customers.filter(c => c.email === params.email);
      return { recordset: match.map(c => ({ id: c.id })), rowsAffected: [match.length] };
    }
    // select all customers
    return {
      recordset: DB.customers.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
      rowsAffected: [DB.customers.length]
    };
  }

  // insert customer
  if (normalized.startsWith('insert into customers')) {
    const newCustomer = {
      id: params.id,
      full_name: params.fullName,
      email: params.email,
      phone: params.phone || '',
      address: params.address || '',
      date_of_birth: params.dob || null,
      nationality: params.nationality || '',
      status: 'Review KYC',
      risk_level: 'Low',
      kyc_verified: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    DB.customers.push(newCustomer);
    return { recordset: [], rowsAffected: [1] };
  }

  // ── ACCOUNTS TABLE ────────────────────────────────────────────────────────
  if (normalized.includes('from accounts')) {
    // join customer details
    if (normalized.includes('join customers')) {
      const result = DB.accounts.map(acc => {
        const cust = DB.customers.find(c => c.id === acc.customer_id) || {};
        return {
          ...acc,
          customer_name: cust.full_name || 'Unknown',
          customer_email: cust.email || 'unknown@bank.com'
        };
      }).sort((a, b) => new Date(b.opened_at) - new Date(a.opened_at));
      return { recordset: result, rowsAffected: [result.length] };
    }
    // select balances by customer_id
    if (normalized.includes('where customer_id = @id')) {
      const result = DB.accounts.filter(a => a.customer_id === params.id).map(a => ({ balance: a.balance }));
      return { recordset: result, rowsAffected: [result.length] };
    }
    // freeze / unfreeze accounts
    if (normalized.includes('set is_frozen = 1')) {
      const matches = DB.accounts.filter(a => a.customer_id === params.id);
      matches.forEach(a => a.is_frozen = true);
      return { recordset: [], rowsAffected: [matches.length] };
    }
    if (normalized.includes('set is_frozen = 0')) {
      const matches = DB.accounts.filter(a => a.customer_id === params.id);
      matches.forEach(a => a.is_frozen = false);
      return { recordset: [], rowsAffected: [matches.length] };
    }
    // select single by ID
    if (normalized.includes('where id = @accountid')) {
      const result = DB.accounts.filter(a => a.id === params.accountId);
      return { recordset: result, rowsAffected: [result.length] };
    }
  }

  // insert account
  if (normalized.startsWith('insert into accounts')) {
    const newAccount = {
      id: params.id || params.accId,
      customer_id: params.customerId || params.id,
      account_type: params.account_type || 'Savings',
      balance: parseFloat(params.balance || 0),
      currency: params.currency || 'USD',
      is_frozen: false,
      opened_at: new Date().toISOString()
    };
    DB.accounts.push(newAccount);
    return { recordset: [], rowsAffected: [1] };
  }

  // update account balance
  if (normalized.startsWith('update accounts set balance = @balance')) {
    const acc = DB.accounts.find(a => a.id === params.id);
    if (acc) {
      acc.balance = parseFloat(params.balance);
    }
    return { recordset: [], rowsAffected: [acc ? 1 : 0] };
  }

  // ── TRANSACTIONS TABLE ────────────────────────────────────────────────────
  if (normalized.includes('from transactions')) {
    // 1. Stats query: Daily volume for last 30 days
    if (normalized.includes('cast(created_at as date) as date') && normalized.includes('dateadd(day, -30, getutcdate())')) {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const groups = {};
      DB.transactions.forEach(tx => {
        const txDate = new Date(tx.created_at);
        if (txDate >= cutoff) {
          const dateStr = tx.created_at.substring(0, 10);
          if (!groups[dateStr]) {
            groups[dateStr] = { date: dateStr, total_volume: 0, tx_count: 0, credits: 0, debits: 0 };
          }
          groups[dateStr].tx_count++;
          groups[dateStr].total_volume += tx.amount;
          if (['Credit', 'Deposit'].includes(tx.type)) {
            groups[dateStr].credits += tx.amount;
          } else if (['Debit', 'Withdrawal', 'Transfer'].includes(tx.type)) {
            groups[dateStr].debits += tx.amount;
          }
        }
      });
      const result = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
      return { recordset: result, rowsAffected: [result.length] };
    }

    // 2. Stats query: By type breakdown last 7 days
    if (normalized.includes('group by type') && normalized.includes('dateadd(day, -7, getutcdate())')) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const groups = {};
      DB.transactions.forEach(tx => {
        const txDate = new Date(tx.created_at);
        if (txDate >= cutoff) {
          if (!groups[tx.type]) {
            groups[tx.type] = { type: tx.type, count: 0, volume: 0 };
          }
          groups[tx.type].count++;
          groups[tx.type].volume += tx.amount;
        }
      });
      return { recordset: Object.values(groups), rowsAffected: [Object.keys(groups).length] };
    }

    // 3. Stats query: Today's summary
    if (normalized.includes('max(amount) as largest_tx') && normalized.includes('cast(created_at as date) = cast(getutcdate() as date)')) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const matches = DB.transactions.filter(tx => tx.created_at.substring(0, 10) === todayStr);
      const count = matches.length;
      const volume = matches.reduce((sum, tx) => sum + tx.amount, 0);
      const accountsActive = new Set(matches.map(tx => tx.account_id)).size;
      const largestTx = count > 0 ? Math.max(...matches.map(tx => tx.amount)) : 0;
      return {
        recordset: [{
          tx_count: count,
          volume,
          accounts_active: accountsActive,
          largest_tx: largestTx
        }],
        rowsAffected: [1]
      };
    }

    // 4. Stats query: High-value transactions today
    if (normalized.includes('high_value_count') && normalized.includes('cast(created_at as date) = cast(getutcdate() as date)')) {
      const todayStr = new Date().toISOString().substring(0, 10);
      const matches = DB.transactions.filter(tx => tx.amount >= 10000 && tx.created_at.substring(0, 10) === todayStr);
      const count = matches.length;
      const volume = matches.reduce((sum, tx) => sum + tx.amount, 0);
      return {
        recordset: [{
          high_value_count: count,
          high_value_volume: volume
        }],
        rowsAffected: [1]
      };
    }

    // count transactions
    if (normalized.includes('count(*) as total from transactions')) {
      return { recordset: [{ total: DB.transactions.length }], rowsAffected: [1] };
    }
    // group by convert date
    if (normalized.includes('group by convert(date, created_at)')) {
      const groups = {};
      DB.transactions.forEach(tx => {
        const dateStr = tx.created_at.substring(0, 10);
        if (!groups[dateStr]) {
          groups[dateStr] = { date: dateStr, count: 0, volume: 0 };
        }
        groups[dateStr].count++;
        groups[dateStr].volume += tx.amount;
      });
      const list = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));
      return { recordset: list, rowsAffected: [list.length] };
    }
    // group by type
    if (normalized.includes('group by type')) {
      const groups = {};
      DB.transactions.forEach(tx => {
        if (!groups[tx.type]) {
          groups[tx.type] = { type: tx.type, count: 0, volume: 0 };
        }
        groups[tx.type].count++;
        groups[tx.type].volume += tx.amount;
      });
      return { recordset: Object.values(groups), rowsAffected: [Object.keys(groups).length] };
    }
    // count by today
    if (normalized.includes('where created_at >= @today')) {
      const count = DB.transactions.filter(tx => new Date(tx.created_at) >= new Date(params.today)).length;
      return { recordset: [{ count }], rowsAffected: [1] };
    }
    // structuring rule check (last 24 hours outflow sum)
    if (normalized.includes('dateadd(hour, -24, getutcdate())')) {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const match = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        ['Debit', 'Withdrawal', 'Transfer'].includes(tx.type) && 
        new Date(tx.created_at) >= cutoff
      );
      const total = match.reduce((sum, tx) => sum + tx.amount, 0);
      return { recordset: [{ total }], rowsAffected: [1] };
    }
    // velocity rule check (last 1 hour count)
    if (normalized.includes('dateadd(hour, -1, getutcdate())')) {
      const cutoff = new Date(Date.now() - 60 * 60 * 1000);
      const match = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        new Date(tx.created_at) >= cutoff
      );
      return { recordset: [{ cnt: match.length }], rowsAffected: [1] };
    }
    // type stats with since date
    if (normalized.includes('group by type') && normalized.includes('created_at >= @since')) {
      const cutoff = new Date(params.since || 0);
      const matches = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        ['Debit', 'Transfer', 'Withdrawal'].includes(tx.type) && 
        new Date(tx.created_at) >= cutoff
      );
      const groups = {};
      matches.forEach(tx => {
        if (!groups[tx.type]) groups[tx.type] = { type: tx.type, count: 0, total: 0 };
        groups[tx.type].count++;
        groups[tx.type].total += tx.amount;
      });
      return { recordset: Object.values(groups), rowsAffected: [Object.keys(groups).length] };
    }
    // avg and stdev stats
    if (normalized.includes('avg(amount) as avg_amount, stdev(amount) as stddev_amount')) {
      const cutoff = new Date(params.since || 0);
      const matches = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        tx.type === params.type && 
        new Date(tx.created_at) < cutoff
      );
      const count = matches.length;
      if (count === 0) {
        return { recordset: [{ avg_amount: null, stddev_amount: null }], rowsAffected: [1] };
      }
      const avg = matches.reduce((sum, tx) => sum + tx.amount, 0) / count;
      let variance = 0;
      if (count > 1) {
        variance = matches.reduce((sum, tx) => sum + Math.pow(tx.amount - avg, 2), 0) / (count - 1);
      }
      const stddev = Math.sqrt(variance);
      return { recordset: [{ avg_amount: avg, stddev_amount: stddev }], rowsAffected: [1] };
    }
    // total count with since date
    if (normalized.includes('created_at >= @since')) {
      const cutoff = new Date(params.since || 0);
      const count = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        new Date(tx.created_at) >= cutoff
      ).length;
      return { recordset: [{ count }], rowsAffected: [1] };
    }
    // geographic anomaly offset 1 rule
    if (normalized.includes('offset 1 rows')) {
      const matches = DB.transactions.filter(tx => 
        tx.account_id === params.accountId && 
        tx.country !== null && 
        tx.country !== undefined
      ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const country = matches[1]?.country || null;
      return { recordset: [{ country }], rowsAffected: [1] };
    }

    // general query transactions join accounts, customers, aml_flags
    let list = DB.transactions.map(tx => {
      const acc = DB.accounts.find(a => a.id === tx.account_id) || {};
      const cust = DB.customers.find(c => c.id === acc.customer_id) || {};
      const flag = DB.aml_flags.find(f => f.transaction_id === tx.id && !f.resolved) || {};
      return {
        ...tx,
        customer_id: acc.customer_id,
        account_type: acc.account_type,
        customer_name: cust.full_name || 'Unknown',
        customer_risk: cust.risk_level || 'Low',
        flag_type: flag.rule || null,
        aml_risk: flag.severity || null,
        flag_id: flag.id || null
      };
    });

    if (params.accountId) {
      list = list.filter(tx => tx.account_id === params.accountId);
    }
    if (params.customerId) {
      list = list.filter(tx => tx.customer_id === params.customerId);
    }
    if (params.id) {
      list = list.filter(tx => tx.id === params.id);
    }
    if (params.type) {
      list = list.filter(tx => tx.type === params.type);
    }
    if (params.minAmount !== undefined) {
      list = list.filter(tx => tx.amount >= params.minAmount);
    }
    if (params.maxAmount !== undefined) {
      list = list.filter(tx => tx.amount <= params.maxAmount);
    }
    if (normalized.includes('af.id is not null')) {
      list = list.filter(tx => tx.flag_id !== null);
    }
    if (params.search) {
      const term = params.search.replace(/%/g, '').toLowerCase();
      list = list.filter(tx => 
        tx.id.toLowerCase().includes(term) ||
        tx.account_id.toLowerCase().includes(term) ||
        (tx.counterparty || '').toLowerCase().includes(term) ||
        (tx.reference || '').toLowerCase().includes(term) ||
        (tx.customer_name || '').toLowerCase().includes(term)
      );
    }

    list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (params.offset !== undefined && params.limit !== undefined) {
      list = list.slice(params.offset, params.offset + params.limit);
    }

    return { recordset: list, rowsAffected: [list.length] };
  }

  // insert transaction
  if (normalized.startsWith('insert into transactions')) {
    const newTx = {
      id: params.id || `TX-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      account_id: params.accountId,
      type: params.type,
      amount: parseFloat(params.amount),
      balance_after: parseFloat(params.balanceAfter),
      description: params.description || '',
      counterparty: params.counterparty || '',
      reference: params.reference || '',
      country: params.country || 'US',
      ip_address: params.ipAddress || '127.0.0.1',
      created_by_emp: params.createdByEmp || null,
      aml_flagged: params.amlFlagged ? true : false,
      created_at: new Date().toISOString()
    };
    DB.transactions.push(newTx);
    // Update account balance
    const acc = DB.accounts.find(a => a.id === params.accountId);
    if (acc) {
      acc.balance = newTx.balance_after;
    }
    return { recordset: [], rowsAffected: [1] };
  }

  // ── KYC SUBMISSIONS TABLE ─────────────────────────────────────────────────
  if (normalized.includes('from kyc_submissions')) {
    let list = DB.kyc_submissions.map(kyc => {
      const cust = DB.customers.find(c => c.id === kyc.customer_id) || {};
      return {
        ...kyc,
        customer_name: cust.full_name || 'Unknown',
        customer_email: cust.email || 'unknown@bank.com'
      };
    });
    if (normalized.includes('k.id = @id')) {
      list = list.filter(k => k.id === params.id);
    }
    list.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    return { recordset: list, rowsAffected: [list.length] };
  }

  // insert kyc submission
  if (normalized.startsWith('insert into kyc_submissions')) {
    const newKyc = {
      id: params.id || `KYC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer_id: params.customerId,
      documents_json: params.documentsJson,
      status: 'Pending',
      submitted_by: params.submittedBy,
      reviewed_by: null,
      review_note: null,
      submitted_at: new Date().toISOString(),
      reviewed_at: null
    };
    DB.kyc_submissions.push(newKyc);
    // Update customer status to 'Review KYC'
    const cust = DB.customers.find(c => c.id === params.customerId);
    if (cust) {
      cust.status = 'Review KYC';
      cust.updated_at = new Date().toISOString();
    }
    return { recordset: [], rowsAffected: [1] };
  }

  // update kyc submission status
  if (normalized.startsWith('update kyc_submissions set status = @status')) {
    const kyc = DB.kyc_submissions.find(k => k.id === params.id);
    if (kyc) {
      kyc.status = params.status;
      kyc.reviewed_by = params.reviewedBy;
      kyc.review_note = params.reviewNote;
      kyc.reviewed_at = new Date().toISOString();
    }
    return { recordset: [], rowsAffected: [kyc ? 1 : 0] };
  }

  // ── AML FLAGS TABLE ───────────────────────────────────────────────────────
  if (normalized.includes('from aml_flags')) {
    // Stats query: AML flagged this week
    if (normalized.includes('count(*) as flagged') && normalized.includes('dateadd(day, -7, getutcdate())')) {
      const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const flagged = DB.aml_flags.filter(f => !f.resolved && new Date(f.created_at) >= cutoff).length;
      return { recordset: [{ flagged }], rowsAffected: [1] };
    }
    // count unresolved flags
    if (normalized.includes('count(*) as count from aml_flags where resolved = 0')) {
      const count = DB.aml_flags.filter(f => !f.resolved).length;
      return { recordset: [{ count }], rowsAffected: [1] };
    }
    // select list of unresolved flags for customer
    if (normalized.includes('customer_id = @id and resolved = 0')) {
      const list = DB.aml_flags.filter(f => f.customer_id === params.id && !f.resolved).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return { recordset: list, rowsAffected: [list.length] };
    }
    // general list join customers & transactions
    const list = DB.aml_flags.map(flag => {
      const cust = DB.customers.find(c => c.id === flag.customer_id) || {};
      const tx = DB.transactions.find(t => t.id === flag.transaction_id) || {};
      return {
        ...flag,
        customer_name: cust.full_name || 'Unknown',
        tx_amount: tx.amount || null,
        tx_type: tx.type || null
      };
    }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    return { recordset: list, rowsAffected: [list.length] };
  }

  // insert aml flag
  if (normalized.startsWith('insert into aml_flags')) {
    const newFlag = {
      id: params.id || `AML-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      customer_id: params.cid || params.customerId,
      transaction_id: params.txId || params.transactionId,
      rule: params.rule,
      severity: params.severity,
      description: params.desc || params.description,
      resolved: false,
      resolved_by: null,
      created_at: new Date().toISOString(),
      resolved_at: null
    };
    DB.aml_flags.push(newFlag);
    return { recordset: [], rowsAffected: [1] };
  }

  // update aml flag status
  if (normalized.startsWith('update aml_flags set resolved = 1')) {
    const flag = DB.aml_flags.find(f => f.id === params.id);
    if (flag) {
      flag.resolved = true;
      flag.resolved_by = params.by || params.resolvedBy;
      flag.resolved_at = new Date().toISOString();
    }
    return { recordset: [], rowsAffected: [flag ? 1 : 0] };
  }

  // ── AUDIT LOG TABLE ───────────────────────────────────────────────────────
  if (normalized.includes('from audit_log')) {
    let list = DB.audit_log.slice();
    if (params.action) {
      list = list.filter(l => l.action === params.action);
    }
    list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    // count query
    if (normalized.includes('count(*) as total')) {
      return { recordset: [{ total: list.length }], rowsAffected: [1] };
    }
    
    const limit = parseInt(params.limit || 50);
    const offset = parseInt(params.offset || 0);
    const page = list.slice(offset, offset + limit);
    return { recordset: page, rowsAffected: [page.length] };
  }

  // insert audit log
  if (normalized.startsWith('insert into audit_log')) {
    const newLog = {
      id: `AUD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      performed_by: params.performedBy,
      ip_address: params.ipAddress || '',
      details_json: params.detailsJson || '{}',
      timestamp: new Date().toISOString()
    };
    DB.audit_log.push(newLog);
    return { recordset: [], rowsAffected: [1] };
  }

  // Fallback / Unknown query
  console.warn(`⚠️ [Mock DB] Query not explicitly matched: "${queryStr}"`);
  return { recordset: [], rowsAffected: [0] };
};

// ── CONNECTION POOL MOCK ────────────────────────────────────────────────────
const mockPool = {
  request: () => {
    const inputParams = {};
    const reqObj = {
      input: (name, value) => {
        inputParams[name] = value;
        return reqObj; // chainable
      },
      query: async (queryStr) => {
        return handleMockQuery(queryStr, inputParams);
      }
    };
    return reqObj;
  },
  close: async () => {
    console.log('🔌 [Database] In-memory dummy database connection closed.');
  }
};

let pool = null;

export const getPool = async () => {
  if (useDummyDb) {
    if (!pool) {
      pool = mockPool;
      console.log('✅ Connected to in-memory dummy database');
    }
    return pool;
  }

  if (!pool) {
    pool = await sql.connect(config);
    console.log('✅ Connected to SQL Server');
  }
  return pool;
};

// Helper: run a parameterized query with named params
export const query = async (queryStr, params = {}) => {
  if (useDummyDb) {
    return handleMockQuery(queryStr, params);
  }

  const db = await getPool();
  const request = db.request();
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
  return request.query(queryStr);
};

export default { getPool, query };

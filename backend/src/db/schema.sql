-- ============================================================
-- Azure Bank Database Schema
-- Run on: database-1 VM (10.0.6.4) via SQL Edge (Docker)
-- ============================================================

-- Create the database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'BankingDB')
  CREATE DATABASE BankingDB;
GO

USE BankingDB;
GO

-- ── CUSTOMERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id            NVARCHAR(20)   NOT NULL PRIMARY KEY,  -- CUS-XXXX
  full_name     NVARCHAR(100)  NOT NULL,
  email         NVARCHAR(200)  NOT NULL UNIQUE,
  phone         NVARCHAR(30),
  address       NVARCHAR(500),
  date_of_birth DATE,
  nationality   NVARCHAR(100),
  -- Account Status State Machine
  status        NVARCHAR(20)   NOT NULL DEFAULT 'Review KYC',
  -- CHECK: only valid status values allowed
  CONSTRAINT chk_status CHECK (status IN ('Review KYC','Active','Flagged','Frozen')),
  risk_level    NVARCHAR(20)   NOT NULL DEFAULT 'Low',
  CONSTRAINT chk_risk CHECK (risk_level IN ('Low','Medium','High','Critical')),
  kyc_verified  BIT            NOT NULL DEFAULT 0,
  created_at    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
  updated_at    DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- ── ACCOUNTS (one customer → multiple accounts) ────────────
CREATE TABLE IF NOT EXISTS accounts (
  id            NVARCHAR(30)   NOT NULL PRIMARY KEY,  -- ACC-XXXX
  customer_id   NVARCHAR(20)   NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  account_type  NVARCHAR(20)   NOT NULL DEFAULT 'Savings',
  CONSTRAINT chk_account_type CHECK (account_type IN ('Savings','Checking','Loan','Fixed Deposit')),
  balance       DECIMAL(18,2)  NOT NULL DEFAULT 0.00,
  currency      NVARCHAR(3)    NOT NULL DEFAULT 'USD',
  is_frozen     BIT            NOT NULL DEFAULT 0,
  opened_at     DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- ── TRANSACTIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id               NVARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
  account_id       NVARCHAR(30)  NOT NULL REFERENCES accounts(id),
  type             NVARCHAR(20)  NOT NULL,
  CONSTRAINT chk_tx_type CHECK (type IN ('Credit','Debit','Transfer','Withdrawal','Deposit')),
  amount           DECIMAL(18,2) NOT NULL,
  balance_after    DECIMAL(18,2) NOT NULL,
  description      NVARCHAR(500),
  counterparty     NVARCHAR(200),  -- Recipient/sender name or account
  reference        NVARCHAR(100),  -- Payment reference
  country          NVARCHAR(100),
  ip_address       NVARCHAR(50),
  created_by_emp   NVARCHAR(200),  -- Employee UPN (null if customer-initiated)
  aml_flagged      BIT            NOT NULL DEFAULT 0,
  created_at       DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- ── KYC SUBMISSIONS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kyc_submissions (
  id             NVARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
  customer_id    NVARCHAR(20)  NOT NULL REFERENCES customers(id),
  documents_json NVARCHAR(MAX),  -- JSON: { passport: blobUrl, utilityBill: blobUrl }
  status         NVARCHAR(20)  NOT NULL DEFAULT 'Pending',
  CONSTRAINT chk_kyc_status CHECK (status IN ('Pending','Approved','Rejected')),
  submitted_by   NVARCHAR(200) NOT NULL,  -- Employee UPN
  reviewed_by    NVARCHAR(200),
  review_note    NVARCHAR(500),
  submitted_at   DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  reviewed_at    DATETIME2
);

-- ── AML FLAGS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aml_flags (
  id             NVARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
  customer_id    NVARCHAR(20)  NOT NULL REFERENCES customers(id),
  transaction_id NVARCHAR(36)  REFERENCES transactions(id),
  rule           NVARCHAR(50)  NOT NULL,  -- LARGE_CASH / STRUCTURING / HIGH_VELOCITY / GEO_ANOMALY
  severity       NVARCHAR(20)  NOT NULL,  -- Low / Medium / High / Critical
  description    NVARCHAR(500),
  resolved       BIT           NOT NULL DEFAULT 0,
  resolved_by    NVARCHAR(200),
  created_at     DATETIME2     NOT NULL DEFAULT GETUTCDATE(),
  resolved_at    DATETIME2
);

-- ── AUDIT LOG (every staff action recorded) ──────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            NVARCHAR(36)  NOT NULL PRIMARY KEY DEFAULT NEWID(),
  action        NVARCHAR(100) NOT NULL,  -- CREATE_CUSTOMER / FREEZE_ACCOUNT / KYC_APPROVED etc.
  entity_type   NVARCHAR(50)  NOT NULL,  -- customer / account / transaction
  entity_id     NVARCHAR(50)  NOT NULL,
  performed_by  NVARCHAR(200) NOT NULL,  -- Employee UPN from Azure AD JWT
  ip_address    NVARCHAR(50),
  details_json  NVARCHAR(MAX),           -- JSON of changed fields
  timestamp     DATETIME2     NOT NULL DEFAULT GETUTCDATE()
);

-- ── INDEXES for performance ───────────────────────────────────
CREATE INDEX idx_accounts_customer ON accounts(customer_id);
CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(created_at DESC);
CREATE INDEX idx_audit_entity ON audit_log(entity_id);
CREATE INDEX idx_aml_customer ON aml_flags(customer_id);
CREATE INDEX idx_customers_email ON customers(email);

PRINT '✅ BankingDB schema created successfully.';
GO

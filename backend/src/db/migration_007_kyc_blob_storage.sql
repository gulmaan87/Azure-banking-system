-- =============================================================================
-- migration_007_kyc_blob_storage.sql
-- Phase 7 — Upgrades kyc_submissions table to store Blob Storage references
--
-- Run this on database-1 VM:
--   sqlcmd -S 10.0.6.4 -d BankingDB -U bankapp -P <password> -i migration_007_kyc_blob_storage.sql
-- =============================================================================

USE BankingDB;
GO

-- ── Add columns if they don't exist (idempotent) ─────────────────────────────

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('kyc_submissions') AND name = 'review_note')
BEGIN
    ALTER TABLE kyc_submissions ADD review_note NVARCHAR(1000) NULL;
    PRINT 'Added: review_note';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('kyc_submissions') AND name = 'reviewed_by')
BEGIN
    ALTER TABLE kyc_submissions ADD reviewed_by NVARCHAR(255) NULL;
    PRINT 'Added: reviewed_by';
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('kyc_submissions') AND name = 'reviewed_at')
BEGIN
    ALTER TABLE kyc_submissions ADD reviewed_at DATETIME2 NULL;
    PRINT 'Added: reviewed_at';
END
GO

-- Ensure documents_json column is large enough for blob metadata
IF EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('kyc_submissions')
      AND name = 'documents_json'
      AND max_length < 8000
)
BEGIN
    ALTER TABLE kyc_submissions ALTER COLUMN documents_json NVARCHAR(MAX) NULL;
    PRINT 'Upgraded: documents_json to NVARCHAR(MAX)';
END
GO

-- ── Audit log table (create if missing) ──────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'audit_log')
BEGIN
    CREATE TABLE audit_log (
        id           INT IDENTITY(1,1) PRIMARY KEY,
        action       NVARCHAR(100)   NOT NULL,
        entity_type  NVARCHAR(100)   NOT NULL,
        entity_id    NVARCHAR(100)   NULL,
        performed_by NVARCHAR(255)   NULL,
        ip_address   NVARCHAR(50)    NULL,
        details_json NVARCHAR(MAX)   NULL,
        created_at   DATETIME2       NOT NULL DEFAULT GETUTCDATE()
    );
    CREATE INDEX IX_audit_log_action      ON audit_log(action);
    CREATE INDEX IX_audit_log_entity      ON audit_log(entity_id);
    CREATE INDEX IX_audit_log_performed   ON audit_log(performed_by);
    CREATE INDEX IX_audit_log_created     ON audit_log(created_at DESC);
    PRINT 'Created: audit_log table with indexes';
END
GO

-- ── KYC submissions (create if missing) ──────────────────────────────────────
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'kyc_submissions')
BEGIN
    CREATE TABLE kyc_submissions (
        id            INT IDENTITY(1,1) PRIMARY KEY,
        customer_id   NVARCHAR(20)    NOT NULL,
        documents_json NVARCHAR(MAX)  NULL,
        status        NVARCHAR(20)    NOT NULL DEFAULT 'Pending',
        submitted_by  NVARCHAR(255)   NULL,
        submitted_at  DATETIME2       NOT NULL DEFAULT GETUTCDATE(),
        reviewed_by   NVARCHAR(255)   NULL,
        reviewed_at   DATETIME2       NULL,
        review_note   NVARCHAR(1000)  NULL,

        CONSTRAINT FK_kyc_customer FOREIGN KEY (customer_id)
            REFERENCES customers(id) ON DELETE CASCADE,
        CONSTRAINT CHK_kyc_status CHECK (status IN ('Pending','Approved','Rejected'))
    );
    CREATE INDEX IX_kyc_customer ON kyc_submissions(customer_id);
    CREATE INDEX IX_kyc_status   ON kyc_submissions(status);
    PRINT 'Created: kyc_submissions table';
END
GO

PRINT '✅ Migration 007 complete';
GO

USE BankingDB;
GO


IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('customers') AND name = 'customer_principal_id')
BEGIN
    ALTER TABLE customers ADD customer_principal_id NVARCHAR(100) NULL UNIQUE;
    PRINT 'Added: customer_principal_id column to customers table';
END
GO

PRINT '✅ Migration 008 complete';
GO












import { query } from '../db/connection.js';
import * as auditLogger from '../middleware/auditLogger.js';
import * as BlobStorage from './BlobStorageService.js';
import { broadcast } from './signalr.js';


export const DOC_TYPES = ['passport', 'utility_bill', 'selfie'];






export const submitDocuments = async (customerId, files, submittedBy, req = null) => {
  if (!files || files.length === 0) {
    const err = new Error('At least one document is required');
    err.status = 400;
    throw err;
  }

  
  const uploadResults = {};
  for (const file of files) {
    const docType = file.fieldname; 
    if (!DOC_TYPES.includes(docType)) continue;

    const result = await BlobStorage.uploadKycDocument(
      customerId,
      docType,
      file.buffer,
      file.mimetype,
      file.originalname
    );

    uploadResults[docType] = {
      blobName:     result.blobName,
      thumbnailUrl: result.thumbnailUrl,
      mimeType:     file.mimetype,
      sizeBytes:    file.size,
      uploadedAt:   new Date().toISOString(),
    };
  }

  
  await query(
    `INSERT INTO kyc_submissions (customer_id, documents_json, status, submitted_by)
     VALUES (@id, @docs, 'Pending', @by)`,
    { id: customerId, docs: JSON.stringify(uploadResults), by: submittedBy }
  );

  await query(
    `UPDATE customers SET status = 'Review KYC', updated_at = GETUTCDATE() WHERE id = @id`,
    { id: customerId }
  );

  await auditLogger.log('KYC_SUBMIT', 'customer', customerId, submittedBy,
    { docTypes: Object.keys(uploadResults), count: files.length }, req);

  await broadcast('KycStatusChanged', {
    customer_id: customerId, status: 'Pending',
    docs: Object.keys(uploadResults), timestamp: new Date().toISOString(),
  });

  return { customerId, docsUploaded: Object.keys(uploadResults), status: 'Pending' };
};




export const getPendingSubmissions = async () => {
  const result = await query(
    `SELECT ks.*, c.full_name, c.email, c.risk_level
     FROM kyc_submissions ks
     JOIN customers c ON c.id = ks.customer_id
     WHERE ks.status = 'Pending'
     ORDER BY ks.submitted_at ASC`
  );

  
  const submissions = await Promise.all(
    result.recordset.map(async (sub) => {
      const docs = JSON.parse(sub.documents_json || '{}');
      const docsWithUrls = {};

      for (const [docType, meta] of Object.entries(docs)) {
        docsWithUrls[docType] = {
          ...meta,
          viewUrl: meta.blobName
            ? await BlobStorage.generateSasUrl('kyc-documents', meta.blobName, 30)
            : meta.blobName, 
        };
      }

      return { ...sub, documents: docsWithUrls };
    })
  );

  return submissions;
};




export const getSubmission = async (submissionId) => {
  const result = await query(
    `SELECT ks.*, c.full_name, c.email, c.nationality, c.risk_level, c.date_of_birth
     FROM kyc_submissions ks
     JOIN customers c ON c.id = ks.customer_id
     WHERE ks.id = @id`,
    { id: submissionId }
  );
  if (!result.recordset.length) {
    const err = new Error(`Submission ${submissionId} not found`); err.status = 404; throw err;
  }

  const sub  = result.recordset[0];
  const docs = JSON.parse(sub.documents_json || '{}');
  const docsWithUrls = {};

  for (const [docType, meta] of Object.entries(docs)) {
    docsWithUrls[docType] = {
      ...meta,
      viewUrl: meta.blobName
        ? await BlobStorage.generateSasUrl('kyc-documents', meta.blobName, 30)
        : null,
    };
  }

  return { ...sub, documents: docsWithUrls };
};





export const approve = async (submissionId, customerId, approvedBy, role, req = null) => {
  if (!['ADMIN', 'AUDITOR'].includes(role)) {
    const err = new Error('Only Admins or Auditors can approve KYC'); err.status = 403; throw err;
  }

  const sub = await getSubmission(submissionId);
  const docs = sub.documents || {};

  
  for (const [docType, meta] of Object.entries(docs)) {
    if (meta.blobName?.startsWith('pending/')) {
      const newName = meta.blobName.replace('pending/', 'approved/');
      await BlobStorage.moveBlob('kyc-documents', meta.blobName, 'kyc-documents', newName);

      
      docs[docType].blobName = newName;
    }
  }

  await query(
    `UPDATE kyc_submissions
     SET status = 'Approved', reviewed_by = @by, reviewed_at = GETUTCDATE(),
         documents_json = @docs
     WHERE id = @id`,
    { id: submissionId, by: approvedBy, docs: JSON.stringify(docs) }
  );

  await query(
    `UPDATE customers SET kyc_verified = 1, status = 'Active', updated_at = GETUTCDATE()
     WHERE id = @cid`,
    { cid: customerId }
  );

  await auditLogger.log('KYC_APPROVED', 'customer', customerId, approvedBy, {}, req);

  await broadcast('KycStatusChanged', {
    customer_id: customerId, status: 'Approved',
    reviewed_by: approvedBy, timestamp: new Date().toISOString(),
  });
};





export const reject = async (submissionId, customerId, rejectedBy, role, note, req = null) => {
  if (!['ADMIN', 'AUDITOR'].includes(role)) {
    const err = new Error('Only Admins or Auditors can reject KYC'); err.status = 403; throw err;
  }

  const sub  = await getSubmission(submissionId);
  const docs = sub.documents || {};

  for (const [docType, meta] of Object.entries(docs)) {
    if (meta.blobName?.startsWith('pending/')) {
      const newName = meta.blobName.replace('pending/', 'rejected/');
      await BlobStorage.moveBlob('kyc-documents', meta.blobName, 'kyc-documents', newName);
      docs[docType].blobName = newName;
    }
  }

  await query(
    `UPDATE kyc_submissions
     SET status = 'Rejected', reviewed_by = @by, reviewed_at = GETUTCDATE(),
         review_note = @note, documents_json = @docs
     WHERE id = @id`,
    { id: submissionId, by: rejectedBy, note, docs: JSON.stringify(docs) }
  );

  await auditLogger.log('KYC_REJECTED', 'customer', customerId, rejectedBy, { note }, req);

  await broadcast('KycStatusChanged', {
    customer_id: customerId, status: 'Rejected',
    reviewed_by: rejectedBy, reason: note, timestamp: new Date().toISOString(),
  });
};

export const getActiveFlags    = (customerId) => import('./AmlService.js').then(m => m.getActiveFlags(customerId));
export const resolveFlag       = (flagId, by, note) => import('./AmlService.js').then(m => m.resolveFlag(flagId, by, note));

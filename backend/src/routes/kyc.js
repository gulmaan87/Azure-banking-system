











import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { requireRole }   from '../middleware/rbac.js';
import { kycUpload }     from '../middleware/upload.js';
import * as KycService   from '../services/KycService.js';
import * as AmlService   from '../services/AmlService.js';

const router = Router();
router.use(authMiddleware);








router.post(
  '/:customerId/upload',
  requireRole(['ADMIN']),
  kycUpload.fields([
    { name: 'passport',     maxCount: 1 },
    { name: 'utility_bill', maxCount: 1 },
    { name: 'selfie',       maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const performedBy = req.user.upn || req.user.preferred_username;
      const files = Object.values(req.files || {}).flat();

      if (!files.length) {
        return res.status(400).json({ error: 'No files uploaded. Send files as multipart/form-data.' });
      }

      const result = await KycService.submitDocuments(
        req.params.customerId,
        files,
        performedBy,
        req
      );

      res.status(201).json({ message: 'KYC documents uploaded for review', data: result });
    } catch (err) { next(err); }
  }
);


router.post('/:customerId/submit', requireRole(['ADMIN']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    
    const mockFiles = Object.entries(req.body.documents || {}).map(([fieldname, url]) => ({
      fieldname,
      buffer: Buffer.from('mock'),
      mimetype: 'image/jpeg',
      originalname: `${fieldname}.jpg`,
      size: 0,
    }));
    const result = await KycService.submitDocuments(req.params.customerId, mockFiles, performedBy, req);
    res.json({ message: 'KYC documents submitted for review', data: result });
  } catch (err) { next(err); }
});




router.get('/pending', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const data = await KycService.getPendingSubmissions();
    res.json({ data, count: data.length });
  } catch (err) { next(err); }
});


router.get('/:submissionId', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const data = await KycService.getSubmission(req.params.submissionId);
    res.json({ data });
  } catch (err) { next(err); }
});


router.patch('/:submissionId/approve', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await KycService.approve(
      req.params.submissionId,
      req.body.customer_id,
      performedBy,
      req.role,
      req
    );
    res.json({ message: 'KYC approved — customer account activated.' });
  } catch (err) { next(err); }
});


router.patch('/:submissionId/reject', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await KycService.reject(
      req.params.submissionId,
      req.body.customer_id,
      performedBy,
      req.role,
      req.body.note,
      req
    );
    res.json({ message: 'KYC rejected.' });
  } catch (err) { next(err); }
});




router.get('/aml/:customerId', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const data = await AmlService.getActiveFlags(req.params.customerId);
    res.json({ data });
  } catch (err) { next(err); }
});


router.patch('/aml/:flagId/resolve', requireRole(['ADMIN', 'AUDITOR']), async (req, res, next) => {
  try {
    const performedBy = req.user.upn || req.user.preferred_username;
    await AmlService.resolveFlag(req.params.flagId, performedBy, req.body.note);
    res.json({ message: 'AML flag resolved' });
  } catch (err) { next(err); }
});

export default router;

/**
 * BlobStorageService.js — Azure Blob Storage for KYC documents
 *
 * AUTH STRATEGY:
 *   Production (VM): DefaultAzureCredential → Managed Identity
 *     → "Storage Blob Data Contributor" role assigned by Terraform
 *     → No connection string, no API key
 *
 *   Dev (local): Falls back to STORAGE_CONNECTION_STRING from .env
 *     → Use: az login, or set AZURE_STORAGE_CONNECTION_STRING
 *
 * CONTAINERS:
 *   kyc-documents/  — originals (private, never publicly accessible)
 *     pending/      — awaiting review
 *     approved/     — after KYC approval (archived after 365d)
 *     rejected/     — after KYC rejection (deleted after 90d)
 *
 *   kyc-thumbnails/ — low-res preview images for admin portal
 */

import {
  BlobServiceClient,
  StorageSharedKeyCredential,
  generateBlobSASQueryParameters,
  BlobSASPermissions,
} from '@azure/storage-blob';
import { DefaultAzureCredential } from '@azure/identity';
import sharp from 'sharp';
import path from 'path';

const ACCOUNT_NAME    = process.env.STORAGE_ACCOUNT_NAME;
const CONTAINER_KYC   = process.env.STORAGE_CONTAINER_KYC  || 'kyc-documents';
const CONTAINER_THUMB = 'kyc-thumbnails';
const CONN_STR        = process.env.STORAGE_CONNECTION_STRING;

let blobServiceClient = null;

export const initBlobStorage = () => {
  if (!ACCOUNT_NAME) {
    console.log('ℹ️  BlobStorage: STORAGE_ACCOUNT_NAME not set — uploads disabled (dev mode)');
    return;
  }

  try {
    if (CONN_STR) {
      // Local dev — connection string
      blobServiceClient = BlobServiceClient.fromConnectionString(CONN_STR);
      console.log('✅ BlobStorage: connected via connection string');
    } else {
      // Production — Managed Identity
      const url = `https://${ACCOUNT_NAME}.blob.core.windows.net`;
      blobServiceClient = new BlobServiceClient(url, new DefaultAzureCredential());
      console.log(`✅ BlobStorage: connected via Managed Identity → ${url}`);
    }
  } catch (err) {
    console.error('❌ BlobStorage init failed:', err.message);
  }
};

/**
 * uploadKycDocument(customerId, docType, buffer, mimeType, filename)
 *
 * Uploads a KYC document to the pending/ folder.
 * Returns the blob URL (private — use generateSasUrl() to create a time-limited link).
 *
 * @param {string} customerId  — customer ID (e.g. CUS-4401)
 * @param {string} docType     — 'passport' | 'utility_bill' | 'selfie'
 * @param {Buffer} buffer      — file bytes
 * @param {string} mimeType    — 'image/jpeg' | 'image/png' | 'application/pdf'
 * @param {string} originalName — original filename for extension
 * @returns {{ blobName, url, thumbnailUrl }}
 */
export const uploadKycDocument = async (customerId, docType, buffer, mimeType, originalName) => {
  if (!blobServiceClient) {
    // Dev mode — return a mock URL
    return {
      blobName: `mock/${customerId}/${docType}`,
      url: `https://mock-storage/${customerId}/${docType}`,
      thumbnailUrl: null,
      devMode: true,
    };
  }

  const ext      = path.extname(originalName) || '.jpg';
  const ts       = Date.now();
  const blobName = `pending/${customerId}/${docType}-${ts}${ext}`;

  // ── Upload original ────────────────────────────────────────────────────
  const container = blobServiceClient.getContainerClient(CONTAINER_KYC);
  const blockBlob = container.getBlockBlobClient(blobName);

  await blockBlob.uploadData(buffer, {
    blobHTTPHeaders: {
      blobContentType: mimeType,
      blobCacheControl: 'no-cache',
    },
    metadata: {
      customerId,
      docType,
      uploadedAt: new Date().toISOString(),
    },
  });

  // ── Generate thumbnail (images only) ──────────────────────────────────
  let thumbnailUrl = null;
  if (mimeType.startsWith('image/')) {
    try {
      const thumbBuffer = await sharp(buffer)
        .resize(400, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer();

      const thumbName = `pending/${customerId}/${docType}-${ts}-thumb.jpg`;
      const thumbContainer = blobServiceClient.getContainerClient(CONTAINER_THUMB);
      const thumbBlob = thumbContainer.getBlockBlobClient(thumbName);

      await thumbBlob.uploadData(thumbBuffer, {
        blobHTTPHeaders: { blobContentType: 'image/jpeg' },
        metadata: { customerId, docType, originalBlob: blobName },
      });

      thumbnailUrl = await generateSasUrl(CONTAINER_THUMB, thumbName, 60); // 60 min
    } catch (err) {
      console.warn('[BlobStorage] Thumbnail generation failed:', err.message);
    }
  }

  const url = await generateSasUrl(CONTAINER_KYC, blobName, 60);

  return { blobName, url, thumbnailUrl, devMode: false };
};

/**
 * generateSasUrl(container, blobName, expiryMinutes)
 *
 * Creates a time-limited, signed URL for a private blob.
 * Used by the admin portal to display KYC documents securely.
 */
export const generateSasUrl = async (containerName, blobName, expiryMinutes = 30) => {
  if (!blobServiceClient) return null;

  try {
    const startsOn  = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

    // With Managed Identity, use User Delegation Key (more secure than account key)
    const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),  // read-only
        startsOn,
        expiresOn,
      },
      userDelegationKey,
      ACCOUNT_NAME
    );

    return `https://${ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${blobName}?${sasParams.toString()}`;
  } catch (err) {
    console.error('[BlobStorage] SAS generation failed:', err.message);
    return null;
  }
};

/**
 * moveBlob(fromContainer, fromBlob, toContainer, toBlob)
 * Used when moving docs from pending/ → approved/ or rejected/
 */
export const moveBlob = async (fromContainer, fromBlob, toContainer, toBlob) => {
  if (!blobServiceClient) return;

  const src  = blobServiceClient.getContainerClient(fromContainer).getBlockBlobClient(fromBlob);
  const dest = blobServiceClient.getContainerClient(toContainer).getBlockBlobClient(toBlob);

  await dest.beginCopyFromURL(src.url);
  await src.delete();
};

/**
 * deleteBlob(container, blobName) — used on customer deletion
 */
export const deleteBlob = async (container, blobName) => {
  if (!blobServiceClient) return;
  const blob = blobServiceClient.getContainerClient(container).getBlockBlobClient(blobName);
  await blob.deleteIfExists();
};

/**
 * listCustomerDocuments(customerId) — returns all blobs for a customer
 */
export const listCustomerDocuments = async (customerId) => {
  if (!blobServiceClient) return [];

  const container = blobServiceClient.getContainerClient(CONTAINER_KYC);
  const blobs = [];

  for await (const blob of container.listBlobsFlat({ prefix: `pending/${customerId}/` })) {
    blobs.push({ name: blob.name, ...blob.properties });
  }
  for await (const blob of container.listBlobsFlat({ prefix: `approved/${customerId}/` })) {
    blobs.push({ name: blob.name, ...blob.properties });
  }

  return blobs;
};

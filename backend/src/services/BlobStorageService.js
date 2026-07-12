



















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
      
      blobServiceClient = BlobServiceClient.fromConnectionString(CONN_STR);
      console.log('✅ BlobStorage: connected via connection string');
    } else {
      
      const url = `https://${ACCOUNT_NAME}.blob.core.windows.net`;
      blobServiceClient = new BlobServiceClient(url, new DefaultAzureCredential());
      console.log(`✅ BlobStorage: connected via Managed Identity → ${url}`);
    }
  } catch (err) {
    console.error('❌ BlobStorage init failed:', err.message);
  }
};














export const uploadKycDocument = async (customerId, docType, buffer, mimeType, originalName) => {
  if (!blobServiceClient) {
    
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

      thumbnailUrl = await generateSasUrl(CONTAINER_THUMB, thumbName, 60); 
    } catch (err) {
      console.warn('[BlobStorage] Thumbnail generation failed:', err.message);
    }
  }

  const url = await generateSasUrl(CONTAINER_KYC, blobName, 60);

  return { blobName, url, thumbnailUrl, devMode: false };
};







export const generateSasUrl = async (containerName, blobName, expiryMinutes = 30) => {
  if (!blobServiceClient) return null;

  try {
    const startsOn  = new Date();
    const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

    
    const userDelegationKey = await blobServiceClient.getUserDelegationKey(startsOn, expiresOn);

    const sasParams = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'),  
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





export const moveBlob = async (fromContainer, fromBlob, toContainer, toBlob) => {
  if (!blobServiceClient) return;

  const src  = blobServiceClient.getContainerClient(fromContainer).getBlockBlobClient(fromBlob);
  const dest = blobServiceClient.getContainerClient(toContainer).getBlockBlobClient(toBlob);

  await dest.beginCopyFromURL(src.url);
  await src.delete();
};




export const deleteBlob = async (container, blobName) => {
  if (!blobServiceClient) return;
  const blob = blobServiceClient.getContainerClient(container).getBlockBlobClient(blobName);
  await blob.deleteIfExists();
};




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

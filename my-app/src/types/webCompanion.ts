export type WebCompanionUploadStatus = 'pending' | 'processed' | 'failed';

export interface WebCompanionUpload {
  id: string;
  stockNumber: string;
  originalUrl: string;
  s3Key: string;
  status: WebCompanionUploadStatus;
  createdAt: string;
  processedAt?: string;
  processedUrl?: string;
  originalFilename?: string;
  size?: number;
  imageIndex?: number;
  error?: string;
}

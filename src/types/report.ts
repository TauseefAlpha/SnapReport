export type ReportStatus =
  | 'QUEUED'
  | 'PROCESSING_IMAGES'
  | 'UPLOADING'
  | 'SENT'
  | 'FAILED';

export interface LocalImage {
  id: string;
  uri: string;
  fileSizeBytes: number;
  width?: number;
  height?: number;
  isCompressed: boolean;
}

export interface Report {
  id: string;
  description: string;
  images: LocalImage[];
  createdAt: string;
  status: ReportStatus;
  retryCount: number;
  lastError?: string;
  uploadedAt?: string;
}

export interface ServerReport {
  id: string;
  description: string;
  createdAt: string;
  receivedAt: string;
  images: {
    originalName: string;
    fileName: string;
    sizeBytes: number;
    url: string;
  }[];
}

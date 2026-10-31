/**
 * TypeScript Data Models for Field Reports
 * 
 * In simple words:
 * Yeh file hamare data ka "Naqsha" (Blueprint) hai. 
 * Is se pata chalta hai ke ek Report aur uski Images me kya kya information hogi.
 */

// Report ki mukhtalif halatein (Life cycle states)
export type ReportStatus =
  | 'QUEUED'            // Report locally save ho chuki hai, upload ki baari ka intezar hai
  | 'PROCESSING_IMAGES' // Bari images ko 5MB se chota kiya ja raha hai
  | 'UPLOADING'         // Server par data aur photos bheji ja rahi hain
  | 'SENT'              // Server ne tasdeeq (acknowledge) kar li hai
  | 'FAILED';           // Error aaya (jaise network drop ya 500 error), retry queue me hai

// Har photo ki maloomat
export interface LocalImage {
  id: string;              // Har image ki unique ID
  uri: string;             // File path (phone ke storage me kahan hai)
  fileSizeBytes: number;   // File ka size (bytes me)
  width?: number;
  height?: number;
  isCompressed: boolean;   // Kya is photo ko compress kiya gaya hai?
}

// Mukammal local report ka structure
export interface Report {
  id: string;              // Unique UUID (Idempotency ke liye sabse ahem!)
  description: string;     // Inspector ka likha hua short text
  images: LocalImage[];    // 1 se 5 photos ki list
  createdAt: string;       // Kab banayi gayi (ISO String)
  status: ReportStatus;    // Current status (QUEUED, UPLOADING, etc.)
  retryCount: number;      // Kitni baar upload karne ki koshish hui
  lastError?: string;      // Agar fail hui toh aakhri error kya tha
  uploadedAt?: string;     // Server ne kab acknowledge kiya
}

// Server se wapis aane wali report ka structure (Review Screen ke liye)
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


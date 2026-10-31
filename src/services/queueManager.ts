/**
 * Offline Queue Orchestrator (The Heart of Delivery Guarantees)
 * 
 * Yeh file poore system ka dimagh hai:
 * 1. Unattended execution: Screen render hone ya na hone se azaad hai.
 * 2. Survives App Kill: Har state change disk (AsyncStorage) me save hoti hai.
 * 3. 2G-Friendly Sequential Processing: Ek waqt me ek report bhejta hai taake bandwidth choke na ho.
 * 4. Auto-Resume: Network aane par khud ba khud trigger hota hai.
 */

import { Report } from '../types/report';
import { getAllReports, updateReport, saveReport } from './storage';
import { networkService } from './network';
import { processReportImages } from './imageProcessor';
import { apiService } from './api';

type QueueListener = (reports: Report[]) => void;

class QueueManager {
  private isProcessing: boolean = false;
  private listeners: Set<QueueListener> = new Set();
  private retryTimer: any = null;

  /**
   * Queue engine ko start karna
   */
  public init() {
    console.log('[QUEUE] Initializing Queue Manager...');

    // 1. Network listener start karein
    networkService.init();

    // 2. Jaise hi internet restore ho, foran queue process karein
    networkService.subscribe((isOnline) => {
      if (isOnline) {
        console.log('[QUEUE] Internet available, triggering processQueue...');
        this.processQueue();
      }
    });

    // 3. App start hote hi check karein agar koi purani report baqi hai
    this.processQueue();
  }

  /**
   * Nayi report queue me submit karna
   * Rule: Report pehle disk par save hoti hai taake force-quit hone par bhi na maray!
   */
  public async enqueue(report: Report): Promise<void> {
    console.log(`[QUEUE] Enqueueing new report: ${report.id}`);
    
    // Disk par save karein
    await saveReport(report);
    this.notifyListeners();

    // Queue trigger karein
    this.processQueue();
  }

  /**
   * Queue Processor: Unattended background runner
   */
  public async processQueue(): Promise<void> {
    // Concurrency Lock: Agar pehle se koi upload chal raha hai toh naya start mat karo
    if (this.isProcessing) {
      console.log('[QUEUE] Already processing, skipping duplicate run.');
      return;
    }

    // Check internet connection
    const isOnline = await networkService.checkConnection();
    if (!isOnline) {
      console.log('[QUEUE] Offline. Queue is paused until network restores.');
      return;
    }

    this.isProcessing = true;

    try {
      const allReports = await getAllReports();

      // Pending reports dhoondein (jo QUEUED ya FAILED hain)
      const pendingReports = allReports.filter(
        (r) => r.status === 'QUEUED' || r.status === 'FAILED'
      );

      if (pendingReports.length === 0) {
        console.log('[QUEUE] No pending reports to process.');
        this.isProcessing = false;
        return;
      }

      console.log(`[QUEUE] Found ${pendingReports.length} pending report(s).`);

      // FIFO: Purani reports pehle process hongi
      for (const report of pendingReports) {
        // Dubara network check karein (agar 2G me drop ho gaya ho)
        const stillOnline = await networkService.checkConnection();
        if (!stillOnline) {
          console.log('[QUEUE] Network lost mid-queue. Halting.');
          break;
        }

        await this.processSingleReport(report);
      }
    } catch (error) {
      console.error('[QUEUE] Unexpected error in queue loop:', error);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  /**
   * Ek single report ko step-by-step deliver karna
   */
  private async processSingleReport(report: Report): Promise<void> {
    console.log(`[QUEUE] Processing report ${report.id}...`);

    try {
      // ----------------------------------------------------
      // STEP A: Image Compression Pipeline
      // ----------------------------------------------------
      await updateReport(report.id, { status: 'PROCESSING_IMAGES' });
      this.notifyListeners();

      const compressedImages = await processReportImages(report.images);

      // Compressed images ko update karein
      await updateReport(report.id, {
        images: compressedImages,
        status: 'UPLOADING',
      });
      this.notifyListeners();

      // Updated report load karein
      const readyReport: Report = {
        ...report,
        images: compressedImages,
        status: 'UPLOADING',
      };

      // ----------------------------------------------------
      // STEP B: Upload to Server (with Idempotency Key)
      // ----------------------------------------------------
      const result = await apiService.uploadReport(readyReport);

      if (result.success) {
        // Kamyaab! Server ne report receive kar li
        console.log(`[QUEUE] Successfully uploaded report ${report.id}`);
        await updateReport(report.id, {
          status: 'SENT',
          uploadedAt: new Date().toISOString(),
          lastError: undefined,
        });
      } else {
        // Upload fail hua (e.g. 500 error ya network timeout)
        console.warn(`[QUEUE] Upload failed for report ${report.id}:`, result.error);
        await updateReport(report.id, {
          status: 'FAILED',
          retryCount: (report.retryCount || 0) + 1,
          lastError: result.error,
        });
        
        // Agar fail ho jaye toh 5 second baad dobara retry schedule karein
        this.scheduleRetry();
      }
    } catch (err: any) {
      console.error(`[QUEUE] Error processing report ${report.id}:`, err);
      await updateReport(report.id, {
        status: 'FAILED',
        retryCount: (report.retryCount || 0) + 1,
        lastError: err.message || 'Unknown processing error',
      });
      this.scheduleRetry();
    } finally {
      this.notifyListeners();
    }
  }

  /**
   * Exponential / Delayed retry scheduler
   */
  private scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      console.log('[QUEUE] Retrying failed reports...');
      this.processQueue();
    }, 6000); // 6 seconds backoff
  }

  /**
   * UI components ko update notify karna
   */
  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    // Pehli dafa current reports list bhejein
    getAllReports().then((reports) => listener(reports));

    return () => {
      this.listeners.delete(listener);
    };
  }

  private async notifyListeners() {
    const reports = await getAllReports();
    this.listeners.forEach((listener) => listener(reports));
  }
}

export const queueManager = new QueueManager();


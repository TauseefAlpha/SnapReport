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

  public init() {
    networkService.init();

    networkService.subscribe((isOnline) => {
      if (isOnline) {
        this.processQueue();
      }
    });

    this.processQueue();
  }

  public async enqueue(report: Report): Promise<void> {
    await saveReport(report);
    this.notifyListeners();
    this.processQueue();
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    const isOnline = await networkService.checkConnection();
    if (!isOnline) {
      return;
    }

    this.isProcessing = true;

    try {
      const allReports = await getAllReports();
      const pendingReports = allReports.filter(
        (r) => r.status === 'QUEUED' || r.status === 'FAILED'
      );

      if (pendingReports.length === 0) {
        this.isProcessing = false;
        return;
      }

      for (const report of pendingReports) {
        const stillOnline = await networkService.checkConnection();
        if (!stillOnline) {
          break;
        }

        await this.processSingleReport(report);
      }
    } catch (error) {
      console.error('[QUEUE] Error in processing queue:', error);
    } finally {
      this.isProcessing = false;
      this.notifyListeners();
    }
  }

  private async processSingleReport(report: Report): Promise<void> {
    try {
      // Step 1: Compress images before network transmission
      await updateReport(report.id, { status: 'PROCESSING_IMAGES' });
      this.notifyListeners();

      const compressedImages = await processReportImages(report.images);

      await updateReport(report.id, {
        images: compressedImages,
        status: 'UPLOADING',
      });
      this.notifyListeners();

      const readyReport: Report = {
        ...report,
        images: compressedImages,
        status: 'UPLOADING',
      };

      // Step 2: Upload multipart payload
      const result = await apiService.uploadReport(readyReport);

      if (result.success) {
        await updateReport(report.id, {
          status: 'SENT',
          uploadedAt: new Date().toISOString(),
          lastError: undefined,
        });
      } else {
        await updateReport(report.id, {
          status: 'FAILED',
          retryCount: (report.retryCount || 0) + 1,
          lastError: result.error,
        });
        this.scheduleRetry();
      }
    } catch (err: any) {
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

  private scheduleRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = setTimeout(() => {
      this.processQueue();
    }, 6000);
  }

  public subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
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

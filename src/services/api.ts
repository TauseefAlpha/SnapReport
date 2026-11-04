/**
 * API Service for Communicating with Backend
 * 
 * Maqsad:
 * Server par reports upload karna, server se reports fetch karna (Review Screen),
 * aur failure simulation modes set karna.
 */

import { Platform } from 'react-native';
import { Report, ServerReport } from '../types/report';

// Default backend host:
// Port 3000 reverse proxy (adb reverse tcp:3000 tcp:3000) works seamlessly
// across Android emulator, physical USB devices, and iOS simulators.
const DEFAULT_HOST = 'http://localhost:3000';

class ApiService {
  private baseUrl: string = DEFAULT_HOST;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, ''); // Remove trailing slash
    console.log(`[API] Base URL updated to: ${this.baseUrl}`);
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * 1. Deliver: Server par multipart form data upload karna
   */
  public async uploadReport(report: Report): Promise<{ success: boolean; data?: any; error?: string }> {
    const endpoint = `${this.baseUrl}/api/reports`;
    console.log(`[API] Starting upload to ${endpoint} for Report ID: ${report.id}`);

    const formData = new FormData();
    formData.append('id', report.id);
    formData.append('description', report.description);
    formData.append('createdAt', report.createdAt);

    // Photos attach karein
    report.images.forEach((img, index) => {
      // Android / iOS ke liye standard multipart file object
      const fileData: any = {
        uri: img.uri,
        type: 'image/jpeg',
        name: `photo_${index + 1}_${Date.now()}.jpg`,
      };
      formData.append('images', fileData);
    });

    // 2G networks ke liye request timeout zaroori hai (taake request hamesha ke liye na latki rahe)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000); // 45 seconds timeout

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          // Note: FormData me 'Content-Type': 'multipart/form-data' React Native khud boundary ke sath set karta hai
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = json.error || `Server responded with status ${response.status}`;
        console.error(`[API] Upload failed (${response.status}):`, errorMsg);
        return { success: false, error: errorMsg };
      }

      console.log(`[API] Upload successful for ID ${report.id}`);
      return { success: true, data: json };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? 'Upload timed out on slow connection' : err.message || 'Network request failed';
      console.warn(`[API] Network error: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 2. Review: Server se confirmed reports fetch karna (Direct from server)
   */
  public async fetchServerReports(): Promise<ServerReport[]> {
    const endpoint = `${this.baseUrl}/api/reports`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch server reports: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.reports || [];
  }

  /**
   * 3. Server reset karna (Testing ke liye)
   */
  public async resetServer(): Promise<void> {
    const endpoint = `${this.baseUrl}/api/reset`;
    await fetch(endpoint, { method: 'POST' });
  }

  /**
   * 4. Failure Simulation config control karna
   */
  public async getSimulation(): Promise<{ mode: 'none' | 'slow_2g' | 'error_500' | 'drop_connection'; delayMs?: number }> {
    const endpoint = `${this.baseUrl}/api/simulation`;
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch simulation status: HTTP ${response.status}`);
    }
    return response.json();
  }

  public async updateSimulation(mode: 'none' | 'slow_2g' | 'error_500' | 'drop_connection', delayMs = 3500) {
    const endpoint = `${this.baseUrl}/api/simulation`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, delayMs }),
    });
    return response.json();
  }
}

export const apiService = new ApiService();


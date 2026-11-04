import { Report, ServerReport } from '../types/report';

const DEFAULT_HOST = 'http://localhost:3000';

class ApiService {
  private baseUrl: string = DEFAULT_HOST;

  public setBaseUrl(url: string) {
    this.baseUrl = url.replace(/\/$/, '');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public async uploadReport(report: Report): Promise<{ success: boolean; data?: any; error?: string }> {
    const endpoint = `${this.baseUrl}/api/reports`;

    const formData = new FormData();
    formData.append('id', report.id);
    formData.append('description', report.description);
    formData.append('createdAt', report.createdAt);

    report.images.forEach((img, index) => {
      const fileData: any = {
        uri: img.uri,
        type: 'image/jpeg',
        name: `photo_${index + 1}_${Date.now()}.jpg`,
      };
      formData.append('images', fileData);
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = json.error || `Server responded with status ${response.status}`;
        return { success: false, error: errorMsg };
      }

      return { success: true, data: json };
    } catch (err: any) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const errorMsg = isAbort ? 'Upload timed out on slow connection' : err.message || 'Network request failed';
      return { success: false, error: errorMsg };
    }
  }

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

  public async resetServer(): Promise<void> {
    const endpoint = `${this.baseUrl}/api/reset`;
    await fetch(endpoint, { method: 'POST' });
  }

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

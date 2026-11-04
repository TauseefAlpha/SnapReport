import AsyncStorage from '@react-native-async-storage/async-storage';
import { Report } from '../types/report';

const STORAGE_KEY_REPORTS = '@snap_report_local_queue_v1';

export async function getAllReports(): Promise<Report[]> {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY_REPORTS);
    if (!rawData) {
      return [];
    }
    const parsed: Report[] = JSON.parse(rawData);
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[STORAGE] Error reading reports from disk:', error);
    return [];
  }
}

export async function saveReport(report: Report): Promise<void> {
  try {
    const existingReports = await getAllReports();
    const index = existingReports.findIndex((r) => r.id === report.id);

    if (index >= 0) {
      existingReports[index] = report;
    } else {
      existingReports.unshift(report);
    }

    await AsyncStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existingReports));
    console.log(`[STORAGE] Report saved: ${report.id} (${report.status})`);
  } catch (error) {
    console.error('[STORAGE] Failed to save report to disk:', error);
    throw error;
  }
}

export async function updateReport(
  id: string,
  updates: Partial<Report>
): Promise<Report | null> {
  try {
    const existingReports = await getAllReports();
    const index = existingReports.findIndex((r) => r.id === id);

    if (index === -1) {
      console.warn(`[STORAGE] Report not found: ${id}`);
      return null;
    }

    const updatedReport: Report = {
      ...existingReports[index],
      ...updates,
    };

    existingReports[index] = updatedReport;
    await AsyncStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existingReports));
    return updatedReport;
  } catch (error) {
    console.error(`[STORAGE] Failed to update report ${id}:`, error);
    throw error;
  }
}

export async function getReportById(id: string): Promise<Report | null> {
  const reports = await getAllReports();
  return reports.find((r) => r.id === id) || null;
}

export async function clearAllLocalReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_REPORTS);
    console.log('[STORAGE] All local reports cleared.');
  } catch (error) {
    console.error('[STORAGE] Failed to clear local reports:', error);
    throw error;
  }
}

export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

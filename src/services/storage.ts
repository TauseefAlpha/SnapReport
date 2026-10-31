/**
 * Local Storage Service (AsyncStorage Wrapper)
 * 
 * Maqsad:
 * Phone ki internal disk me reports ko mehfooz (persist) karna.
 * Chahe app kill ho jaye, phone restart ho jaye ya battery khatam ho jaye,
 * AsyncStorage me data safe rehta hai. Yeh "Nothing is lost" guarantee ka base hai.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Report } from '../types/report';

// AsyncStorage me data save karne ke liye key
const STORAGE_KEY_REPORTS = '@snap_report_local_queue_v1';

/**
 * 1. Sabhi local reports disk se uthana
 */
export async function getAllReports(): Promise<Report[]> {
  try {
    const rawData = await AsyncStorage.getItem(STORAGE_KEY_REPORTS);
    if (!rawData) {
      return [];
    }
    const parsed: Report[] = JSON.parse(rawData);
    // Newest reports pehle dikhane ke liye sort karte hain
    return parsed.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('[STORAGE] Error reading reports from disk:', error);
    return [];
  }
}

/**
 * 2. Nayi report save karna (ya update karna)
 */
export async function saveReport(report: Report): Promise<void> {
  try {
    const existingReports = await getAllReports();
    const index = existingReports.findIndex((r) => r.id === report.id);

    if (index >= 0) {
      // Agar report pehle se mojood hai, toh update karein
      existingReports[index] = report;
    } else {
      // Nayi report ko list ke shuru me dalein
      existingReports.unshift(report);
    }

    await AsyncStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(existingReports));
    console.log(`[STORAGE] Report saved successfully: ${report.id} (${report.status})`);
  } catch (error) {
    console.error('[STORAGE] Failed to save report to disk:', error);
    throw error;
  }
}

/**
 * 3. Kisi report ka Status ya specific fields update karna
 * Example: QUEUED se UPLOADING ya SENT me badalna
 */
export async function updateReport(
  id: string,
  updates: Partial<Report>
): Promise<Report | null> {
  try {
    const existingReports = await getAllReports();
    const index = existingReports.findIndex((r) => r.id === id);

    if (index === -1) {
      console.warn(`[STORAGE] Report not found to update: ${id}`);
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

/**
 * 4. ID ke zariye specific report dhoondna
 */
export async function getReportById(id: string): Promise<Report | null> {
  const reports = await getAllReports();
  return reports.find((r) => r.id === id) || null;
}

/**
 * 5. Start Over (Reset): Local queue aur tamam saved reports ko clear karna
 */
export async function clearAllLocalReports(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_REPORTS);
    console.log('[STORAGE] All local reports cleared.');
  } catch (error) {
    console.error('[STORAGE] Failed to clear local reports:', error);
    throw error;
  }
}

/**
 * Unique ID (UUID v4) generator
 * Kyun chahiye? Idempotency ke liye har report ko banate waqt unique ID milti hai.
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}


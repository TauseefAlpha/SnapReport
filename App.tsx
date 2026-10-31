/**
 * SnapReport — Main Application Root
 * 
 * Features:
 * 1. Initializes the QueueManager background listener on app launch.
 * 2. Displays live network status banner (Offline / Online).
 * 3. Native tab navigation:
 *    - Compose: Create reports with 1-5 images & description
 *    - Outbox: Real-time local queue feed & delivery status
 *    - Server Review: Reports fetched directly from backend
 *    - Dev / Reset: Failure simulator & deliberate reset operations
 */

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NetworkBanner } from './src/components/NetworkBanner';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { DevSettingsScreen } from './src/screens/DevSettingsScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { queueManager } from './src/services/queueManager';
import { Report } from './src/types/report';

type Tab = 'compose' | 'queue' | 'review' | 'settings';

function MainApp() {
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    // App start hone par Queue Engine start karein (Unattended background runner)
    queueManager.init();

    // Outbox tab par badge show karne ke liye pending reports track karein
    const unsubscribe = queueManager.subscribe((reports: Report[]) => {
      const pending = reports.filter(
        (r) => r.status === 'QUEUED' || r.status === 'PROCESSING_IMAGES' || r.status === 'UPLOADING'
      ).length;
      setPendingCount(pending);
    });

    return () => unsubscribe();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.appHeader}>
        <View>
          <Text style={styles.appName}>SnapReport</Text>
          <Text style={styles.appTagline}>Field Inspector • Offline-First</Text>
        </View>
      </View>

      {/* Network Connectivity Status Banner */}
      <NetworkBanner />

      {/* Active Screen Body */}
      <View style={styles.screenContainer}>
        {activeTab === 'compose' && (
          <ComposeScreen onReportSubmitted={() => setActiveTab('queue')} />
        )}
        {activeTab === 'queue' && <QueueScreen />}
        {activeTab === 'review' && <ReviewScreen />}
        {activeTab === 'settings' && <DevSettingsScreen />}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabBar}>
        {/* Tab 1: Compose */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('compose')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'compose' && styles.tabActiveText]}>
            ✍️
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'compose' && styles.tabActiveText]}>
            Compose
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Outbox / Queue (with pending badge) */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('queue')}
          activeOpacity={0.7}
        >
          <View style={styles.iconWithBadge}>
            <Text style={[styles.tabIcon, activeTab === 'queue' && styles.tabActiveText]}>
              📦
            </Text>
            {pendingCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendingCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.tabLabel, activeTab === 'queue' && styles.tabActiveText]}>
            Outbox
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Server Review */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('review')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'review' && styles.tabActiveText]}>
            ☁️
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'review' && styles.tabActiveText]}>
            Server
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Dev / Reset */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('settings')}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabIcon, activeTab === 'settings' && styles.tabActiveText]}>
            ⚙️
          </Text>
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabActiveText]}>
            Reset / Dev
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#16212C',
    letterSpacing: -0.3,
  },
  appTagline: {
    fontSize: 11,
    color: '#5F6368',
    fontWeight: '500',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 11,
    color: '#80868B',
    fontWeight: '500',
  },
  tabActiveText: {
    color: '#1A73E8',
    fontWeight: '700',
  },
  iconWithBadge: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#D93025',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
});

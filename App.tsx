import React, { useEffect, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CloudIcon, InboxIcon, PenSquareIcon, SettingsIcon } from './src/components/Icons';
import { NetworkBanner } from './src/components/NetworkBanner';
import { ComposeScreen } from './src/screens/ComposeScreen';
import { DevSettingsScreen } from './src/screens/DevSettingsScreen';
import { QueueScreen } from './src/screens/QueueScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { queueManager } from './src/services/queueManager';
import { Report } from './src/types/report';

type Tab = 'compose' | 'queue' | 'review' | 'settings';

function MainApp() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<Tab>('compose');
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    queueManager.init();

    const unsubscribe = queueManager.subscribe((reports: Report[]) => {
      const pending = reports.filter(
        (r) => r.status === 'QUEUED' || r.status === 'PROCESSING_IMAGES' || r.status === 'UPLOADING'
      ).length;
      setPendingCount(pending);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.rootContainer, { paddingTop: insets.top }]}>
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

      {/* Bottom Navigation Bar with Safe Bottom Inset */}
      <View
        style={[
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            height: 56 + Math.max(insets.bottom, 10),
          },
        ]}
      >
        {/* Tab 1: Compose */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setActiveTab('compose')}
          activeOpacity={0.7}
        >
          <PenSquareIcon
            size={20}
            color={activeTab === 'compose' ? '#1A73E8' : '#80868B'}
            strokeWidth={activeTab === 'compose' ? 2.4 : 1.8}
          />
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
            <InboxIcon
              size={20}
              color={activeTab === 'queue' ? '#1A73E8' : '#80868B'}
              strokeWidth={activeTab === 'queue' ? 2.4 : 1.8}
            />
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
          <CloudIcon
            size={20}
            color={activeTab === 'review' ? '#1A73E8' : '#80868B'}
            strokeWidth={activeTab === 'review' ? 2.4 : 1.8}
          />
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
          <SettingsIcon
            size={20}
            color={activeTab === 'settings' ? '#1A73E8' : '#80868B'}
            strokeWidth={activeTab === 'settings' ? 2.4 : 1.8}
          />
          <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabActiveText]}>
            Reset / Dev
          </Text>
        </TouchableOpacity>
      </View>
    </View>
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
  rootContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  appName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#16212C',
    letterSpacing: -0.3,
  },
  appTagline: {
    fontSize: 11.5,
    color: '#5F6368',
    fontWeight: '500',
    marginTop: 1,
  },
  screenContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E8EAED',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: '#80868B',
    fontWeight: '500',
    marginTop: 3,
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
    top: -5,
    right: -10,
    backgroundColor: '#D93025',
    borderRadius: 9,
    minWidth: 17,
    height: 17,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
});

import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangleIcon, CheckIcon, ClockIcon, UnplugIcon } from '../components/Icons';
import { apiService } from '../services/api';
import { clearAllLocalReports } from '../services/storage';

type SimMode = 'none' | 'slow_2g' | 'error_500' | 'drop_connection';
let cachedSimMode: SimMode = 'none';

export const DevSettingsScreen: React.FC = () => {
  const [serverUrl, setServerUrl] = useState(apiService.getBaseUrl());
  const [activeSimMode, setActiveSimMode] = useState<SimMode>(cachedSimMode);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    apiService
      .getSimulation()
      .then((cfg) => {
        if (cfg && cfg.mode) {
          cachedSimMode = cfg.mode;
          setActiveSimMode(cfg.mode);
        }
      })
      .catch((err) => {
        console.warn('[DEV] Failed to sync simulation status:', err.message);
      });
  }, []);

  const handleSetSimMode = async (mode: SimMode) => {
    setIsUpdating(true);
    try {
      await apiService.updateSimulation(mode);
      cachedSimMode = mode;
      setActiveSimMode(mode);
      Alert.alert('Simulation Updated', `Backend failure mode is now set to: ${mode}`);
    } catch (err: any) {
      Alert.alert('Error', 'Failed to reach server to update simulation: ' + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Blast Radius 1: Clear Local Storage Only
   */
  const handleClearLocalStorage = () => {
    Alert.alert(
      'Reset Local Device Outbox',
      'Blast Radius: This will wipe all reports saved locally in the phone storage (queued, uploading, failed). Reports already on the server will NOT be touched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Reset',
          style: 'destructive',
          onPress: async () => {
            await clearAllLocalReports();
            Alert.alert('Reset Complete', 'Local device queue has been cleared.');
          },
        },
      ]
    );
  };

  /**
   * Blast Radius 2: Clear Server DB Only
   */
  const handleClearServer = () => {
    Alert.alert(
      'Reset Server Database',
      'Blast Radius: This will wipe all delivered reports from the backend server. Local device reports will remain untouched.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Server Wipe',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiService.resetServer();
              Alert.alert('Server Reset', 'Server reports database wiped.');
            } catch (err: any) {
              Alert.alert('Error', err.message);
            }
          },
        },
      ]
    );
  };

  /**
   * Blast Radius 3: Full Nuclear Reset (Both Device + Server)
   */
  const handleFullReset = () => {
    Alert.alert(
      'Full System Reset (Start Over)',
      'Blast Radius: Clears BOTH local phone queue AND backend server database for a fresh test pass.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Wipe Everything',
          style: 'destructive',
          onPress: async () => {
            await clearAllLocalReports();
            try {
              await apiService.resetServer();
            } catch (_) { }
            Alert.alert('Full Reset Complete', 'Both device and server have been reset.');
          },
        },
      ]
    );
  };

  const handleUpdateUrl = () => {
    apiService.setBaseUrl(serverUrl);
    Alert.alert('URL Updated', `Server endpoint updated to: ${serverUrl}`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Dev Controls & Reset</Text>
      <Text style={styles.subtitle}>
        Control backend failure modes and execute deliberate resets with defined blast radii.
      </Text>

      {/* 1. Failure Simulation Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Failure Simulator</Text>
        <Text style={styles.cardDesc}>
          Simulate real-world 2G delays and network dropouts on demand:
        </Text>

        <TouchableOpacity
          style={[styles.simBtn, activeSimMode === 'none' && styles.simBtnActive]}
          onPress={() => handleSetSimMode('none')}
          disabled={isUpdating}
        >
          <CheckIcon size={16} color={activeSimMode === 'none' ? '#1A73E8' : '#5F6368'} strokeWidth={2.4} />
          <Text style={[styles.simBtnText, activeSimMode === 'none' && styles.simBtnTextActive]}>
            Normal Mode (No simulated failure)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.simBtn, activeSimMode === 'slow_2g' && styles.simBtnActive]}
          onPress={() => handleSetSimMode('slow_2g')}
          disabled={isUpdating}
        >
          <ClockIcon size={16} color={activeSimMode === 'slow_2g' ? '#1A73E8' : '#5F6368'} strokeWidth={2.2} />
          <Text style={[styles.simBtnText, activeSimMode === 'slow_2g' && styles.simBtnTextActive]}>
            Slow 2G Network (3.5s Artificial Latency)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.simBtn, activeSimMode === 'error_500' && styles.simBtnActive]}
          onPress={() => handleSetSimMode('error_500')}
          disabled={isUpdating}
        >
          <AlertTriangleIcon size={16} color={activeSimMode === 'error_500' ? '#D93025' : '#5F6368'} strokeWidth={2.2} />
          <Text style={[styles.simBtnText, activeSimMode === 'error_500' && styles.simBtnTextActive]}>
            HTTP 500 Internal Error (Test auto-retry)
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.simBtn, activeSimMode === 'drop_connection' && styles.simBtnActive]}
          onPress={() => handleSetSimMode('drop_connection')}
          disabled={isUpdating}
        >
          <UnplugIcon size={16} color={activeSimMode === 'drop_connection' ? '#D93025' : '#5F6368'} strokeWidth={2.2} />
          <Text style={[styles.simBtnText, activeSimMode === 'drop_connection' && styles.simBtnTextActive]}>
            Drop Connection Mid-Upload (Socket Destroy)
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Server URL Configuration */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Backend Server URL</Text>
        <Text style={styles.cardDesc}>
          Default for Android Emulator is http://10.0.2.2:3000. If using physical device, enter your Wi-Fi IP.
        </Text>
        <TextInput
          style={styles.urlInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.saveUrlBtn} onPress={handleUpdateUrl}>
          <Text style={styles.saveUrlBtnText}>Save Server URL</Text>
        </TouchableOpacity>
      </View>

      {/* 3. Start Over / Reset Section */}
      <View style={[styles.card, styles.dangerCard]}>
        <Text style={[styles.cardTitle, { color: '#C5221F' }]}>Start Over (Reset Engine)</Text>
        <Text style={styles.cardDesc}>
          Deliberate reset operations with clearly defined blast radius:
        </Text>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearLocalStorage}>
          <Text style={styles.dangerBtnText}>Clear Local Device Queue Only</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.dangerBtn} onPress={handleClearServer}>
          <Text style={styles.dangerBtnText}>Clear Server Database Only</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerBtn, { backgroundColor: '#C5221F', borderColor: '#C5221F' }]}
          onPress={handleFullReset}
        >
          <Text style={[styles.dangerBtnText, { color: '#FFFFFF' }]}>
            Full Reset (Wipe Device & Server)
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#5F6368',
    marginBottom: 16,
    lineHeight: 18,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  dangerCard: {
    borderColor: '#FAD2CF',
    backgroundColor: '#FFF8F7',
  },
  cardTitle: {
    fontSize: 15.5,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12.5,
    color: '#5F6368',
    marginBottom: 14,
    lineHeight: 18,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  simBtnActive: {
    borderColor: '#1A73E8',
    backgroundColor: '#E8F0FE',
  },
  simBtnText: {
    fontSize: 13,
    color: '#3C4043',
    fontWeight: '500',
  },
  simBtnTextActive: {
    color: '#1A73E8',
    fontWeight: '700',
  },
  urlInput: {
    borderWidth: 1,
    borderColor: '#DADCE0',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
    color: '#202124',
    marginBottom: 10,
  },
  saveUrlBtn: {
    backgroundColor: '#1A73E8',
    borderRadius: 6,
    paddingVertical: 9,
    alignItems: 'center',
  },
  saveUrlBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  dangerBtn: {
    borderWidth: 1,
    borderColor: '#D93025',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  dangerBtnText: {
    color: '#D93025',
    fontSize: 13,
    fontWeight: '600',
  },
});


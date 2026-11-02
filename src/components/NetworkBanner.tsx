/**
 * Network Status Banner
 * 
 * Maqsad:
 * User ko foran batana ke internet mojood hai ya phone offline hai.
 * Assignment rule: "One glance, one answer. The user can always tell whether
 * their work is safe, moving, or lost."
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { networkService } from '../services/network';

export const NetworkBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(networkService.getIsOnline());

  useEffect(() => {
    const unsubscribe = networkService.subscribe((online) => {
      setIsOnline(online);
    });
    return () => unsubscribe();
  }, []);

  return (
    <View style={[styles.container, isOnline ? styles.online : styles.offline]}>
      <View style={[styles.dot, isOnline ? styles.dotOnline : styles.dotOffline]} />
      <Text style={styles.text}>
        {isOnline
          ? 'Network Connected — Auto-delivery active'
          : 'Offline (Airplane mode) — Reports safely queued locally'}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  online: {
    backgroundColor: '#E6F4EA', // Light green
  },
  offline: {
    backgroundColor: '#FCE8E6', // Light red / alert
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  dotOnline: {
    backgroundColor: '#1E8E3E',
  },
  dotOffline: {
    backgroundColor: '#D93025',
  },
  text: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#202124',
  },
});


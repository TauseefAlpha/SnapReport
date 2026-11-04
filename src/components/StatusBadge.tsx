import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ReportStatus } from '../types/report';

interface Props {
  status: ReportStatus;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'QUEUED':
        return {
          label: 'Saved Locally (In Queue)',
          bg: '#FEF7E0', // Amber/yellow
          color: '#B06000',
        };
      case 'PROCESSING_IMAGES':
        return {
          label: 'Compressing Photos (< 5MB)',
          bg: '#E8F0FE', // Light blue
          color: '#1A73E8',
        };
      case 'UPLOADING':
        return {
          label: 'Uploading to Server...',
          bg: '#F3E8FD', // Light purple
          color: '#7B1FA2',
        };
      case 'SENT':
        return {
          label: 'Delivered to Server',
          bg: '#E6F4EA', // Light green
          color: '#137333',
        };
      case 'FAILED':
        return {
          label: 'Failed — Queued for Retry',
          bg: '#FCE8E6', // Light red
          color: '#C5221F',
        };
      default:
        return {
          label: status,
          bg: '#F1F3F4',
          color: '#5F6368',
        };
    }
  };

  const { label, bg, color } = getBadgeConfig();

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});


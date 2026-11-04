import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { InboxIcon, RefreshIcon } from '../components/Icons';
import { StatusBadge } from '../components/StatusBadge';
import { queueManager } from '../services/queueManager';
import { Report } from '../types/report';

export const QueueScreen: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = queueManager.subscribe((latestReports) => {
      setReports(latestReports);
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsRefreshing(true);
    await queueManager.processQueue();
    setIsRefreshing(false);
  };

  // Metrics summary
  const total = reports.length;
  const inFlight = reports.filter(
    (r) => r.status === 'QUEUED' || r.status === 'PROCESSING_IMAGES' || r.status === 'UPLOADING'
  ).length;
  const delivered = reports.filter((r) => r.status === 'SENT').length;
  const failed = reports.filter((r) => r.status === 'FAILED').length;

  const renderReportItem = ({ item }: { item: Report }) => {
    const isWorking = item.status === 'PROCESSING_IMAGES' || item.status === 'UPLOADING';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <StatusBadge status={item.status} />
          {isWorking && <ActivityIndicator size="small" color="#1A73E8" />}
          <Text style={styles.timeText}>
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text style={styles.descText} numberOfLines={2}>
          {item.description}
        </Text>

        {/* Photos strip */}
        <View style={styles.photosRow}>
          {item.images.map((img, i) => (
            <Image key={img.id || i} source={{ uri: img.uri }} style={styles.cardThumbnail} />
          ))}
          <Text style={styles.photoCountText}>
            {item.images.length} {item.images.length === 1 ? 'photo' : 'photos'}
          </Text>
        </View>

        {/* Failed Error Message & Retry Info */}
        {item.status === 'FAILED' && item.lastError && (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Last attempt failed: {item.lastError}</Text>
            <Text style={styles.retryInfo}>
              Attempted {item.retryCount || 1} time(s). Will retry automatically when network is stable.
            </Text>
          </View>
        )}

        {/* Delivery Timestamp */}
        {item.status === 'SENT' && item.uploadedAt && (
          <Text style={styles.deliveredAtText}>
            ✓ Confirmed on server at{' '}
            {new Date(item.uploadedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Metrics Row */}
      <View style={styles.metricsBar}>
        <View style={styles.metricItem}>
          <Text style={styles.metricNum}>{total}</Text>
          <Text style={styles.metricLabel}>Total</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricNum, { color: '#B06000' }]}>{inFlight}</Text>
          <Text style={styles.metricLabel}>Pending</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={[styles.metricNum, { color: '#137333' }]}>{delivered}</Text>
          <Text style={styles.metricLabel}>Delivered</Text>
        </View>
        {failed > 0 && (
          <View style={styles.metricItem}>
            <Text style={[styles.metricNum, { color: '#C5221F' }]}>{failed}</Text>
            <Text style={styles.metricLabel}>Retrying</Text>
          </View>
        )}
      </View>

      {/* Sync trigger button */}
      <View style={styles.syncHeader}>
        <Text style={styles.outboxTitle}>Local Device Outbox</Text>
        <TouchableOpacity style={styles.syncButton} onPress={handleManualSync}>
          <RefreshIcon size={13} color="#1A73E8" strokeWidth={2.2} />
          <Text style={styles.syncButtonText}>Sync Now</Text>
        </TouchableOpacity>
      </View>

      {/* Reports FlatList */}
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        renderItem={renderReportItem}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleManualSync} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <InboxIcon size={40} color="#BDC1C6" strokeWidth={1.5} />
            <Text style={[styles.emptyTitle, { marginTop: 12 }]}>Outbox is Empty</Text>
            <Text style={styles.emptySubtitle}>
              New reports created on the Compose screen will appear here.
            </Text>
          </View>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  metricsBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-around',
  },
  metricItem: {
    alignItems: 'center',
  },
  metricNum: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
  },
  metricLabel: {
    fontSize: 11.5,
    color: '#5F6368',
    marginTop: 2,
  },
  syncHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  outboxTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#202124',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#E8F0FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    color: '#1A73E8',
    fontSize: 12.5,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8EAED',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeText: {
    fontSize: 12,
    color: '#80868B',
  },
  descText: {
    fontSize: 14.5,
    color: '#202124',
    lineHeight: 20,
    marginBottom: 12,
  },
  photosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 6,
    marginRight: 8,
    backgroundColor: '#E8EAED',
  },
  photoCountText: {
    fontSize: 12,
    color: '#5F6368',
    marginLeft: 4,
  },
  errorBox: {
    backgroundColor: '#FCE8E6',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  errorTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#C5221F',
  },
  retryInfo: {
    fontSize: 11,
    color: '#5F6368',
    marginTop: 2,
  },
  deliveredAtText: {
    fontSize: 11.5,
    color: '#137333',
    fontWeight: '600',
    marginTop: 6,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5F6368',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#80868B',
    textAlign: 'center',
  },
});


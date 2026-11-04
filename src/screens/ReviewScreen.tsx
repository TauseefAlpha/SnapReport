import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AlertTriangleIcon, CheckCircleIcon, CloudIcon } from '../components/Icons';
import { apiService } from '../services/api';
import { ServerReport } from '../types/report';

export const ReviewScreen: React.FC = () => {
  const [reports, setReports] = useState<ServerReport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchReports = useCallback(async () => {
    setError(null);
    try {
      const data = await apiService.fetchServerReports();
      setReports(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch from server');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  const renderItem = ({ item }: { item: ServerReport }) => {
    const baseUrl = apiService.getBaseUrl();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.serverVerifiedTag}>
            <CheckCircleIcon size={12} color="#137333" strokeWidth={2.5} />
            <Text style={styles.serverVerifiedText}>Server Verified</Text>
          </View>
          <Text style={styles.timeText}>
            Received: {new Date(item.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>

        <Text style={styles.descText}>{item.description}</Text>

        <Text style={styles.sectionLabel}>
          Server Stored Images ({item.images.length}):
        </Text>

        {/* Server Images Scroll */}
        <View style={styles.imagesRow}>
          {item.images.map((img, idx) => {
            const imageUrl = `${baseUrl}${img.url}`;
            return (
              <View key={idx} style={styles.imageWrapper}>
                <Image source={{ uri: imageUrl }} style={styles.image} />
                <Text style={styles.sizeTag}>
                  {(img.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                </Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.idText}>Report ID: {item.id}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Server Database</Text>
        <Text style={styles.subtitle}>
          Live data queried directly from the backend server.
        </Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#1A73E8" />
          <Text style={styles.loadingText}>Fetching server reports...</Text>
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <AlertTriangleIcon size={40} color="#D93025" strokeWidth={1.8} />
          <Text style={[styles.errorTitle, { marginTop: 12 }]}>Could Not Reach Server</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchReports}>
            <Text style={styles.retryBtnText}>Retry Connection</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <CloudIcon size={40} color="#BDC1C6" strokeWidth={1.5} />
              <Text style={[styles.emptyTitle, { marginTop: 12 }]}>No Reports on Server Yet</Text>
              <Text style={styles.emptySubtitle}>
                Once queued reports are delivered over the network, they will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E8EAED',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#202124',
  },
  subtitle: {
    fontSize: 12.5,
    color: '#5F6368',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8EAED',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serverVerifiedTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E6F4EA',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  serverVerifiedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#137333',
  },
  timeText: {
    fontSize: 11.5,
    color: '#80868B',
  },
  descText: {
    fontSize: 14.5,
    color: '#202124',
    marginBottom: 10,
    lineHeight: 20,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5F6368',
    marginBottom: 6,
  },
  imagesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  imageWrapper: {
    alignItems: 'center',
  },
  image: {
    width: 70,
    height: 70,
    borderRadius: 6,
    backgroundColor: '#E8EAED',
  },
  sizeTag: {
    fontSize: 9.5,
    color: '#80868B',
    marginTop: 2,
  },
  idText: {
    fontSize: 10.5,
    color: '#9AA0A6',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#5F6368',
  },
  errorIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#202124',
    marginBottom: 4,
  },
  errorMessage: {
    fontSize: 13,
    color: '#C5221F',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    backgroundColor: '#1A73E8',
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13.5,
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

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl, Image,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Feed } from '../src/api/api';
import { Colors, Fonts } from '../src/theme';

interface Activity {
  _id: string;
  type: 'trip_created' | 'trip_joined' | 'buddy_connected' | 'trip_completed' | 'trip_liked';
  user?: { _id: string; firstName: string; lastName: string; profileImage?: string };
  trip?: { _id: string; title: string; destinations?: string[] };
  createdAt: string;
  description?: string;
}

export default function FeedScreen() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const pageRef = useRef(0);

  const loadActivities = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      pageRef.current = 0;
      setRefreshing(true);
    } else if (!hasMore) return;

    try {
      const offset = pageRef.current * 20;
      const data = await Feed.getActivity(20, offset);
      const items = Array.isArray(data)
        ? data
        : ((data as { activities?: Activity[] }).activities ?? []);

      if (isRefresh) {
        setActivities(items);
      } else {
        setActivities((prev) => [...prev, ...items]);
      }

      setHasMore(items.length === 20);
      pageRef.current += 1;
    } catch {
      if (!isRefresh) Alert.alert('Error', 'Could not load activity feed. Try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [hasMore]);

  useEffect(() => {
    loadActivities();
  }, []);

  const handleRefresh = useCallback(() => {
    loadActivities(true);
  }, [loadActivities]);

  const handleLoadMore = useCallback(() => {
    loadActivities(false);
  }, [loadActivities]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'trip_created': return 'add-circle-outline';
      case 'trip_joined': return 'log-in-outline';
      case 'buddy_connected': return 'heart-outline';
      case 'trip_completed': return 'checkmark-circle-outline';
      case 'trip_liked': return 'star-outline';
      default: return 'information-circle-outline';
    }
  };

  const getActivityText = (activity: Activity) => {
    const name = activity.user ? `${activity.user.firstName} ${activity.user.lastName}` : 'Someone';
    switch (activity.type) {
      case 'trip_created':
        return `${name} created a trip to ${activity.trip?.destinations?.[0] ?? 'a new destination'}`;
      case 'trip_joined':
        return `${name} joined a trip to ${activity.trip?.destinations?.[0] ?? 'a trip'}`;
      case 'buddy_connected':
        return `${name} became your travel buddy`;
      case 'trip_completed':
        return `${name} completed a trip to ${activity.trip?.destinations?.[0] ?? 'a destination'}`;
      case 'trip_liked':
        return `${name} liked a trip to ${activity.trip?.destinations?.[0] ?? 'a trip'}`;
      default:
        return activity.description ?? 'Activity update';
    }
  };

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Feed</Text>
        <Text style={styles.sub}>See what your travel community is up to</Text>
      </View>

      <FlatList
        data={activities}
        keyExtractor={(item) => item._id}
        contentContainerStyle={activities.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="globe-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptySub}>Follow connections to see their travel updates</Text>
          </View>
        }
        ListFooterComponent={
          hasMore ? (
            <View style={styles.footer}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null
        }
        renderItem={({ item: activity }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => {
              if (activity.trip?._id) {
                router.push({
                  pathname: '/trips/[id]',
                  params: { id: activity.trip._id },
                });
              }
            }}
            activeOpacity={0.7}
          >
            <View style={styles.iconBg}>
              <Ionicons name={getActivityIcon(activity.type) as any} size={20} color={Colors.primary} />
            </View>

            <View style={styles.content}>
              <View style={styles.userRow}>
                {activity.user?.profileImage && (
                  <Image
                    source={{ uri: activity.user.profileImage }}
                    style={styles.avatar}
                  />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.text} numberOfLines={2}>
                    {getActivityText(activity)}
                  </Text>
                  <Text style={styles.time}>{formatTime(activity.createdAt)}</Text>
                </View>
              </View>
            </View>

            <Ionicons name="chevron-forward" size={20} color={Colors.border} />
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  header: {
    backgroundColor: Colors.bgCard,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark },
  sub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flex: 1 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  list: { padding: 16, gap: 12 },
  footer: { padding: 20, alignItems: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 12,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
    flexShrink: 0,
  },
  content: { flex: 1 },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  text: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textDark, lineHeight: 20 },
  time: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 2 },
});
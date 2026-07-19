import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Feed } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

interface SavedTrip {
  _id: string;
  title: string;
  destinations?: string[];
  startDate?: string;
  endDate?: string;
  budget?: { amount?: number };
  capacity?: { max?: number };
  participants?: Array<{ _id: string }>;
  organizer?: { firstName: string; lastName: string; profileImage?: string };
}

export default function SavedTripsScreen() {
  const navigation = useNavigation();
  const [trips, setTrips] = useState<SavedTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    navigation.setOptions({ title: 'Saved Trips' });
  }, [navigation]);

  const loadSavedTrips = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await Feed.getLikedTrips();
      const list = data as SavedTrip[] | { trips?: SavedTrip[] };
      setTrips(Array.isArray(list) ? list : (list as { trips?: SavedTrip[] }).trips ?? []);
    } catch {
      Alert.alert('Error', 'Could not load saved trips. Try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSavedTrips();
  }, [loadSavedTrips]);

  const handleRefresh = useCallback(() => {
    loadSavedTrips(true);
  }, [loadSavedTrips]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item._id}
        contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={Colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="heart-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No saved trips yet</Text>
            <Text style={styles.emptySub}>Like trips to save them for later</Text>
          </View>
        }
        renderItem={({ item: trip }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push({ pathname: '/trips/[id]', params: { id: trip._id } })}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.title} numberOfLines={2}>{trip.title}</Text>
              <Ionicons name="heart" size={20} color={Colors.error} />
            </View>

            {trip.destinations && trip.destinations.length > 0 && (
              <Text style={styles.destination} numberOfLines={1}>
                📍 {trip.destinations.join(', ')}
              </Text>
            )}

            <View style={styles.metaRow}>
              {trip.startDate && (
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={Colors.textLight} />
                  <Text style={styles.metaText}>
                    {new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )}
              {trip.budget?.amount != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="cash-outline" size={14} color={Colors.textLight} />
                  <Text style={styles.metaText}>${trip.budget.amount.toLocaleString()}</Text>
                </View>
              )}
              {trip.capacity?.max != null && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={14} color={Colors.textLight} />
                  <Text style={styles.metaText}>{(trip.participants ?? []).length}/{trip.capacity.max}</Text>
                </View>
              )}
            </View>

            {trip.organizer && (
              <View style={styles.organizerRow}>
                {trip.organizer.profileImage ? (
                  <Image source={{ uri: trip.organizer.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {trip.organizer.firstName?.[0]}{trip.organizer.lastName?.[0]}
                    </Text>
                  </View>
                )}
                <Text style={styles.organizerName} numberOfLines={1}>
                  {trip.organizer.firstName} {trip.organizer.lastName}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flex: 1 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
  },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  title: { flex: 1, fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textDark, lineHeight: 20 },
  destination: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 8 },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight },
  organizerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.borderLight },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  avatarInitials: { fontSize: 10, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  organizerName: { flex: 1, fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
});
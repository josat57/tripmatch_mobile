import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

const CATEGORY_ICONS: Record<string, string> = {
  Adventure: '🏔️', Relaxation: '🏖️', Cultural: '🏛️',
  Business: '💼', Educational: '📚', Other: '✈️',
};

interface Trip {
  _id: string;
  title: string;
  category?: string;
  locations?: { address?: { city?: string; country?: string } };
  startDate?: string;
  endDate?: string;
  budget?: { amount?: number; currency?: string };
  capacity?: { max?: number; current?: number };
  status?: string;
}

export default function MyTripsScreen() {
  const [trips, setTrips]       = useState<Trip[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]     = useState<'all' | 'upcoming' | 'past'>('all');

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await Trips.listMine() as Trip[] | { trips?: Trip[] };
      const list = Array.isArray(data) ? data : (data as { trips?: Trip[] }).trips ?? [];
      setTrips(list);
    } catch {
      Alert.alert('Error', 'Could not load your trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const filtered = trips.filter((t) => {
    if (filter === 'all') return true;
    const now = new Date();
    const end = t.endDate ? new Date(t.endDate) : null;
    if (filter === 'upcoming') return !end || end >= now;
    return end ? end < now : false;
  });

  const renderItem = ({ item }: { item: Trip }) => {
    const icon = CATEGORY_ICONS[item.category ?? ''] ?? '✈️';
    const loc  = [item.locations?.address?.city, item.locations?.address?.country].filter(Boolean).join(', ');
    const start = item.startDate ? new Date(item.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

    return (
      <TouchableOpacity style={styles.card} onPress={() => router.push(`/trips/${item._id}`)}>
        <View style={styles.iconBox}>
          <Text style={styles.iconText}>{icon}</Text>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
          {loc ? <Text style={styles.cardMeta}>{loc}</Text> : null}
          {start ? <Text style={styles.cardMeta}>{start}</Text> : null}
          <View style={styles.cardFooter}>
            {item.budget?.amount ? (
              <Text style={styles.badge}>{item.budget.currency ?? 'USD'} {item.budget.amount.toLocaleString()}</Text>
            ) : null}
            {item.capacity?.max ? (
              <Text style={styles.badge}>{item.capacity.current ?? 0}/{item.capacity.max} members</Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'My Trips', headerShown: true }} />
      <View style={styles.container}>
        {/* Filter pills */}
        <View style={styles.filters}>
          {(['all', 'upcoming', 'past'] as const).map((f) => (
            <TouchableOpacity key={f} style={[styles.pill, filter === f && styles.pillActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.pillText, filter === f && styles.pillTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(t) => t._id}
            renderItem={renderItem}
            contentContainerStyle={filtered.length === 0 ? styles.empty : styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={styles.emptyIcon}>🗺️</Text>
                <Text style={styles.emptyTitle}>No trips yet</Text>
                <Text style={styles.emptyText}>Create your first trip and start finding companions.</Text>
                <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/trips/create')}>
                  <Text style={styles.createBtnText}>Create a trip</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  filters: { flexDirection: 'row', gap: 8, padding: 16, backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  pill: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: Colors.border },
  pillActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  pillText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  pillTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  loader: { marginTop: 60 },
  list: { padding: 16, gap: 12 },
  empty: { flex: 1 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.bgMist, alignItems: 'center', justifyContent: 'center' },
  iconText: { fontSize: 22 },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textDark, marginBottom: 2 },
  cardMeta: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.primaryDark, backgroundColor: Colors.bgMist, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 8 },
  emptyText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 20 },
  createBtn: { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
  createBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
});
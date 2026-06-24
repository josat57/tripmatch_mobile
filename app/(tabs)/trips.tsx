import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

interface Trip {
  _id: string;
  title: string;
  category: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: { amount?: number; currency?: string };
  capacity?: { max?: number };
  participants?: unknown[];
  locations?: { address?: { city?: string; country?: string } };
  boost?: { active?: boolean };
}

const PAGE_SIZE = 20;
const CATEGORIES = ['All', 'Adventure', 'Relaxation', 'Cultural', 'Business', 'Educational', 'Other'];

const CATEGORY_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  Adventure: 'trail-sign-outline', Relaxation: 'sunny-outline',
  Cultural: 'library-outline', Business: 'briefcase-outline',
  Educational: 'school-outline', Other: 'earth-outline',
};

export default function TripsScreen() {
  const [trips, setTrips]           = useState<Trip[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore]       = useState(true);
  const [search, setSearch]         = useState('');
  const [category, setCategory]     = useState('All');
  const page = useRef(1);

  const fetchPage = useCallback(async (pageNum: number, reset: boolean) => {
    const params: Record<string, string> = {};
    if (search.trim()) params.q = search.trim();
    if (category !== 'All') params.category = category;
    const data = await Trips.list(pageNum, PAGE_SIZE, params);
    const raw = data as Trip[] | { trips?: Trip[] };
    const list = Array.isArray(raw) ? raw : (raw as { trips?: Trip[] }).trips ?? [];
    if (reset) {
      setTrips(list);
    } else {
      setTrips((prev) => [...prev, ...list]);
    }
    setHasMore(list.length === PAGE_SIZE);
    return list;
  }, [search, category]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      page.current = 1;
      await fetchPage(1, true);
    } catch {
      Alert.alert('Error', 'Could not load trips.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchPage]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      page.current += 1;
      await fetchPage(page.current, false);
    } catch {}
    finally { setLoadingMore(false); }
  }, [loadingMore, hasMore, fetchPage]);

  useEffect(() => { load(); }, [load]);

  const renderItem = ({ item: trip }: { item: Trip }) => {
    const city    = trip.locations?.address?.city ?? '';
    const country = trip.locations?.address?.country ?? '';
    const dest    = [city, country].filter(Boolean).join(', ');
    const pax     = (trip.participants ?? []).length;
    const maxPax  = trip.capacity?.max ?? '?';
    const budget  = trip.budget?.amount ? `$${trip.budget.amount.toLocaleString()}` : null;
    const start   = trip.startDate
      ? new Date(trip.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : null;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => router.push({ pathname: '/trips/[id]', params: { id: trip._id } })}
        activeOpacity={0.85}
      >
        {trip.boost?.active && (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>⭐ FEATURED</Text>
          </View>
        )}
        <View style={styles.cardHeader}>
          <View style={styles.categoryIcon}>
            <Ionicons name={CATEGORY_ICON[trip.category] ?? 'earth-outline'} size={22} color={Colors.primary} />
          </View>
          <View style={styles.cardTitleBlock}>
            <Text style={styles.cardTitle} numberOfLines={2}>{trip.title}</Text>
            {dest ? <Text style={styles.destination}>📍 {dest}</Text> : null}
          </View>
        </View>
        <View style={styles.metaRow}>
          {start  && <Text style={styles.meta}>📅 {start}</Text>}
          {budget && <Text style={styles.meta}>💰 {budget}</Text>}
          <Text style={styles.meta}>👥 {pax}/{maxPax}</Text>
        </View>
        <View style={styles.exploreBtn}>
          <Text style={styles.exploreBtnText}>Explore Trip</Text>
          <Ionicons name="arrow-forward" size={15} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const footer = loadingMore ? (
    <ActivityIndicator color={Colors.primary} style={{ paddingVertical: 16 }} />
  ) : null;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Browse Trips</Text>
          <TouchableOpacity style={styles.createBtn} onPress={() => router.push('/trips/create')}>
            <Ionicons name="add" size={20} color={Colors.white} />
            <Text style={styles.createBtnText}>Create</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.search}
          value={search}
          onChangeText={setSearch}
          placeholder="Search destinations, titles…"
          placeholderTextColor={Colors.textLight}
          returnKeyType="search"
          onSubmitEditing={() => load()}
        />
        <FlatList
          data={CATEGORIES}
          keyExtractor={(c) => c}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 4 }}
          renderItem={({ item: c }) => (
            <TouchableOpacity
              onPress={() => setCategory(c)}
              style={[styles.catChip, category === c && styles.catChipActive]}
            >
              <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={trips}
          keyExtractor={(t) => t._id}
          renderItem={renderItem}
          contentContainerStyle={trips.length === 0 ? styles.emptyContainer : styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={footer}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="map-outline" size={52} color={Colors.border} />
              <Text style={styles.emptyTitle}>No trips found</Text>
              <Text style={styles.emptySub}>Try a different search or category.</Text>
              <TouchableOpacity style={styles.createBigBtn} onPress={() => router.push('/trips/create')}>
                <Text style={styles.createBigBtnText}>Create the first one</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  topBar: {
    backgroundColor: Colors.bgCard, paddingTop: 56, paddingHorizontal: 20,
    paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark },
  createBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12,
  },
  createBtnText: { fontSize: 13, fontFamily: Fonts.bodyBold, color: Colors.white },
  search: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, fontSize: 14,
    fontFamily: Fonts.body, color: Colors.textDark, backgroundColor: Colors.bgInput, marginBottom: 10,
  },
  catChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 100, borderWidth: 1.5, borderColor: Colors.border, marginRight: 8 },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  catText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
  catTextActive: { color: Colors.white },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyContainer: { flex: 1 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textLight, textAlign: 'center', marginTop: 6 },
  createBigBtn: { marginTop: 20, backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  createBigBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: Colors.bgCard, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  featuredBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginBottom: 10 },
  featuredText: { fontSize: 10, fontFamily: Fonts.bodyBold, color: Colors.white },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  categoryIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.mist,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.primaryLight, flexShrink: 0,
  },
  cardTitleBlock: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.textDark, lineHeight: 22 },
  destination: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 3 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  meta: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },
  exploreBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 10, paddingVertical: 10,
  },
  exploreBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.primary },
});
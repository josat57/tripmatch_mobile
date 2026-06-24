import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Users } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon?: string;
  earnedAt?: string;
  locked?: boolean;
}

interface Definition {
  id: string;
  title: string;
  description: string;
  icon?: string;
}

export default function AchievementsScreen() {
  const { user } = useAuth();
  const [earned, setEarned]         = useState<Achievement[]>([]);
  const [definitions, setDefinitions] = useState<Definition[]>([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [earnedData, defsData] = await Promise.all([
        Users.getAchievements(user?._id ?? ''),
        Users.getAchievementDefinitions(),
      ]);
      const earnedList = Array.isArray(earnedData) ? earnedData : [];
      const defList    = Array.isArray(defsData) ? defsData : [];

      const earnedIds = new Set(earnedList.map((a: Achievement) => a.id));
      const locked = defList
        .filter((d: Definition) => !earnedIds.has(d.id))
        .map((d: Definition) => ({ ...d, locked: true }));

      setEarned(earnedList);
      setDefinitions([...earnedList, ...locked]);
    } catch {
      Alert.alert('Error', 'Could not load achievements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?._id]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const renderItem = ({ item }: { item: Achievement & { locked?: boolean } }) => (
    <View style={[styles.card, item.locked && styles.cardLocked]}>
      <View style={[styles.iconBox, item.locked && styles.iconBoxLocked]}>
        <Text style={styles.iconText}>{item.locked ? '🔒' : (item.icon ?? '🏆')}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={[styles.title, item.locked && styles.titleLocked]}>{item.title}</Text>
        <Text style={styles.desc}>{item.description}</Text>
        {!item.locked && item.earnedAt && (
          <Text style={styles.date}>
            Earned {new Date(item.earnedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Text>
        )}
      </View>
      {!item.locked && (
        <View style={styles.check}>
          <Text style={{ fontSize: 16 }}>✅</Text>
        </View>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Achievements', headerShown: true }} />
      <View style={styles.container}>
        {!loading && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              {earned.length} / {definitions.length} unlocked
            </Text>
          </View>
        )}
        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : (
          <FlatList
            data={definitions}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <Text style={styles.empty}>No achievements available yet.</Text>
            }
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  loader: { marginTop: 80 },
  banner: { backgroundColor: Colors.earth, paddingVertical: 12, alignItems: 'center' },
  bannerText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.white },
  list: { padding: 16, gap: 10 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardLocked: { opacity: 0.55 },
  iconBox: { width: 48, height: 48, borderRadius: 12, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  iconBoxLocked: { backgroundColor: Colors.bgMist },
  iconText: { fontSize: 24 },
  cardBody: { flex: 1 },
  title: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textDark, marginBottom: 2 },
  titleLocked: { color: Colors.textMuted },
  desc: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 17 },
  date: { fontSize: 11, fontFamily: Fonts.body, color: Colors.primary, marginTop: 4 },
  check: { width: 28, alignItems: 'center' },
  empty: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', marginTop: 60 },
});
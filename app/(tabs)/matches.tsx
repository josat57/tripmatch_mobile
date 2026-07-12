import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Buddy, Users } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

const DISMISSED_KEY = '@tripmatch_dismissed_matches';

interface Match {
  _id: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  bio?: string;
  travelPreferences?: { style?: string[] };
  compatibilityScore?: number;
  matchReasons?: string[];
}

export default function MatchesScreen() {
  const [matches, setMatches]     = useState<Match[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [sending, setSending]     = useState<Set<string>>(new Set());

  // Ref mirrors the state so async callbacks always see the current dismissed set
  // without relying on the React state update being flushed first.
  const dismissedRef = useRef<Set<string>>(new Set());

  const loadDismissed = useCallback(async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      if (raw) {
        const ids = new Set(JSON.parse(raw) as string[]);
        dismissedRef.current = ids;
        setDismissed(ids);
        return ids;
      }
    } catch {}
    return new Set();
  }, []);

  const saveDismissed = useCallback(async (next: Set<string>) => {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {}
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      dismissedRef.current = next;
      saveDismissed(next);
      return next;
    });
  }, [saveDismissed]);

  const loadMatches = useCallback(async (currentDismissed: Set<string>, isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await Buddy.getSuggestions(30);
      const d = data as Match[] | { recommendations?: Match[] };
      const all = Array.isArray(d) ? d : (d as { recommendations?: Match[] }).recommendations ?? [];
      // Filter out dismissed IDs immediately using the ref (avoids stale closure)
      setMatches(all.filter((m) => !currentDismissed.has(m._id)));
    } catch {
      if (!isRefresh) Alert.alert('Error', 'Could not load matches. Try again later.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDismissed().then((ids) => loadMatches(ids));
  }, [loadDismissed, loadMatches]);

  const handleRefresh = useCallback(() => {
    loadMatches(dismissedRef.current, true);
  }, [loadMatches]);

  const handleBlockReport = useCallback((targetUserId: string, name: string) => {
    Alert.alert(`Report or block ${name}`, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: async () => {
          try {
            await Users.block(targetUserId);
            dismiss(targetUserId);
            Alert.alert('Blocked', `${name} has been blocked.`);
          } catch {
            Alert.alert('Error', 'Could not block user.');
          }
        },
      },
      {
        text: 'Report user',
        onPress: () => {
          Alert.prompt('Report', 'Briefly describe the issue:', async (reason) => {
            if (!reason) return;
            try {
              await Users.report(targetUserId, reason);
              Alert.alert('Reported', 'Thank you. Our team will review this.');
            } catch {
              Alert.alert('Error', 'Could not submit report.');
            }
          });
        },
      },
    ]);
  }, [dismiss]);

  const sendRequest = async (userId: string) => {
    setSending((p) => new Set(p).add(userId));
    try {
      await Buddy.sendRequest(userId);
      dismiss(userId);
      Alert.alert('Request sent!', "They'll be notified of your connection request.");
    } catch {
      Alert.alert('Error', 'Could not send request. Please try again.');
    } finally {
      setSending((p) => { const n = new Set(p); n.delete(userId); return n; });
    }
  };

  // Visible list: items that weren't dismissed after the fetch (handles dismiss during session)
  const visible = matches.filter((m) => !dismissed.has(m._id));

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Finding your matches…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Your Matches</Text>
        <Text style={styles.sub}>Travellers matched to your style</Text>
      </View>

      <FlatList
        data={visible}
        keyExtractor={(m) => m._id}
        contentContainerStyle={visible.length === 0 ? styles.emptyContainer : styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="people-outline" size={52} color={Colors.border} />
            <Text style={styles.emptyTitle}>No matches yet</Text>
            <Text style={styles.emptySub}>
              Complete your travel preferences to get personalised recommendations.
            </Text>
          </View>
        }
        renderItem={({ item: match }) => (
          <View style={styles.card}>
            <View style={styles.avatarRow}>
              {match.profileImage ? (
                <Image source={{ uri: match.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {match.firstName?.[0]}{match.lastName?.[0]}
                  </Text>
                </View>
              )}
              <View style={styles.nameBlock}>
                <Text style={styles.name}>{match.firstName} {match.lastName}</Text>
                {match.compatibilityScore != null && (
                  <View style={styles.scoreBadge}>
                    <Text style={styles.scoreText}>{match.compatibilityScore}% match</Text>
                  </View>
                )}
              </View>
            </View>

            {match.bio ? (
              <Text style={styles.bio} numberOfLines={2}>{match.bio}</Text>
            ) : null}

            {(match.matchReasons ?? match.travelPreferences?.style ?? []).length > 0 && (
              <View style={styles.chips}>
                {(match.matchReasons ?? match.travelPreferences?.style ?? []).slice(0, 3).map((r) => (
                  <View key={r} style={styles.chip}>
                    <Text style={styles.chipText}>{r}</Text>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.connectBtn}
                onPress={() => sendRequest(match._id)}
                disabled={sending.has(match._id)}
              >
                {sending.has(match._id) ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.connectBtnText}>Connect</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.messageBtn}
                onPress={() => router.push({
                  pathname: '/messages/[id]',
                  params: { id: match._id, name: `${match.firstName} ${match.lastName}`, avatar: match.profileImage ?? '' },
                })}
                accessibilityLabel={`Message ${match.firstName}`}
              >
                <Ionicons name="chatbubble-outline" size={16} color={Colors.textBody} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.passBtn}
                onPress={() => dismiss(match._id)}
              >
                <Text style={styles.passBtnText}>Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.moreBtn}
                onPress={() => handleBlockReport(match._id, `${match.firstName} ${match.lastName}`)}
                accessibilityLabel={`Report or block ${match.firstName}`}
              >
                <Ionicons name="ellipsis-horizontal" size={16} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  topBar: {
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
  loadingText: { marginTop: 12, fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  list: { padding: 16, gap: 14 },
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, marginRight: 12 },
  avatarPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 12,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  avatarInitials: { fontSize: 18, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  nameBlock: { flex: 1 },
  name: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  scoreBadge: {
    marginTop: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.mist,
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  scoreText: { fontSize: 11, fontFamily: Fonts.bodyBold, color: Colors.forest },
  bio: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 10, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  chip: {
    backgroundColor: Colors.mist,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  chipText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  actions: { flexDirection: 'row', gap: 8 },
  connectBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  connectBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
  messageBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 14,
    alignItems: 'center',
  },
  passBtnText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
  moreBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
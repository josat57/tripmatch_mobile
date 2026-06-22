import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Buddy } from '../../src/api/api';
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
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [sending, setSending]     = useState<Set<string>>(new Set());

  const loadDismissed = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_KEY);
      if (raw) setDismissed(new Set(JSON.parse(raw) as string[]));
    } catch {}
  }, []);

  const saveDismissed = useCallback(async (next: Set<string>) => {
    try {
      await AsyncStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
    } catch {}
  }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev).add(id);
      saveDismissed(next);
      return next;
    });
  }, [saveDismissed]);

  useEffect(() => {
    loadDismissed().then(() => {
      Buddy.getSuggestions(30)
        .then((data) => {
          const d = data as Match[] | { recommendations?: Match[] };
          setMatches(Array.isArray(d) ? d : (d as { recommendations?: Match[] }).recommendations ?? []);
        })
        .catch(() => Alert.alert('Error', 'Could not load matches. Try again later.'))
        .finally(() => setLoading(false));
    });
  }, [loadDismissed]);

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

      {visible.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No matches yet</Text>
          <Text style={styles.emptySub}>
            Complete your travel preferences to get personalised recommendations.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visible.map((match) => (
            <View key={match._id} style={styles.card}>
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
                >
                  <Ionicons name="chatbubble-outline" size={16} color={Colors.textBody} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.passBtn}
                  onPress={() => dismiss(match._id)}
                >
                  <Text style={styles.passBtnText}>Pass</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
});

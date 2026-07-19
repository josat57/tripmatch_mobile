import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Buddy } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

interface BuddyRequest {
  _id: string;
  sender: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
    bio?: string;
    travelPreferences?: { style?: string[] };
  };
  message?: string;
  createdAt: string;
}

export default function BuddyRequestsScreen() {
  const [requests, setRequests]   = useState<BuddyRequest[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing]       = useState<Set<string>>(new Set());

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await Buddy.getRequests();
      const list = data as BuddyRequest[] | { requests?: BuddyRequest[] };
      setRequests(Array.isArray(list) ? list : (list as { requests?: BuddyRequest[] }).requests ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (requestId: string, status: 'accepted' | 'declined') => {
    setActing((p) => new Set(p).add(requestId));
    try {
      await Buddy.respondToRequest(requestId, status);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
      if (status === 'accepted') {
        Alert.alert('Connected!', "You're now travel buddies.");
      }
    } catch {
      Alert.alert('Error', `Could not ${status === 'accepted' ? 'accept' : 'decline'} request.`);
    } finally {
      setActing((p) => { const n = new Set(p); n.delete(requestId); return n; });
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <>
      <Stack.Screen options={{ title: 'Buddy Requests', headerShown: true }} />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : requests.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="person-add-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySub}>When someone sends you a buddy request, it'll appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
          }
        >
          {requests.map((req) => (
            <View key={req._id} style={styles.card}>
              <View style={styles.topRow}>
                {req.sender.profileImage ? (
                  <Image source={{ uri: req.sender.profileImage }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitials}>
                      {req.sender.firstName?.[0]}{req.sender.lastName?.[0]}
                    </Text>
                  </View>
                )}
                <View style={styles.nameBlock}>
                  <Text style={styles.name}>{req.sender.firstName} {req.sender.lastName}</Text>
                  <Text style={styles.date}>{formatDate(req.createdAt)}</Text>
                </View>
              </View>

              {req.sender.bio ? (
                <Text style={styles.bio} numberOfLines={2}>{req.sender.bio}</Text>
              ) : null}

              {(req.sender.travelPreferences?.style ?? []).length > 0 && (
                <View style={styles.chips}>
                  {(req.sender.travelPreferences?.style ?? []).slice(0, 3).map((s) => (
                    <View key={s} style={styles.chip}>
                      <Text style={styles.chipText}>{s}</Text>
                    </View>
                  ))}
                </View>
              )}

              {req.message ? (
                <View style={styles.messageBox}>
                  <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
                  <Text style={styles.messageText}>{req.message}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.acceptBtn}
                  disabled={acting.has(req._id)}
                  onPress={() => respond(req._id, 'accepted')}
                >
                  {acting.has(req._id) ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color={Colors.white} />
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineBtn}
                  disabled={acting.has(req._id)}
                  onPress={() => respond(req._id, 'declined')}
                >
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  card: {
    backgroundColor: Colors.bgCard,
    margin: 12,
    marginBottom: 0,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
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
  date: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 2 },
  bio: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 10, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  chip: {
    backgroundColor: Colors.mist,
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  chipText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  messageBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: Colors.mist,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  messageText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  acceptBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
  declineBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  declineBtnText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
});

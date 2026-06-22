import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips, Users } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

type Tab = 'info' | 'members' | 'requests';

interface TripDetail {
  _id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  startDate?: string;
  endDate?: string;
  budget?: { amount?: number; currency?: string };
  capacity?: { max?: number };
  participants?: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  }>;
  organizer?: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage?: string;
  };
  locations?: { address?: { city?: string; country?: string; street?: string } };
  boost?: { active?: boolean };
  travelStyle?: string[];
}

interface JoinRequest {
  _id: string;
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  message?: string;
  status: string;
}

export default function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();

  const [trip, setTrip]             = useState<TripDetail | null>(null);
  const [requests, setRequests]     = useState<JoinRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<Tab>('info');
  const [joining, setJoining]       = useState(false);
  const [acting, setActing]         = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await Trips.getById(id);
      setTrip((data as { trip?: TripDetail }).trip ?? data as TripDetail);
    } catch {
      Alert.alert('Error', 'Could not load trip details.');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadRequests = useCallback(async () => {
    if (!id) return;
    try {
      const data = await Trips.getJoinRequests(id);
      const list = data as JoinRequest[] | { requests?: JoinRequest[] };
      setRequests(Array.isArray(list) ? list : (list as { requests?: JoinRequest[] }).requests ?? []);
    } catch {}
  }, [id]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'requests') loadRequests();
  }, [tab, loadRequests]);

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    try {
      await Trips.requestToJoin(id);
      Alert.alert('Request sent!', 'The organiser will review your join request.');
      load();
    } catch {
      Alert.alert('Error', 'Could not send join request.');
    } finally {
      setJoining(false);
    }
  };

  const handleRequest = async (requestId: string, action: 'approve' | 'reject') => {
    if (!id) return;
    setActing((p) => new Set(p).add(requestId));
    try {
      if (action === 'approve') await Trips.approveRequest(id, requestId);
      else await Trips.rejectRequest(id, requestId);
      setRequests((prev) => prev.filter((r) => r._id !== requestId));
    } catch {
      Alert.alert('Error', `Could not ${action} request.`);
    } finally {
      setActing((p) => { const n = new Set(p); n.delete(requestId); return n; });
    }
  };

  const handleBlockReport = (targetUserId: string, name: string) => {
    Alert.alert(`Report or block ${name}`, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: async () => {
          try {
            await Users.block(targetUserId);
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
  };

  if (loading || !trip) {
    return (
      <>
        <Stack.Screen options={{ title: 'Trip Details', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  const isOrganizer = trip.organizer?._id === user?._id;
  const isParticipant = (trip.participants ?? []).some((p) => p._id === user?._id);

  const start = trip.startDate
    ? new Date(trip.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const end = trip.endDate
    ? new Date(trip.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;
  const city    = trip.locations?.address?.city ?? '';
  const country = trip.locations?.address?.country ?? '';
  const destination = [city, country].filter(Boolean).join(', ');

  const TABS: { key: Tab; label: string }[] = [
    { key: 'info',     label: 'Info' },
    { key: 'members',  label: `Members (${(trip.participants ?? []).length})` },
    ...(isOrganizer ? [{ key: 'requests' as Tab, label: `Requests (${requests.length})` }] : []),
  ];

  return (
    <>
      <Stack.Screen options={{ title: trip.title, headerShown: true }} />
      <View style={styles.container}>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
              onPress={() => setTab(t.key)}
            >
              <Text style={[styles.tabBtnText, tab === t.key && styles.tabBtnTextActive]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {/* ── INFO ── */}
          {tab === 'info' && (
            <>
              {trip.boost?.active && (
                <View style={styles.featuredBadge}>
                  <Text style={styles.featuredText}>⭐ Featured Trip</Text>
                </View>
              )}

              <Text style={styles.tripTitle}>{trip.title}</Text>

              {destination ? (
                <View style={styles.metaRow}>
                  <Ionicons name="location-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{destination}</Text>
                </View>
              ) : null}

              {start && (
                <View style={styles.metaRow}>
                  <Ionicons name="calendar-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>{start}{end && end !== start ? ` → ${end}` : ''}</Text>
                </View>
              )}

              {trip.budget?.amount != null && (
                <View style={styles.metaRow}>
                  <Ionicons name="cash-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    ${trip.budget.amount.toLocaleString()} {trip.budget.currency ?? 'USD'} per person
                  </Text>
                </View>
              )}

              {trip.capacity?.max != null && (
                <View style={styles.metaRow}>
                  <Ionicons name="people-outline" size={15} color={Colors.textMuted} />
                  <Text style={styles.metaText}>
                    {(trip.participants ?? []).length}/{trip.capacity.max} spots filled
                  </Text>
                </View>
              )}

              {trip.description ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>About this trip</Text>
                  <Text style={styles.body}>{trip.description}</Text>
                </View>
              ) : null}

              {(trip.travelStyle ?? []).length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Travel style</Text>
                  <View style={styles.chips}>
                    {(trip.travelStyle ?? []).map((s) => (
                      <View key={s} style={styles.chip}>
                        <Text style={styles.chipText}>{s}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {trip.organizer && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Organised by</Text>
                  <View style={styles.personRow}>
                    {trip.organizer.profileImage ? (
                      <Image source={{ uri: trip.organizer.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>
                          {trip.organizer.firstName?.[0]}{trip.organizer.lastName?.[0]}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.personName}>
                      {trip.organizer.firstName} {trip.organizer.lastName}
                    </Text>
                    {!isOrganizer && (
                      <TouchableOpacity
                        onPress={() => router.push({
                          pathname: '/messages/[id]',
                          params: {
                            id: trip.organizer!._id,
                            name: `${trip.organizer!.firstName} ${trip.organizer!.lastName}`,
                            avatar: trip.organizer!.profileImage ?? '',
                          },
                        })}
                      >
                        <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {!isOrganizer && !isParticipant && (
                <TouchableOpacity style={styles.joinBtn} onPress={handleJoin} disabled={joining}>
                  {joining ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Ionicons name="add-circle-outline" size={18} color={Colors.white} />
                      <Text style={styles.joinBtnText}>Request to Join</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {isParticipant && (
                <View style={styles.joinedBadge}>
                  <Ionicons name="checkmark-circle" size={18} color={Colors.forest} />
                  <Text style={styles.joinedText}>You are a member of this trip</Text>
                </View>
              )}

              {isOrganizer && (
                <View style={styles.joinedBadge}>
                  <Ionicons name="star-outline" size={18} color={Colors.primary} />
                  <Text style={[styles.joinedText, { color: Colors.primary }]}>You organised this trip</Text>
                </View>
              )}
            </>
          )}

          {/* ── MEMBERS ── */}
          {tab === 'members' && (
            <>
              {(trip.participants ?? []).length === 0 ? (
                <View style={styles.emptyCenter}>
                  <Ionicons name="people-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No members yet</Text>
                </View>
              ) : (
                (trip.participants ?? []).map((p) => (
                  <View key={p._id} style={styles.personCard}>
                    {p.profileImage ? (
                      <Image source={{ uri: p.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>{p.firstName?.[0]}{p.lastName?.[0]}</Text>
                      </View>
                    )}
                    <Text style={styles.personName}>{p.firstName} {p.lastName}</Text>
                    {p._id !== user?._id && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          onPress={() => router.push({
                            pathname: '/messages/[id]',
                            params: { id: p._id, name: `${p.firstName} ${p.lastName}`, avatar: p.profileImage ?? '' },
                          })}
                        >
                          <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleBlockReport(p._id, `${p.firstName} ${p.lastName}`)}>
                          <Ionicons name="ellipsis-horizontal" size={20} color={Colors.textLight} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {/* ── REQUESTS (organizer only) ── */}
          {tab === 'requests' && (
            <>
              {requests.length === 0 ? (
                <View style={styles.emptyCenter}>
                  <Ionicons name="mail-open-outline" size={40} color={Colors.border} />
                  <Text style={styles.emptyText}>No pending requests</Text>
                </View>
              ) : (
                requests.map((req) => (
                  <View key={req._id} style={styles.requestCard}>
                    {req.profileImage ? (
                      <Image source={{ uri: req.profileImage }} style={styles.personAvatar} />
                    ) : (
                      <View style={styles.personAvatarPlaceholder}>
                        <Text style={styles.personInitials}>{req.firstName?.[0]}{req.lastName?.[0]}</Text>
                      </View>
                    )}
                    <View style={styles.requestInfo}>
                      <Text style={styles.personName}>{req.firstName} {req.lastName}</Text>
                      {req.message ? (
                        <Text style={styles.requestMsg} numberOfLines={2}>{req.message}</Text>
                      ) : null}
                      <View style={styles.requestActions}>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          disabled={acting.has(req._id)}
                          onPress={() => handleRequest(req._id, 'approve')}
                        >
                          {acting.has(req._id) ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                          ) : (
                            <Text style={styles.approveBtnText}>Approve</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          disabled={acting.has(req._id)}
                          onPress={() => handleRequest(req._id, 'reject')}
                        >
                          <Text style={styles.rejectBtnText}>Decline</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.bgCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 13,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: Colors.primary },
  tabBtnText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textLight },
  tabBtnTextActive: { color: Colors.primary },
  content: { padding: 20, gap: 4 },
  featuredBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  featuredText: { fontSize: 11, fontFamily: Fonts.bodyBold, color: Colors.white },
  tripTitle: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 14, lineHeight: 30 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  metaText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 8 },
  body: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 22 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  chipText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  personAvatar: { width: 44, height: 44, borderRadius: 22 },
  personAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  personInitials: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  personName: { flex: 1, fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  memberActions: { flexDirection: 'row', gap: 12 },
  requestCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  requestInfo: { flex: 1 },
  requestMsg: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2, marginBottom: 10, lineHeight: 18 },
  requestActions: { flexDirection: 'row', gap: 8 },
  approveBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  approveBtnText: { fontSize: 13, fontFamily: Fonts.bodyBold, color: Colors.white },
  rejectBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  rejectBtnText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
  joinBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  joinBtnText: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.white },
  joinedBadge: {
    marginTop: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.mist,
    borderRadius: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  joinedText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  emptyCenter: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textLight },
});

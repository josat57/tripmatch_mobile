import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Notifications } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';
import ProfileCompletionModal from '../../src/components/ProfileCompletionModal';
import { useProfileCompletion } from '../../src/hooks/useProfileCompletion';

const QUICK_ACTIONS = [
  { label: 'Find Matches',   icon: 'people-outline'      as const, route: '/(tabs)/matches'  as const },
  { label: 'Browse Trips',   icon: 'map-outline'         as const, route: '/(tabs)/trips'    as const },
  { label: 'Messages',       icon: 'chatbubbles-outline' as const, route: '/(tabs)/messages' as const },
  { label: 'Create a Trip',  icon: 'add-circle-outline'  as const, route: '/trips/create'    as const },
  { label: 'Activity Feed',  icon: 'globe-outline'       as const, route: '/feed'            as const },
  { label: 'Plan with AI',   icon: 'sparkles-outline'    as const, route: '/ai-planner'     as const },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const { isProfileComplete, profileCompletionPercentage } = useProfileCompletion();

  const loadUnread = useCallback(async () => {
    try {
      const data = await Notifications.getUnreadCount();
      setUnreadCount(data?.count ?? 0);
    } catch {}
  }, []);

  useEffect(() => { loadUnread(); }, [loadUnread]);

  // Show profile completion modal if profile is incomplete
  useEffect(() => {
    if (user && !isProfileComplete) {
      setShowProfileCompletion(true);
    }
  }, [user, isProfileComplete]);

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.firstName ?? 'Traveler'} ✈️</Text>
            <Text style={styles.sub}>Ready to find your next travel companion?</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={() => router.push('/notifications')}>
            <Ionicons name="notifications-outline" size={24} color={Colors.textBody} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Profile Completion Banner */}
        {!isProfileComplete && profileCompletionPercentage < 100 && (
          <View style={styles.completionBanner}>
            <View style={styles.completionHeader}>
              <Text style={styles.completionTitle}>Complete your profile</Text>
              <Text style={styles.completionPercent}>{profileCompletionPercentage}%</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${profileCompletionPercentage}%` }]} />
            </View>
            <Text style={styles.completionHint}>
              Unlock better matches and build trust in the community
            </Text>
          </View>
        )}

        <View style={styles.card}>
        <Text style={styles.cardTitle}>Find your perfect match</Text>
        <Text style={styles.cardBody}>
          We've found travellers who share your style and budget. Discover them now.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/(tabs)/matches')}>
          <Text style={styles.primaryBtnText}>View Matches</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Quick actions</Text>
      <View style={styles.grid}>
        {QUICK_ACTIONS.map((a) => (
          <TouchableOpacity key={a.label} style={styles.actionCard} onPress={() => router.push(a.route as never)}>
            <Ionicons name={a.icon} size={28} color={Colors.primary} />
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {!user?.isEmailVerified && (
        <View style={styles.verifyBanner}>
          <Ionicons name="warning-outline" size={18} color={Colors.error} />
          <Text style={styles.verifyText}>
            Your email is not verified. Go to{' '}
            <Text style={styles.verifyLink} onPress={() => router.push('/(tabs)/profile')}>
              Profile
            </Text>{' '}
            to resend the verification email.
          </Text>
        </View>
      )}
      </ScrollView>

      {/* Profile Completion Modal */}
      <ProfileCompletionModal
        visible={showProfileCompletion}
        onComplete={() => {
          setShowProfileCompletion(false);
          loadUnread();
        }}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  content: { padding: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { fontSize: 26, fontFamily: Fonts.headingXL, color: Colors.textDark },
  sub: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 4 },
  bellBtn: { position: 'relative', padding: 4, marginTop: 4 },
  badge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: Colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, fontFamily: Fonts.bodyBold, color: Colors.white },
  card: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  cardTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.white, marginBottom: 6 },
  cardBody: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.white,
    lineHeight: 20,
    marginBottom: 16,
    opacity: 0.9,
  },
  primaryBtn: {
    backgroundColor: Colors.earth,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: '47%',
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  actionLabel: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, textAlign: 'center' },
  verifyBanner: {
    marginTop: 24,
    backgroundColor: Colors.errorBg,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderWidth: 1,
    borderColor: Colors.errorBorder,
  },
  verifyText: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: Colors.error, lineHeight: 18 },
  verifyLink: { fontFamily: Fonts.bodyBold, textDecorationLine: 'underline' },
  completionBanner: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  completionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  completionTitle: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  completionPercent: { fontSize: 14, fontFamily: Fonts.heading, color: Colors.primary },
  progressBar: { height: 6, backgroundColor: Colors.border, borderRadius: 3, marginBottom: 10, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 3 },
  completionHint: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },
});

import { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';

import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../src/contexts/AuthContext';
import { Auth } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  label: string;
  icon: IoniconName;
  onPress: () => void;
  badge?: number;
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [signingOut, setSigningOut]         = useState(false);
  const [resending, setResending]           = useState(false);

  const handleLogout = async () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          setSigningOut(true);
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await Auth.resendVerification();
      Alert.alert('Email sent', 'A new verification link has been sent to your email address.');
    } catch {
      Alert.alert('Error', 'Could not send verification email. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const travelStyles = (): string[] => {
    const tp = user?.travelPreferences as { style?: string[] } | undefined;
    return tp?.style ?? [];
  };

  const MENU: MenuItem[] = [
    { label: 'Edit Profile',       icon: 'person-outline',              onPress: () => router.push('/profile/edit') },
    { label: 'TripMatch Pro',      icon: 'star-outline',                onPress: () => router.push('/profile/pro-subscription' as never) },
    { label: 'My Trips',           icon: 'map-outline',                 onPress: () => router.push('/profile/my-trips' as never) },
    { label: 'Saved Trips',        icon: 'heart-outline',               onPress: () => router.push('/profile/saved-trips' as never) },
    { label: 'Verified Badge',     icon: 'shield-checkmark-outline',    onPress: () => router.push('/profile/badge' as never) },
    { label: 'Bucket List',        icon: 'bookmark-outline',            onPress: () => router.push('/profile/bucket-list' as never) },
    { label: 'Travel DNA',         icon: 'analytics-outline',           onPress: () => router.push('/profile/travel-dna' as never) },
    { label: 'Achievements',       icon: 'trophy-outline',              onPress: () => router.push('/profile/achievements' as never) },
    { label: 'Buddy Requests',     icon: 'people-outline',              onPress: () => router.push('/buddies/requests') },
    { label: 'Notifications',      icon: 'notifications-outline',       onPress: () => router.push('/notifications') },
    { label: 'Messages',           icon: 'chatbubbles-outline',         onPress: () => router.push('/(tabs)/messages') },
    { label: 'Create a Trip',      icon: 'add-circle-outline',          onPress: () => router.push('/trips/create') },
    { label: 'Settings',           icon: 'settings-outline',            onPress: () => router.push('/profile/settings' as never) },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/profile/edit')} style={styles.avatarWrap} accessibilityLabel="Edit profile photo">
          {user?.profileImage ? (
            <Image source={{ uri: user.profileImage }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </Text>
            </View>
          )}
          <View style={styles.editBadge}>
            <Ionicons name="camera" size={12} color={Colors.white} />
          </View>
        </TouchableOpacity>

        <Text style={styles.name}>{user?.firstName} {user?.lastName}</Text>
        <Text style={styles.email}>{user?.email}</Text>

        {!user?.isEmailVerified && (
          <View style={styles.verifyBox}>
            <View style={styles.unverifiedBadge}>
              <Ionicons name="alert-circle" size={13} color={Colors.error} />
              <Text style={styles.unverifiedText}>Email not verified</Text>
            </View>
            <TouchableOpacity
              style={styles.resendBtn}
              onPress={handleResendVerification}
              disabled={resending}
            >
              {resending ? (
                <ActivityIndicator size="small" color={Colors.primaryDark} />
              ) : (
                <Text style={styles.resendBtnText}>Resend verification email</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {travelStyles().length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Travel style</Text>
          <View style={styles.chipRow}>
            {travelStyles().map((s) => (
              <View key={s} style={styles.chip}>
                <Text style={styles.chipText}>{s}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {user?.bio ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bio</Text>
          <Text style={styles.bioText}>{user.bio}</Text>
        </View>
      ) : null}

      <View style={styles.menu}>
        {MENU.map(({ label, icon, onPress, badge }, i) => (
          <TouchableOpacity
            key={label}
            style={[styles.menuItem, i === MENU.length - 1 && styles.menuItemLast]}
            onPress={onPress}
          >
            <Ionicons name={icon} size={20} color={Colors.textMuted} style={styles.menuIcon} />
            <Text style={styles.menuLabel}>{label}</Text>
            {badge != null && badge > 0 && (
              <View style={styles.menuBadge}>
                <Text style={styles.menuBadgeText}>{badge}</Text>
              </View>
            )}
            <Ionicons name="chevron-forward" size={18} color={Colors.border} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={handleLogout} disabled={signingOut}>
        {signingOut ? (
          <ActivityIndicator color={Colors.error} />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Sign out</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>TripMatch v1.0 · Mobile</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  content: { padding: 20, paddingTop: 56 },
  header: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { marginBottom: 12, position: 'relative' },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: { fontSize: 30, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  name: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark },
  email: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 4 },
  verifyBox: { alignItems: 'center', marginTop: 10, gap: 8 },
  unverifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.errorBg,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  unverifiedText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.error },
  resendBtn: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.primaryDark,
  },
  resendBtnText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.primaryDark },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    backgroundColor: Colors.bgCard,
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  chipText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  bioText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 21 },
  menu: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  menuItemLast: { borderBottomWidth: 0 },
  menuIcon: { marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textBody },
  menuBadge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginRight: 8,
  },
  menuBadgeText: { fontSize: 11, fontFamily: Fonts.bodyBold, color: Colors.white },
  signOutBtn: {
    borderWidth: 1.5,
    borderColor: Colors.errorBorder,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: Colors.errorBg,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  signOutText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.error },
  version: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, textAlign: 'center' },
});

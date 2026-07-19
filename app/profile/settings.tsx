import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Auth, Users, Security } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

type Section = 'main' | 'password' | 'notifications' | 'privacy' | 'twofa' | 'danger';

export default function SettingsScreen() {
  const { logout } = useAuth();
  const [section, setSection] = useState<Section>('main');

  // Change password
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass]         = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [passLoading, setPassLoading] = useState(false);

  // Notification prefs
  const [notifPrefs, setNotifPrefs] = useState({
    buddy_requests: true, trip_updates: true, messages: true, promotions: false,
  });
  const [notifLoading, setNotifLoading] = useState(false);

  // Privacy
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public', showEmail: false, showLocation: false,
  });
  const [privacyLoading, setPrivacyLoading] = useState(false);

  // 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(false);
  const [twoFAMethod, setTwoFAMethod] = useState<'authenticator' | 'sms'>('authenticator');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFADisablePass, setTwoFADisablePass] = useState('');
  const [showTwoFAPass, setShowTwoFAPass] = useState(false);

  const handleChangePassword = async () => {
    if (!currentPass || !newPass) return Alert.alert('Required', 'Fill in all password fields.');
    if (newPass.length < 8) return Alert.alert('Too short', 'New password must be at least 8 characters.');
    if (newPass !== confirmPass) return Alert.alert('Mismatch', 'New passwords do not match.');
    setPassLoading(true);
    try {
      await Auth.changePassword(currentPass, newPass);
      Alert.alert('Success', 'Password updated. Please sign in again.', [
        { text: 'OK', onPress: () => logout() },
      ]);
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not update password.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleSaveNotifications = async () => {
    setNotifLoading(true);
    try {
      await Users.updateNotificationPreferences(notifPrefs);
      Alert.alert('Saved', 'Notification preferences updated.');
    } catch {
      Alert.alert('Error', 'Could not save preferences.');
    } finally {
      setNotifLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setPrivacyLoading(true);
    try {
      await Users.updatePrivacySettings(privacy);
      Alert.alert('Saved', 'Privacy settings updated.');
    } catch {
      Alert.alert('Error', 'Could not save privacy settings.');
    } finally {
      setPrivacyLoading(false);
    }
  };

  const handleEnable2FA = async () => {
    setTwoFALoading(true);
    try {
      await Security.enable2FA(twoFAMethod);
      setTwoFAEnabled(true);
      Alert.alert('Success', `2FA enabled via ${twoFAMethod === 'authenticator' ? 'Authenticator' : 'SMS'}.`);
    } catch (err) {
      Alert.alert('Error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not enable 2FA.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!twoFADisablePass) return Alert.alert('Required', 'Enter your password to disable 2FA.');
    setTwoFALoading(true);
    try {
      await Security.disable2FA(twoFADisablePass);
      setTwoFAEnabled(false);
      setTwoFADisablePass('');
      Alert.alert('Success', '2FA disabled.');
    } catch (err) {
      Alert.alert('Error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not disable 2FA.');
    } finally {
      setTwoFALoading(false);
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account',
      'This is permanent and cannot be undone. All your trips, messages, and data will be erased.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete my account', style: 'destructive',
          onPress: async () => {
            try {
              await Users.deleteAccount();
              await logout();
            } catch {
              Alert.alert('Error', 'Could not delete account. Contact support.');
            }
          },
        },
      ]
    );
  };

  if (section === 'password') {
    return (
      <>
        <Stack.Screen options={{ title: 'Change Password', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => setSection('main')} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={22} color={Colors.textDark} /></TouchableOpacity>
        )}} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            {[
              { label: 'Current password', val: currentPass, set: setCurrentPass, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
              { label: 'New password',     val: newPass,     set: setNewPass,     show: showNew,     toggle: () => setShowNew(p => !p) },
              { label: 'Confirm new password', val: confirmPass, set: setConfirmPass, show: showNew, toggle: () => setShowNew(p => !p) },
            ].map(({ label, val, set, show, toggle }) => (
              <View style={styles.field} key={label}>
                <Text style={styles.label}>{label}</Text>
                <View style={styles.inputWrap}>
                  <TextInput style={styles.inputWithIcon} value={val} onChangeText={set}
                    secureTextEntry={!show} placeholder="••••••••" placeholderTextColor={Colors.textLight} />
                  <TouchableOpacity onPress={toggle} style={styles.eyeBtn} accessibilityLabel={show ? 'Hide password' : 'Show password'}>
                    <Ionicons name={show ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
            <TouchableOpacity style={styles.saveBtn} onPress={handleChangePassword} disabled={passLoading}>
              {passLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Update password</Text>}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  if (section === 'notifications') {
    return (
      <>
        <Stack.Screen options={{ title: 'Notifications', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => setSection('main')} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={22} color={Colors.textDark} /></TouchableOpacity>
        )}} />
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {(Object.entries(notifPrefs) as [keyof typeof notifPrefs, boolean][]).map(([key, value]) => (
            <View key={key} style={styles.switchRow}>
              <Text style={styles.switchLabel}>{key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
              <Switch value={value} onValueChange={(v) => setNotifPrefs(p => ({ ...p, [key]: v }))}
                trackColor={{ false: Colors.border, true: Colors.primary }} />
            </View>
          ))}
          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveNotifications} disabled={notifLoading}>
            {notifLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save preferences</Text>}
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  }

  if (section === 'privacy') {
    return (
      <>
        <Stack.Screen options={{ title: 'Privacy', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => setSection('main')} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={22} color={Colors.textDark} /></TouchableOpacity>
        )}} />
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Text style={styles.sectionLabel}>Profile visibility</Text>
          {(['public', 'buddies', 'private'] as const).map((opt) => (
            <TouchableOpacity key={opt} style={styles.radioRow} onPress={() => setPrivacy(p => ({ ...p, profileVisibility: opt }))}>
              <View style={[styles.radio, privacy.profileVisibility === opt && styles.radioActive]} />
              <Text style={styles.radioLabel}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show email to others</Text>
            <Switch value={privacy.showEmail} onValueChange={(v) => setPrivacy(p => ({ ...p, showEmail: v }))}
              trackColor={{ false: Colors.border, true: Colors.primary }} />
          </View>
          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>Show location on profile</Text>
            <Switch value={privacy.showLocation} onValueChange={(v) => setPrivacy(p => ({ ...p, showLocation: v }))}
              trackColor={{ false: Colors.border, true: Colors.primary }} />
          </View>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSavePrivacy} disabled={privacyLoading}>
            {privacyLoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Save settings</Text>}
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  }

  if (section === 'twofa') {
    return (
      <>
        <Stack.Screen options={{ title: 'Two-Factor Authentication', headerShown: true, headerLeft: () => (
          <TouchableOpacity onPress={() => setSection('main')} accessibilityLabel="Go back"><Ionicons name="arrow-back" size={22} color={Colors.textDark} /></TouchableOpacity>
        )}} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.container} contentContainerStyle={styles.content}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusBox}>
              <Ionicons name={twoFAEnabled ? 'shield-checkmark' : 'shield-outline'} size={24} color={twoFAEnabled ? Colors.forest : Colors.textMuted} />
              <Text style={styles.statusText}>{twoFAEnabled ? '2FA is enabled' : '2FA is disabled'}</Text>
            </View>

            {!twoFAEnabled ? (
              <>
                <Text style={styles.sectionLabel}>Enable 2FA</Text>
                <Text style={styles.sectionDesc}>Choose your preferred method:</Text>
                {(['authenticator', 'sms'] as const).map((method) => (
                  <TouchableOpacity key={method} style={styles.radioRow} onPress={() => setTwoFAMethod(method)}>
                    <View style={[styles.radio, twoFAMethod === method && styles.radioActive]} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.radioLabel}>{method === 'authenticator' ? 'Authenticator App' : 'SMS (via phone number)'}</Text>
                      <Text style={styles.radioDesc}>{method === 'authenticator' ? 'Use Google Authenticator or Authy' : 'Receive codes via text message'}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={styles.saveBtn} onPress={handleEnable2FA} disabled={twoFALoading}>
                  {twoFALoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Enable 2FA</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.sectionLabel}>Disable 2FA</Text>
                <View style={styles.field}>
                  <Text style={styles.label}>Confirm password</Text>
                  <View style={styles.inputWrap}>
                    <TextInput style={styles.inputWithIcon} value={twoFADisablePass} onChangeText={setTwoFADisablePass}
                      secureTextEntry={!showTwoFAPass} placeholder="••••••••" placeholderTextColor={Colors.textLight} />
                    <TouchableOpacity onPress={() => setShowTwoFAPass(p => !p)} style={styles.eyeBtn} accessibilityLabel={showTwoFAPass ? 'Hide password' : 'Show password'}>
                      <Ionicons name={showTwoFAPass ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity style={[styles.saveBtn, styles.dangerBtn]} onPress={handleDisable2FA} disabled={twoFALoading}>
                  {twoFALoading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.saveBtnText}>Disable 2FA</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </>
    );
  }

  // Main settings menu
  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {[
          { icon: 'lock-closed-outline', label: 'Change password',          onPress: () => setSection('password') },
          { icon: 'shield-outline', label: 'Two-Factor Authentication',      onPress: () => setSection('twofa') },
          { icon: 'notifications-outline', label: 'Notification preferences', onPress: () => setSection('notifications') },
          { icon: 'shield-checkmark-outline', label: 'Privacy settings',     onPress: () => setSection('privacy') },
          { icon: 'card-outline', label: 'KYC Verification',                 onPress: () => router.push('/kyc' as never) },
          { icon: 'document-text-outline', label: 'Privacy Policy',          onPress: () => router.push('/profile/privacy-policy' as never) },
          { icon: 'document-outline', label: 'Terms of Service',             onPress: () => router.push('/profile/terms' as never) },
        ].map(({ icon, label, onPress }) => (
          <TouchableOpacity key={label} style={styles.menuItem} onPress={onPress}>
            <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={Colors.textBody} />
            <Text style={styles.menuLabel}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
          </TouchableOpacity>
        ))}

        <View style={styles.separator} />

        <TouchableOpacity style={styles.dangerItem} onPress={handleDeleteAccount}>
          <Ionicons name="trash-outline" size={20} color={Colors.error} />
          <Text style={styles.dangerLabel}>Delete account</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  content: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.bgInput },
  inputWithIcon: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.body, color: Colors.textDark },
  eyeBtn: { paddingHorizontal: 12 },
  saveBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 10,
  },
  menuLabel: { flex: 1, fontSize: 15, fontFamily: Fonts.body, color: Colors.textDark },
  separator: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 16 },
  dangerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.white, padding: 16, borderRadius: 12,
  },
  dangerLabel: { fontSize: 15, fontFamily: Fonts.body, color: Colors.error },
  switchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 10,
  },
  switchLabel: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textDark, flex: 1 },
  sectionLabel: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8 },
  radioRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.white, padding: 14, borderRadius: 12, marginBottom: 8 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border },
  radioActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  radioLabel: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textDark },
  radioDesc: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  statusBox: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.white, padding: 16, borderRadius: 12, marginBottom: 20,
  },
  statusText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textDark, flex: 1 },
  sectionDesc: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, marginBottom: 12 },
  dangerBtn: { backgroundColor: Colors.error },
});
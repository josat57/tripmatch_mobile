import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator, Linking, Switch,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Auth } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

// Legal pages are served by the API host itself (mounted at /legal, not under /api).
const LEGAL_BASE = (process.env.EXPO_PUBLIC_API_URL ?? 'https://api.tripmatch.online/api').replace(/\/api\/?$/, '');

// Password strength calculator
function passwordScore(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  const map = [
    { message: '', color: Colors.textLight },
    { message: 'Weak', color: Colors.error },
    { message: 'Fair', color: '#F59E0B' },
    { message: 'Good', color: Colors.forest },
    { message: 'Strong', color: Colors.primary },
  ];
  return { score, ...map[score] };
}

export default function RegisterScreen() {
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);

  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [agreeTerms, setAgreeTerms]         = useState(false);

  const passwordStrength = passwordScore(password);

  const goToStep2 = () => {
    if (!email.trim()) {
      Alert.alert('Missing email', 'Please enter your email address.');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }
    if (!password) {
      Alert.alert('Missing password', 'Please enter a password.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    if (!confirmPassword) {
      Alert.alert('Missing confirmation', 'Please confirm your password.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match. Please try again.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!agreeTerms) {
      Alert.alert('Terms required', 'Please accept the Terms of Service and Privacy Policy.');
      return;
    }
    setLoading(true);
    try {
      const payload = await Auth.register({
        email: email.trim().toLowerCase(),
        password,
        termsAccepted: true,
      });

      // Show success screen regardless of whether we got a token
      Alert.alert('Account created!', 'Please check your email to verify your account.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Please try again.';
      // Account already registered
      if (msg.toLowerCase().includes('already')) {
        Alert.alert('Account exists', 'This email is already registered. Please sign in instead.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      } else {
        Alert.alert('Registration failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = step === 1 ? '50%' : '100%';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Create account</Text>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.stepLabel}>Step {step} of 2</Text>

        {step === 1 && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                autoComplete="email"
                autoCapitalize="none"
                placeholder="your@email.com"
                placeholderTextColor={Colors.textLight}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="new-password"
                  placeholder="Create a strong password"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn} accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              {password && (
                <View style={[styles.strengthBar, { backgroundColor: `${passwordStrength.color}15` }]}>
                  <View style={[styles.strengthFill, { width: `${(passwordStrength.score / 4) * 100}%`, backgroundColor: passwordStrength.color }]} />
                </View>
              )}
              {passwordStrength.message && (
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.message}
                </Text>
              )}
              <Text style={styles.hint}>At least 8 characters, uppercase, lowercase, numbers, and symbols</Text>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Confirm password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirm}
                  autoComplete="new-password"
                  placeholder="Repeat your password"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeBtn} accessibilityLabel={showConfirm ? 'Hide password' : 'Show password'}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.btn} onPress={goToStep2}>
              <Text style={styles.btnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.sectionLabel}>Review & Accept</Text>

            <View style={styles.termsCard}>
              <Text style={styles.termsTitle}>Terms of Service & Privacy Policy</Text>
              <Text style={styles.termsText}>
                By creating an account, you agree to our{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(`${LEGAL_BASE}/legal/terms`)}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text style={styles.termsLink} onPress={() => Linking.openURL(`${LEGAL_BASE}/legal/privacy`)}>
                  Privacy Policy
                </Text>
                . You'll complete your profile details after signing in.
              </Text>
            </View>

            <View style={styles.agreeRow}>
              <Switch
                value={agreeTerms}
                onValueChange={setAgreeTerms}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.white}
              />
              <Text style={styles.agreeText}>I agree to the Terms of Service and Privacy Policy</Text>
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(1)}>
                <Text style={styles.outlineBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1 }, !agreeTerms && styles.btnDisabled]} onPress={handleRegister} disabled={loading || !agreeTerms}>
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.btnText}>Create account</Text>
                }
              </TouchableOpacity>
            </View>

            <Text style={styles.infoText}>
              After signing up, you'll verify your email and complete your profile with your name, photo, and travel preferences.
            </Text>
          </>
        )}

        <Link href="/(auth)/login" asChild>
          <TouchableOpacity style={styles.link}>
            <Text style={styles.linkText}>
              Already have an account?{' '}
              <Text style={styles.linkBold}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </Link>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flexGrow: 1, padding: 24 },
  heading: {
    fontSize: 24,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginTop: 48,
    marginBottom: 16,
  },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 6 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, marginBottom: 24 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.bgInput,
  },
  inputWithIcon: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
  },
  eyeBtn: { paddingHorizontal: 12, paddingVertical: 12 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textBody,
    marginBottom: 16,
    marginTop: 8,
  },
  strengthBar: {
    height: 4,
    borderRadius: 2,
    marginTop: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontFamily: Fonts.bodySemiBold,
    marginBottom: 4,
  },
  hint: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    marginTop: 4,
    lineHeight: 16,
  },
  termsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  termsTitle: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
    marginBottom: 8,
  },
  termsText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    lineHeight: 18,
  },
  termsLink: {
    color: Colors.primaryDark,
    fontFamily: Fonts.bodySemiBold,
    textDecorationLine: 'underline',
  },
  agreeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  agreeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    lineHeight: 18,
  },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  row: { flexDirection: 'row', gap: 10, marginTop: 8 },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.earth,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.earth },
  link: { alignItems: 'center', marginTop: 24 },
  linkText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted },
  linkBold: { fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  infoText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 16,
    lineHeight: 18,
  },
});

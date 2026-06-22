import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Auth } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

const TRAVEL_STYLES = ['Adventure', 'Cultural', 'Luxury', 'Budget', 'Backpacking', 'Beach', 'Hiking', 'Wellness'];
const BUDGET_RANGES = ['Under $1k', '$1k–$3k', '$3k–$8k', '$8k–$20k', '$20k+'];

export default function RegisterScreen() {
  const { refreshUser } = useAuth();
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName]           = useState('');
  const [lastName, setLastName]             = useState('');
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass]             = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);

  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');

  const toggleStyle = (s: string) =>
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const goToStep2 = () => {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Missing info', 'Fill in all fields to continue.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Password mismatch', 'Passwords do not match. Please try again.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Weak password', 'Password must be at least 8 characters.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (selectedStyles.length < 1 || !selectedBudget) {
      Alert.alert('Incomplete', 'Select at least one travel style and a budget range.');
      return;
    }
    setLoading(true);
    try {
      const payload = await Auth.register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        travelPreferences: {
          style: selectedStyles,
          budget: { range: [selectedBudget] },
        },
      });

      if (payload.accessToken) {
        // Tokens stored by Auth.register — hydrate context then go to onboarding
        await refreshUser();
        router.replace('/onboarding');
      } else {
        Alert.alert('Account created!', 'Please verify your email then sign in.', [
          { text: 'OK', onPress: () => router.replace('/(auth)/login') },
        ]);
      }
    } catch (err: unknown) {
      Alert.alert(
        'Registration failed',
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Please try again.'
      );
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
            {([
              { label: 'First name',    value: firstName,  set: setFirstName,  auto: 'given-name'  as const },
              { label: 'Last name',     value: lastName,   set: setLastName,   auto: 'family-name' as const },
              { label: 'Email address', value: email,      set: setEmail,      auto: 'email'       as const },
            ]).map(({ label, value, set, auto }) => (
              <View style={styles.field} key={label}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={styles.input}
                  value={value}
                  onChangeText={set}
                  autoComplete={auto}
                  autoCapitalize={auto === 'email' ? 'none' : 'words'}
                  placeholder={label}
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
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
                <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeBtn}>
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
            <Text style={styles.sectionLabel}>Travel style (pick all that apply)</Text>
            <View style={styles.chipGrid}>
              {TRAVEL_STYLES.map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => toggleStyle(s)}
                  style={[styles.chip, selectedStyles.includes(s) && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedStyles.includes(s) && styles.chipTextActive]}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionLabel}>Budget range</Text>
            <View style={styles.chipGrid}>
              {BUDGET_RANGES.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setSelectedBudget(b)}
                  style={[styles.chip, selectedBudget === b && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedBudget === b && styles.chipTextActive]}>{b}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.row}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(1)}>
                <Text style={styles.outlineBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, { flex: 1 }]} onPress={handleRegister} disabled={loading}>
                {loading
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.btnText}>Create account</Text>
                }
              </TouchableOpacity>
            </View>
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
    marginBottom: 10,
    marginTop: 8,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  chipText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  chipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
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
});

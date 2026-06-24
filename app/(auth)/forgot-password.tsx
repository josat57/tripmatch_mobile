import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Auth } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

type Step = 'email' | 'otp' | 'reset';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<Step>('email');
  const [loading, setLoading] = useState(false);

  const [email, setEmail]           = useState('');
  const [otp, setOtp]               = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPass, setNewPass]       = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) return Alert.alert('Required', 'Please enter your email address.');
    setLoading(true);
    try {
      await Auth.forgotPassword(email.trim().toLowerCase());
      setStep('otp');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not send reset code. Check the email and try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length < 4) return Alert.alert('Required', 'Enter the code sent to your email.');
    setLoading(true);
    try {
      const res = await Auth.verifyOTP(email.trim().toLowerCase(), otp.trim()) as { resetToken?: string };
      setResetToken(res?.resetToken ?? otp.trim());
      setStep('reset');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Invalid or expired code.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPass.length < 8) return Alert.alert('Too short', 'Password must be at least 8 characters.');
    if (newPass !== confirmPass) return Alert.alert('Mismatch', 'Passwords do not match.');
    setLoading(true);
    try {
      await Auth.resetPassword(resetToken, newPass);
      Alert.alert('Password reset!', 'You can now sign in with your new password.', [
        { text: 'Sign in', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not reset password. Try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const stepIndex = step === 'email' ? 0 : step === 'otp' ? 1 : 2;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">

        <TouchableOpacity style={styles.back} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textDark} />
        </TouchableOpacity>

        <Text style={styles.heading}>Reset password</Text>
        <Text style={styles.sub}>
          {step === 'email' && 'Enter your registered email address and we\'ll send you a code.'}
          {step === 'otp'   && `Enter the verification code we sent to ${email}.`}
          {step === 'reset' && 'Choose a strong new password for your account.'}
        </Text>

        {/* Progress dots */}
        <View style={styles.dots}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.dot, i <= stepIndex && styles.dotActive]} />
          ))}
        </View>

        {/* Step 1 — Email */}
        {step === 'email' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                placeholder="you@example.com"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleSendOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Send reset code</Text>}
            </TouchableOpacity>
          </>
        )}

        {/* Step 2 — OTP */}
        {step === 'otp' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={8}
                placeholder="000000"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleVerifyOtp} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Verify code</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={() => { setStep('email'); setOtp(''); }}>
              <Text style={styles.linkText}>Wrong email? Go back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkBtn} onPress={handleSendOtp} disabled={loading}>
              <Text style={styles.linkText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 3 — New password */}
        {step === 'reset' && (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>New password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={newPass}
                  onChangeText={setNewPass}
                  secureTextEntry={!showPass}
                  placeholder="At least 8 characters"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowPass((p) => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Confirm new password</Text>
              <View style={styles.inputWrap}>
                <TextInput
                  style={styles.inputWithIcon}
                  value={confirmPass}
                  onChangeText={setConfirmPass}
                  secureTextEntry={!showConfirm}
                  placeholder="Repeat password"
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity onPress={() => setShowConfirm((p) => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showConfirm ? 'eye-off' : 'eye'} size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.btn} onPress={handleResetPassword} disabled={loading}>
              {loading ? <ActivityIndicator color={Colors.white} />
                : <Text style={styles.btnText}>Set new password</Text>}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  inner: { flexGrow: 1, padding: 24, paddingTop: 60 },
  back: { marginBottom: 24 },
  heading: { fontSize: 26, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 20, marginBottom: 24 },
  dots: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  dot: { width: 28, height: 4, borderRadius: 2, backgroundColor: Colors.borderLight },
  dotActive: { backgroundColor: Colors.primary },
  field: { marginBottom: 18 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: Fonts.body, color: Colors.textDark, backgroundColor: Colors.bgInput,
  },
  otpInput: { fontSize: 22, letterSpacing: 6, textAlign: 'center' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, backgroundColor: Colors.bgInput,
  },
  inputWithIcon: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontFamily: Fonts.body, color: Colors.textDark },
  eyeBtn: { paddingHorizontal: 12 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14,
    alignItems: 'center', marginTop: 4,
  },
  btnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  linkBtn: { alignItems: 'center', marginTop: 16 },
  linkText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.primaryDark },
});
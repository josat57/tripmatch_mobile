import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, Image,
} from 'react-native';

import { Stack, router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { KYC } from '../src/api/api';
import { Colors, Fonts } from '../src/theme';
import VerifiedBadgeCard from '../src/components/VerifiedBadgeCard';

type DocType = 'passport' | 'national_id' | 'driver_license';
type KYCStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

const DOC_LABELS: Record<DocType, string> = {
  passport: 'Passport',
  national_id: 'National ID',
  driver_license: "Driver's License",
};

const STATUS_CONFIG: Record<KYCStatus, { icon: string; color: string; title: string; text: string }> = {
  not_submitted: { icon: 'shield-outline', color: Colors.textMuted, title: 'Identity not verified', text: 'Verify your identity to build trust with other travellers and unlock all features.' },
  pending:       { icon: 'time-outline',   color: '#F59E0B',       title: 'Verification in review', text: 'Your documents have been submitted and are being reviewed. This usually takes 1–2 business days.' },
  approved:      { icon: 'shield-checkmark', color: Colors.primary, title: 'Identity verified ✓',  text: 'Your identity has been verified. Your profile shows a verified badge.' },
  rejected:      { icon: 'close-circle-outline', color: Colors.error, title: 'Verification rejected', text: 'Your submission was rejected. Please resubmit with clearer documents.' },
};

export default function KYCScreen() {
  const [status, setStatus]       = useState<KYCStatus>('not_submitted');
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [docType, setDocType]     = useState<DocType>('passport');
  const [docNumber, setDocNumber] = useState('');
  const [country, setCountry]     = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [frontUri, setFrontUri]   = useState('');
  const [selfieUri, setSelfieUri] = useState('');

  useEffect(() => {
    KYC.getStatus()
      .then((d) => {
        const s = (d as { status?: string })?.status ?? 'not_submitted';
        setStatus(s as KYCStatus);
      })
      .catch(() => {})
      .finally(() => setLoadingStatus(false));
  }, []);

  const pickImage = async (setter: (uri: string) => void) => {
    const { status: perm } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm !== 'granted') return Alert.alert('Permission needed', 'Please allow photo access.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true });
    if (!result.canceled && result.assets[0]) {
      setter(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!docNumber.trim()) return Alert.alert('Required', 'Enter your document number.');
    if (!country.trim()) return Alert.alert('Required', 'Enter the issuing country.');
    if (!expiresAt.trim()) return Alert.alert('Required', 'Enter expiry date (YYYY-MM-DD).');
    if (!frontUri) return Alert.alert('Required', 'Upload a photo of the front of your document.');
    if (!selfieUri) return Alert.alert('Required', 'Upload a selfie photo.');

    setSubmitting(true);
    try {
      await KYC.upload({
        type: docType,
        number: docNumber.trim(),
        frontImage: frontUri,
        selfieImage: selfieUri,
        expiresAt: expiresAt.trim(),
        country: country.trim(),
      });
      setStatus('pending');
      Alert.alert('Submitted!', 'Your documents have been submitted for review.');
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not submit. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const cfg = STATUS_CONFIG[status];

  return (
    <>
      <Stack.Screen options={{ title: 'KYC Verification', headerShown: true }} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          {loadingStatus ? (
            <ActivityIndicator style={{ marginTop: 60 }} color={Colors.primary} />
          ) : (
            <>
              {/* Status banner */}
              <View style={[styles.statusCard, { borderColor: cfg.color }]}>
                <Ionicons name={cfg.icon as React.ComponentProps<typeof Ionicons>['name']} size={32} color={cfg.color} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.statusTitle, { color: cfg.color }]}>{cfg.title}</Text>
                  <Text style={styles.statusText}>{cfg.text}</Text>
                </View>
              </View>

              {(status === 'not_submitted' || status === 'rejected') && (
                <>
                  {/* Document type */}
                  <Text style={styles.sectionTitle}>Document type</Text>
                  <View style={styles.typeRow}>
                    {(Object.keys(DOC_LABELS) as DocType[]).map((t) => (
                      <TouchableOpacity key={t} style={[styles.typeChip, docType === t && styles.typeChipActive]} onPress={() => setDocType(t)}>
                        <Text style={[styles.typeChipText, docType === t && styles.typeChipTextActive]}>{DOC_LABELS[t]}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Form fields */}
                  {[
                    { label: 'Document number', val: docNumber, set: setDocNumber, placeholder: 'e.g. A12345678' },
                    { label: 'Issuing country',  val: country,   set: setCountry,   placeholder: 'e.g. Nigeria' },
                    { label: 'Expiry date (YYYY-MM-DD)', val: expiresAt, set: setExpiresAt, placeholder: '2030-01-01', keyboard: 'numbers-and-punctuation' as const },
                  ].map(({ label, val, set, placeholder, keyboard }) => (
                    <View style={styles.field} key={label}>
                      <Text style={styles.label}>{label}</Text>
                      <TextInput style={styles.input} value={val} onChangeText={set}
                        placeholder={placeholder} placeholderTextColor={Colors.textLight}
                        keyboardType={keyboard ?? 'default'} />
                    </View>
                  ))}

                  {/* Photo uploads */}
                  <Text style={styles.sectionTitle}>Document photos</Text>
                  <View style={styles.photoRow}>
                    <TouchableOpacity style={styles.photoBox} onPress={() => pickImage(setFrontUri)}>
                      {frontUri
                        ? <Image source={{ uri: frontUri }} style={styles.photoPreview} />
                        : <>
                            <Ionicons name="id-card-outline" size={28} color={Colors.textMuted} />
                            <Text style={styles.photoLabel}>Document front</Text>
                          </>
                      }
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.photoBox} onPress={() => pickImage(setSelfieUri)}>
                      {selfieUri
                        ? <Image source={{ uri: selfieUri }} style={styles.photoPreview} />
                        : <>
                            <Ionicons name="person-outline" size={28} color={Colors.textMuted} />
                            <Text style={styles.photoLabel}>Selfie with doc</Text>
                          </>
                      }
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.hint}>
                    Ensure photos are clear, well-lit and unobstructed. All four corners of the document must be visible.
                  </Text>

                  <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting
                      ? <ActivityIndicator color={Colors.white} />
                      : <Text style={styles.submitBtnText}>Submit for verification</Text>}
                  </TouchableOpacity>
                </>
              )}

              {status === 'approved' && (
                <>
                  <VerifiedBadgeCard />
                  <TouchableOpacity style={styles.doneBtn} onPress={() => router.back()}>
                    <Text style={styles.doneBtnText}>Back to profile</Text>
                  </TouchableOpacity>
                </>
              )}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  content: { padding: 20, paddingBottom: 40 },
  statusCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14,
    backgroundColor: Colors.white, borderRadius: 16, padding: 16,
    borderWidth: 1.5, marginBottom: 24,
  },
  statusTitle: { fontSize: 15, fontFamily: Fonts.bodySemiBold, marginBottom: 4 },
  statusText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 18 },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  typeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: Colors.border },
  typeChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  typeChipText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  typeChipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    fontFamily: Fonts.body, color: Colors.textDark, backgroundColor: Colors.bgInput,
  },
  photoRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  photoBox: {
    flex: 1, height: 120, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.bgInput, overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  photoLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center' },
  hint: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 17, marginBottom: 20 },
  submitBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  submitBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  doneBtn: { borderWidth: 1.5, borderColor: Colors.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.primary },
});
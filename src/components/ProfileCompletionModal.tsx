import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  ActivityIndicator, Alert, Modal, TextInput, Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { UserProfile } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Fonts } from '../theme';

const TRAVEL_STYLES = ['Adventure', 'Cultural', 'Luxury', 'Budget', 'Backpacking', 'Beach', 'Hiking', 'Wellness'];
const BUDGET_RANGES = ['Under $1k', '$1k–$3k', '$3k–$8k', '$8k–$20k', '$20k+'];

interface ProfileCompletionModalProps {
  visible: boolean;
  onComplete?: () => void;
}

export default function ProfileCompletionModal({ visible, onComplete }: ProfileCompletionModalProps) {
  const { user, refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [bio, setBio] = useState('');
  const [photoUri, setPhotoUri] = useState('');
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBudget, setSelectedBudget] = useState('');

  const toggleStyle = (s: string) =>
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo library access to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required', 'Please enter your first and last name.');
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (selectedStyles.length === 0 || !selectedBudget) {
      Alert.alert('Required', 'Please select at least one travel style and a budget range.');
      return;
    }

    setLoading(true);
    try {
      const updateData: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      };

      if (bio.trim()) updateData.bio = bio.trim();
      updateData.travelPreferences = {
        style: selectedStyles,
        budget: { range: [selectedBudget] },
      };

      await UserProfile.update(updateData);

      if (photoUri) {
        try {
          await UserProfile.uploadPhoto(photoUri);
        } catch {
          // Photo upload failed but profile updated, continue
        }
      }

      await refreshUser();
      Alert.alert('Profile complete!', 'Your profile is all set.', [
        { text: 'OK', onPress: onComplete },
      ]);
    } catch (err) {
      Alert.alert(
        'Error',
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = step === 1 ? '50%' : '100%';

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={() => null}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} scrollEnabled={step === 2}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: progressWidth }]} />
          </View>
          <Text style={styles.stepLabel}>Step {step} of 2</Text>
          <Text style={styles.heading}>Complete Your Profile</Text>
          <Text style={styles.sub}>
            {step === 1
              ? 'Tell us your name and add a photo'
              : 'Let us know your travel preferences'}
          </Text>
        </View>

        {/* Step 1: Name & Photo */}
        {step === 1 && (
          <>
            <View style={styles.photoSection}>
              <TouchableOpacity style={styles.photoBox} onPress={pickPhoto}>
                {photoUri ? (
                  <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                ) : (
                  <>
                    <Ionicons name="camera-outline" size={48} color={Colors.textMuted} />
                    <Text style={styles.photoLabel}>Add your photo</Text>
                    <Text style={styles.photoHint}>JPEG or PNG, max 5MB</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>First name</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="e.g. Sarah"
                placeholderTextColor={Colors.textLight}
                autoComplete="given-name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Last name</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="e.g. Johnson"
                placeholderTextColor={Colors.textLight}
                autoComplete="family-name"
                autoCapitalize="words"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Bio (optional)</Text>
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell us about yourself..."
                placeholderTextColor={Colors.textLight}
                multiline
                maxLength={200}
              />
              <Text style={styles.charCount}>{bio.length}/200</Text>
            </View>

            <TouchableOpacity style={styles.btn} onPress={handleNext}>
              <Text style={styles.btnText}>Next →</Text>
            </TouchableOpacity>
          </>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <>
            <Text style={styles.sectionTitle}>Travel style</Text>
            <Text style={styles.sectionHint}>Pick all that apply</Text>
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

            <Text style={styles.sectionTitle}>Budget range</Text>
            <View style={styles.chipGrid}>
              {BUDGET_RANGES.map((b) => (
                <TouchableOpacity
                  key={b}
                  onPress={() => setSelectedBudget(b)}
                  style={[styles.chip, selectedBudget === b && styles.chipActive]}
                >
                  <Text style={[styles.chipText, selectedBudget === b && styles.chipTextActive]}>
                    {b}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.outlineBtn} onPress={() => setStep(1)} disabled={loading}>
                <Text style={styles.outlineBtnText}>← Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btn, { flex: 1 }, loading && styles.btnDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.btnText}>Complete profile</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 20, paddingTop: 40, paddingBottom: 40 },
  header: { marginBottom: 24 },
  progressBar: { height: 4, backgroundColor: Colors.border, borderRadius: 2, marginBottom: 12 },
  progressFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },
  stepLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, marginBottom: 12 },
  heading: { fontSize: 24, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 20 },
  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoBox: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.bgCard,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  photoPreview: { width: '100%', height: '100%' },
  photoLabel: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginTop: 8 },
  photoHint: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 2 },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 8 },
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
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 6, textAlign: 'right' },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginTop: 16, marginBottom: 4 },
  sectionHint: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  chipText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  chipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  buttonRow: { flexDirection: 'row', gap: 10, marginTop: 24 },
  btn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  outlineBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textBody },
});

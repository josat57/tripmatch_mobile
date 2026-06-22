import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator, Image,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { UserProfile } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

const TRAVEL_STYLES = ['Adventure', 'Cultural', 'Luxury', 'Budget', 'Backpacking', 'Beach', 'Hiking', 'Wellness'];

export default function EditProfileScreen() {
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName]   = useState(user?.firstName ?? '');
  const [lastName, setLastName]     = useState(user?.lastName ?? '');
  const [bio, setBio]               = useState(user?.bio ?? '');
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    (user?.travelPreferences as { style?: string[] } | undefined)?.style ?? []
  );
  const [avatarUri, setAvatarUri]   = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [saving, setSaving]         = useState(false);

  const toggleStyle = (s: string) =>
    setSelectedStyles((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library to update your profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Missing info', 'First name and last name are required.');
      return;
    }
    setSaving(true);
    try {
      if (avatarUri) {
        setUploading(true);
        try {
          await UserProfile.uploadPhoto(avatarUri);
        } catch {
          Alert.alert('Photo upload failed', 'Profile info will still be saved.');
        } finally {
          setUploading(false);
        }
      }

      await UserProfile.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        bio: bio.trim() || undefined,
        travelPreferences: {
          style: selectedStyles,
        },
      });

      await refreshUser();
      Alert.alert('Saved!', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert('Error', 'Could not save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const displayAvatar = avatarUri ?? user?.profileImage;

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrap}>
              {displayAvatar ? (
                <Image source={{ uri: displayAvatar }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {firstName?.[0]}{lastName?.[0]}
                  </Text>
                </View>
              )}
              <View style={styles.cameraOverlay}>
                <Ionicons name="camera" size={18} color={Colors.white} />
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>
              {uploading ? 'Uploading…' : 'Tap to change photo'}
            </Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>First name</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              autoCapitalize="words"
              autoComplete="given-name"
              placeholder="First name"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Last name</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              autoCapitalize="words"
              autoComplete="family-name"
              placeholder="Last name"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell other travellers about yourself…"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              maxLength={500}
            />
            <Text style={styles.charCount}>{bio.length}/500</Text>
          </View>

          <Text style={styles.sectionLabel}>Travel style</Text>
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

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || uploading}>
            {saving ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color={Colors.white} />
                <Text style={styles.saveBtnText}>Save changes</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 24, paddingBottom: 40 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative', marginBottom: 8 },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarInitials: { fontSize: 32, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  avatarHint: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  field: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
  },
  textarea: { minHeight: 100, textAlignVertical: 'top' },
  charCount: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textLight, textAlign: 'right', marginTop: 4 },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textBody,
    marginBottom: 10,
    marginTop: 4,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 24 },
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
  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveBtnText: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.white },
});

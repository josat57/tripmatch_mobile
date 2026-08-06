import { useEffect, useState } from 'react';
import {
  View, Modal, ScrollView, TouchableOpacity, Text, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { KYC, UserProfile } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Fonts } from '../theme';
import TripPolicyContent from './TripPolicyContent';

const POLICY_KEY = 'tm_trip_policy_v1';

// Custom checkbox component
function Checkbox({ value, onValueChange }: { value: boolean; onValueChange: (val: boolean) => void }) {
  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      style={[styles.checkbox, value && styles.checkboxChecked]}
      activeOpacity={0.7}
    >
      {value && <Ionicons name="checkmark" size={16} color={Colors.white} />}
    </TouchableOpacity>
  );
}

export async function getTripPolicyAccepted(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(POLICY_KEY);
    if (!raw) return false;
    const { accepted } = JSON.parse(raw);
    return accepted === true;
  } catch {
    return false;
  }
}

async function markTripPolicyAccepted(): Promise<void> {
  try {
    await AsyncStorage.setItem(
      POLICY_KEY,
      JSON.stringify({ accepted: true, timestamp: new Date().toISOString() })
    );
  } catch { /* ignore */ }
}

export interface EligibilityCheck {
  id: 'email' | 'profile' | 'kyc' | 'age';
  label: string;
  description: string;
  passed: boolean | null;
  fixAction?: () => void;
}

interface TripCreationPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEligibilityMet: () => void;
}

export default function TripCreationPolicyModal({
  isOpen,
  onClose,
  onEligibilityMet,
}: TripCreationPolicyModalProps) {
  const { user } = useAuth();
  const [hasAccepted, setHasAccepted] = useState(false);
  const [validating, setValidating] = useState(false);
  const [eligibility, setEligibility] = useState<EligibilityCheck[]>([]);
  const [fullProfile, setFullProfile] = useState<any>(null);
  const [kycStatus, setKycStatus] = useState<string | null>(null);
  const [loadingEligibility, setLoadingEligibility] = useState(false);

  // Load eligibility checks on modal open
  useEffect(() => {
    if (!isOpen || !user) return;
    loadEligibilityChecks();
  }, [isOpen, user]);

  const loadEligibilityChecks = async () => {
    setLoadingEligibility(true);
    try {
      // Get full profile
      const profile = await UserProfile.getMe();
      setFullProfile(profile);

      // Get KYC status
      let kycStatusValue = null;
      try {
        const kycRes = await KYC.getStatus() as any;
        kycStatusValue = kycRes?.status ?? null;
        setKycStatus(kycStatusValue);
      } catch {
        setKycStatus(null);
      }

      // Build eligibility checks
      const checks: EligibilityCheck[] = [
        {
          id: 'email',
          label: 'Verified email address',
          description: 'Your account email must be verified before you can create trips.',
          passed: user?.isEmailVerified ?? false,
        },
        {
          id: 'profile',
          label: 'Complete profile',
          description: 'Bio, home city/country, at least one interest, and at least one travel style must be filled in.',
          passed: checkProfileComplete(profile),
        },
        {
          id: 'kyc',
          label: 'Identity verified (KYC)',
          description: 'Upload a government-issued ID. Our team reviews it within 24–48 hours.',
          passed: kycStatusValue === 'approved',
        },
      ];

      setEligibility(checks);
    } catch (error) {
      console.error('Error loading eligibility checks:', error);
      Alert.alert('Error', 'Could not load eligibility requirements');
    } finally {
      setLoadingEligibility(false);
    }
  };

  const handleAgree = async () => {
    setValidating(true);
    try {
      // Validate all requirements
      const failedCheck = eligibility.find((check) => check.passed === false);

      if (failedCheck) {
        // Navigate to the appropriate screen to fix the requirement
        await markTripPolicyAccepted(); // Mark as accepted even if validation fails
        navigateToFixRequirement(failedCheck.id);
        onClose();
        return;
      }

      // All requirements met
      await markTripPolicyAccepted();
      onClose();
      onEligibilityMet();
    } catch (error) {
      Alert.alert('Error', 'Could not validate requirements');
    } finally {
      setValidating(false);
    }
  };

  const navigateToFixRequirement = (requirementId: string) => {
    switch (requirementId) {
      case 'email':
        Alert.alert(
          'Email Verification Required',
          'Your account email must be verified before creating a trip. Check your inbox for a verification link.',
          [{ text: 'OK', style: 'cancel' }]
        );
        break;
      case 'profile':
        Alert.alert(
          'Complete Your Profile',
          'Please complete your profile (bio, city, interests, travel styles) before creating a trip.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Edit Profile', onPress: () => router.push('/(tabs)/profile' as never) },
          ]
        );
        break;
      case 'kyc':
        Alert.alert(
          'Identity Verification Required',
          'Please verify your identity (KYC) before creating a trip.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Verify Identity', onPress: () => router.push('/kyc' as never) },
          ]
        );
        break;
    }
  };

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.iconBox}>
              <Ionicons name="location" size={20} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Trip Creator Policy</Text>
              <Text style={styles.headerSubtitle}>Please read before creating your first trip</Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        {loadingEligibility ? (
          <View style={styles.centerLoader}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <ScrollView style={styles.content} contentContainerStyle={styles.contentInner}>
            <TripPolicyContent mode="modal" eligibility={eligibility} />
          </ScrollView>
        )}

        {/* Acceptance Section */}
        <View style={styles.footer}>
          <View style={styles.checkboxSection}>
            <Checkbox value={hasAccepted} onValueChange={setHasAccepted} />
            <Text style={styles.checkboxText}>
              I have read and understood the TripMatch Trip Creator Policy. I agree to uphold these standards and
              understand that violations may result in my trip being removed or my account being suspended.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.agreeBtn, !hasAccepted && styles.agreeBtnDisabled]}
            onPress={handleAgree}
            disabled={!hasAccepted || validating}
          >
            {validating ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.agreeBtnText}>Agree & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

function checkProfileComplete(profile: any): boolean {
  return !!(
    profile?.bio?.trim() &&
    profile?.address?.country?.trim() &&
    profile?.address?.city?.trim() &&
    Array.isArray(profile?.interests) &&
    profile.interests.length > 0 &&
    Array.isArray(profile?.travelPreferences?.style) &&
    profile.travelPreferences.style.length > 0
  );
}

const styles = StyleSheet.create({
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.mist,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 20,
  },
  centerLoader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
  },
  checkboxSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 16,
  },
  checkboxText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textBody,
    lineHeight: 18,
  },
  agreeBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  agreeBtnDisabled: {
    opacity: 0.5,
  },
  agreeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.white,
  },
});
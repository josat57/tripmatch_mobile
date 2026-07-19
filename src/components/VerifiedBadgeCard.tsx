import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Payments } from '../api/api';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Fonts } from '../theme';

interface BadgeState {
  active: boolean;
  tier: string;
  activatedAt: string | null;
}

export default function VerifiedBadgeCard() {
  const { user } = useAuth();
  const [badge, setBadge] = useState<BadgeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  const loadBadge = useCallback(async () => {
    try {
      const data = await Payments.getBadgeStatus();
      setBadge(data);
    } catch {
      setBadge({ active: false, tier: 'verified', activatedAt: null });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBadge();
  }, [loadBadge]);

  const handlePurchase = useCallback(async () => {
    if (purchasing) return;
    setPurchasing(true);

    try {
      // Initiate badge checkout
      const checkout = await Payments.initiateBadgeCheckout();

      if (checkout.provider === 'stripe') {
        // For now, show a message that Stripe checkout would open
        Alert.alert(
          'Verified Badge',
          `Purchase your Verified Badge for $${checkout.amount.toFixed(2)}. Stripe payment integration coming soon.`,
          [{ text: 'OK' }]
        );
      } else if (checkout.provider === 'flutterwave') {
        // For now, show a message that Flutterwave checkout would open
        Alert.alert(
          'Verified Badge',
          `Purchase your Verified Badge for $${checkout.amount.toFixed(2)}. Flutterwave payment integration coming soon.`,
          [{ text: 'OK' }]
        );
      }
    } catch (err) {
      Alert.alert(
        'Error',
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not initiate checkout. Please try again.'
      );
    } finally {
      setPurchasing(false);
    }
  }, [purchasing]);

  if (loading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  const isActive = badge?.active === true;

  return (
    <View style={styles.card}>
      {/* Badge Icon & Header */}
      <View style={styles.header}>
        <View style={styles.iconBg}>
          <Ionicons name="shield-checkmark" size={24} color={Colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Verified Badge</Text>
          <Text style={styles.subtitle}>
            {isActive ? 'Your verified badge is active' : 'Get a personalized verified shield'}
          </Text>
        </View>
      </View>

      {/* Badge Preview */}
      <View style={styles.badgePreview}>
        <View style={styles.badgeCircle}>
          <View style={[styles.badgeInner, !isActive && styles.badgeLocked]}>
            <Text style={styles.badgeInitial}>
              {user?.firstName?.[0]?.toUpperCase()}
            </Text>
            <Text style={styles.badgeInitial}>
              {user?.lastName?.[0]?.toUpperCase()}
            </Text>
          </View>
          {!isActive && (
            <View style={styles.lockOverlay}>
              <Ionicons name="lock-closed" size={20} color={Colors.white} />
            </View>
          )}
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>
        {isActive
          ? 'Your verified badge shows on your profile and builds trust with other travelers.'
          : 'A personalized shield badge with your initials. Show it on your profile and share it anywhere.'}
      </Text>

      {/* Action Button */}
      {!isActive && (
        <TouchableOpacity
          style={[styles.purchaseBtn, purchasing && styles.purchaseBtnDisabled]}
          onPress={handlePurchase}
          disabled={purchasing}
        >
          {purchasing ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color={Colors.white} style={{ marginRight: 8 }} />
              <Text style={styles.purchaseBtnText}>Get Verified Badge</Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {isActive && badge?.activatedAt && (
        <View style={styles.activeInfo}>
          <Ionicons name="checkmark-circle" size={16} color={Colors.forest} />
          <Text style={styles.activeText}>
            Badge active since{' '}
            {new Date(badge.activatedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.bgCard,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  iconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  title: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 2,
  },
  badgePreview: {
    alignItems: 'center',
    marginVertical: 20,
  },
  badgeCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primaryLight,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  badgeInner: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 0,
  },
  badgeLocked: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  badgeInitial: {
    fontSize: 32,
    fontFamily: Fonts.heading,
    color: Colors.white,
    fontWeight: 'bold',
    lineHeight: 40,
  },
  lockOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 70,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  purchaseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  purchaseBtnDisabled: {
    opacity: 0.6,
  },
  purchaseBtnText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
  },
  activeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  activeText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
});

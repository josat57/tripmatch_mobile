import { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Payments } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';
import PaymentWebView from '../../src/components/PaymentWebView';

interface ProPlan {
  name: string;
  price: number;
  benefits: string[];
  icon: string;
}

const PRO_PLANS: ProPlan[] = [
  {
    name: 'Monthly',
    price: 2000, // $20 in cents
    benefits: [
      'Unlimited trip creation',
      'Advanced trip analytics',
      'Priority member badge',
      'Advanced messaging features',
      'Direct support access',
    ],
    icon: 'calendar-month',
  },
];

export default function ProSubscriptionScreen() {
  const [loading, setLoading] = useState(true);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentCheckout, setPaymentCheckout] = useState<any>(null);

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

  const loadSubscriptionStatus = async () => {
    try {
      // In production, you'd have an endpoint to check subscription status
      // For now, we assume user is not subscribed
      setIsSubscribed(false);
    } catch {
      setIsSubscribed(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    try {
      const checkout = await Payments.createIntent(
        PRO_PLANS[0].price,
        'pro_subscription',
        { plan: 'monthly' }
      );
      setPaymentCheckout(checkout);
      setShowPayment(true);
    } catch (err) {
      Alert.alert(
        'Error',
        (err as any)?.response?.data?.message ?? 'Could not initiate subscription. Please try again.'
      );
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: 'TripMatch Pro' }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'TripMatch Pro' }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Ionicons name="star" size={48} color={Colors.primary} />
          <Text style={styles.title}>TripMatch Pro</Text>
          <Text style={styles.subtitle}>Unlock premium features and grow your travel network</Text>
        </View>

        {/* Current Status */}
        {isSubscribed ? (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.forest} />
            <Text style={styles.statusText}>You are a TripMatch Pro member</Text>
          </View>
        ) : (
          <View style={styles.upgradeCard}>
            <Text style={styles.upgradeText}>Upgrade to Pro and unlock premium features</Text>
          </View>
        )}

        {/* Plans */}
        {PRO_PLANS.map((plan, idx) => (
          <View key={idx} style={styles.planCard}>
            <View style={styles.planHeader}>
              <Text style={styles.planName}>{plan.name}</Text>
              <Text style={styles.planPrice}>${plan.price / 100}/month</Text>
            </View>

            <View style={styles.benefitsList}>
              {plan.benefits.map((benefit, bidx) => (
                <View key={bidx} style={styles.benefitItem}>
                  <Ionicons name="checkmark" size={18} color={Colors.forest} />
                  <Text style={styles.benefitText}>{benefit}</Text>
                </View>
              ))}
            </View>

            {!isSubscribed && (
              <TouchableOpacity
                style={styles.purchaseBtn}
                onPress={handlePurchase}
                accessibilityLabel="Subscribe to TripMatch Pro"
              >
                <Text style={styles.purchaseBtnText}>Subscribe Now</Text>
              </TouchableOpacity>
            )}

            {isSubscribed && (
              <View style={styles.subscribedBadge}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.forest} />
                <Text style={styles.subscribedText}>Active Subscription</Text>
              </View>
            )}
          </View>
        ))}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={styles.faqTitle}>Frequently Asked Questions</Text>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Can I cancel anytime?</Text>
            <Text style={styles.faqA}>Yes, you can cancel your subscription at any time from your account settings.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>What payment methods do you accept?</Text>
            <Text style={styles.faqA}>We accept all major credit cards via Stripe, as well as local payment methods through Flutterwave in supported regions.</Text>
          </View>

          <View style={styles.faqItem}>
            <Text style={styles.faqQ}>Do you offer refunds?</Text>
            <Text style={styles.faqA}>Subscriptions are billed monthly and renew automatically. We offer a 7-day money-back guarantee.</Text>
          </View>
        </View>
      </ScrollView>

      {/* Payment WebView */}
      {paymentCheckout && (
        <PaymentWebView
          visible={showPayment}
          provider="stripe"
          amount={Math.round(paymentCheckout.amount / 100)}
          currency="USD"
          clientSecret={paymentCheckout.clientSecret}
          onClose={() => {
            setShowPayment(false);
            setPaymentCheckout(null);
          }}
          onSuccess={() => {
            setShowPayment(false);
            setPaymentCheckout(null);
            setIsSubscribed(true);
            Alert.alert('Success', 'Welcome to TripMatch Pro! Enjoy premium features.');
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    alignItems: 'center',
    marginBottom: 28,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 8,
    textAlign: 'center',
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.forest,
  },
  statusText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.forest,
  },
  upgradeCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    opacity: 0.15,
  },
  upgradeText: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.primary,
    textAlign: 'center',
  },
  planCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
  planPrice: {
    fontSize: 20,
    fontFamily: Fonts.heading,
    color: Colors.primary,
  },
  benefitsList: { marginBottom: 20, gap: 12 },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  benefitText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    flex: 1,
  },
  purchaseBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  purchaseBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
  },
  subscribedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.forest,
    opacity: 0.1,
  },
  subscribedText: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.forest,
  },
  faqSection: {
    marginTop: 12,
  },
  faqTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginBottom: 16,
  },
  faqItem: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  faqQ: {
    fontSize: 13,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
    marginBottom: 6,
  },
  faqA: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});

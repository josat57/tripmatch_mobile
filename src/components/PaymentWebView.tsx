import { useEffect, useState } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import * as Linking from 'expo-linking';
import { Payments } from '../api/api';
import { Colors, Fonts } from '../theme';

interface PaymentWebViewProps {
  visible: boolean;
  provider: 'stripe' | 'flutterwave';
  amount: number;
  currency: string;
  clientSecret?: string;
  publicKey?: string;
  txRef?: string;
  customer?: { email: string; name: string };
  meta?: Record<string, string>;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PaymentWebView({
  visible,
  provider,
  amount,
  currency,
  clientSecret,
  publicKey,
  txRef,
  customer,
  meta,
  onClose,
  onSuccess,
}: PaymentWebViewProps) {
  const [processing, setProcessing] = useState(false);

  const getPaymentPageUrl = () => {
    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') ?? 'https://api.tripmatch.online';
    const params = new URLSearchParams({
      provider,
      amount: String(amount),
      currency,
      clientSecret: clientSecret || '',
      publicKey: publicKey || '',
      txRef: txRef || '',
      customer: JSON.stringify(customer || {}),
      meta: JSON.stringify(meta || {}),
    });
    return `${baseUrl}/payment/checkout?${params.toString()}`;
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    setProcessing(true);
    try {
      if (provider === 'flutterwave') {
        await Payments.verifyBadge(transactionId);
      }
      onSuccess();
      onClose();
    } catch (error) {
      Alert.alert(
        'Verification Failed',
        'Payment may still be processed. Please check your badge status in a moment.',
        [{ text: 'OK', onPress: onClose }]
      );
    } finally {
      setProcessing(false);
    }
  };

  const openPayment = async () => {
    try {
      const url = getPaymentPageUrl();
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      }
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Could not open payment page.');
      onClose();
    }
  };

  useEffect(() => {
    if (visible) {
      openPayment();
    }
  }, [visible]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>
            {provider === 'stripe' ? 'Pay with Card' : 'Pay with Flutterwave'}
          </Text>
          <Text style={styles.subtitle}>
            Opening payment page in your browser...
          </Text>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.loader} />
          <TouchableOpacity style={styles.closeBtn} onPress={onClose} disabled={processing}>
            <Text style={styles.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    marginBottom: 24,
  },
  loader: {
    marginBottom: 20,
  },
  closeBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.mist,
    borderRadius: 8,
  },
  closeBtnText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
});

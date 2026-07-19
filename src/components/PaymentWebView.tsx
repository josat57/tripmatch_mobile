import { useEffect, useRef, useState } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
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
  const webViewRef = useRef<WebView | null>(null);
  const [loading, setLoading] = useState(true);
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

  const handleWebViewMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);

      if (data.type === 'payment_success') {
        handlePaymentSuccess(data.transactionId);
      } else if (data.type === 'payment_error') {
        Alert.alert('Payment Failed', data.message || 'An error occurred during payment.');
        setProcessing(false);
      } else if (data.type === 'payment_close') {
        onClose();
      }
    } catch (error) {
      console.error('Error parsing WebView message:', error);
    }
  };

  const handlePaymentSuccess = async (transactionId: string) => {
    setProcessing(true);
    try {
      // For Flutterwave, verify the transaction
      if (provider === 'flutterwave') {
        await Payments.verifyBadge(transactionId);
      }
      // For Stripe, webhook handles verification, but we can close the modal
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={processing}>
            <Ionicons name="chevron-back" size={28} color={Colors.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {provider === 'stripe' ? 'Pay with Card' : 'Pay with Flutterwave'}
          </Text>
          <View style={{ width: 28 }} />
        </View>

        {/* WebView */}
        {visible && (
          <WebView
            ref={webViewRef as any}
            source={{ uri: getPaymentPageUrl() }}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => setLoading(false)}
            onMessage={handleWebViewMessage}
            style={styles.webview}
            javaScriptEnabled
            scalesPageToFit
            scrollEnabled
            bounces={false}
          />
        )}

        {/* Loading Indicator */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading payment...</Text>
          </View>
        )}

        {/* Processing Indicator */}
        {processing && (
          <View style={styles.processingOverlay}>
            <ActivityIndicator size="large" color={Colors.white} />
            <Text style={styles.processingText}>Processing...</Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  processingText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.white,
  },
});

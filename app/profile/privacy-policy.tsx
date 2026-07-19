import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors } from '../../src/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tripmatch.online/api';

export default function PrivacyPolicyScreen() {
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');

  useEffect(() => {
    loadPrivacyPolicy();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      const baseUrl = BACKEND_URL.replace('/api', '');
      const response = await fetch(`${baseUrl}/legal/privacy`);
      if (!response.ok) throw new Error('Failed to load privacy policy');
      const content = await response.text();
      setHtml(content);
    } catch (error) {
      Alert.alert('Error', 'Could not load privacy policy. Please check your internet connection.');
      console.error('Error loading privacy policy:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Privacy Policy', headerShown: true }} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.mist }}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <WebView
          source={{ html }}
          style={{ flex: 1 }}
          scalesPageToFit={true}
          originWhitelist={['*']}
        />
      )}
    </>
  );
}

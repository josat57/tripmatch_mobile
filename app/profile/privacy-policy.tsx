import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors } from '../../src/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000/api';

export default function PrivacyPolicyScreen() {
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');

  useEffect(() => {
    loadPrivacyPolicy();
  }, []);

  const loadPrivacyPolicy = async () => {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/legal/privacy`);
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

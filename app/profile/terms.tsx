import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Colors } from '../../src/theme';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:9000/api';

export default function TermsScreen() {
  const [loading, setLoading] = useState(true);
  const [html, setHtml] = useState('');

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    try {
      const response = await fetch(`${API_URL.replace('/api', '')}/legal/terms`);
      if (!response.ok) throw new Error('Failed to load terms');
      const content = await response.text();
      setHtml(content);
    } catch (error) {
      Alert.alert('Error', 'Could not load terms of service. Please check your internet connection.');
      console.error('Error loading terms:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Service', headerShown: true }} />
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

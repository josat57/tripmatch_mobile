import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../../src/theme';

const BACKEND_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.tripmatch.online/api';

export default function TermsScreen() {
  useEffect(() => {
    openTerms();
  }, []);

  const openTerms = async () => {
    try {
      const baseUrl = BACKEND_URL.replace('/api', '');
      const url = `${baseUrl}/legal/terms`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Error', 'Cannot open terms URL');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open terms of service.');
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Terms of Service', headerShown: true }} />
      <View style={styles.container}>
        <Ionicons name="document-text" size={64} color={Colors.primary} />
        <Text style={styles.text}>Terms of Service</Text>
        <Text style={styles.subtitle}>Opening in your browser...</Text>
        <TouchableOpacity style={styles.button} onPress={openTerms}>
          <Text style={styles.buttonText}>Open Terms of Service</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.mist,
    padding: 20,
  },
  text: {
    fontSize: 20,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    marginTop: 8,
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
    borderRadius: 8,
  },
  buttonText: {
    fontSize: 14,
    fontFamily: Fonts.heading,
    color: Colors.white,
  },
});

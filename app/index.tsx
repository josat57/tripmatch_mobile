import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors } from '../src/theme';

export default function Index() {
  const { user, isLoading } = useAuth();
  const [permsDone,    setPermsDone]    = useState<boolean | null>(null);
  const [onboardDone,  setOnboardDone]  = useState<boolean | null>(null);

  useEffect(() => {
    // Load both flags in parallel; each sets its own state when ready.
    AsyncStorage.getItem('hasSeenPermissions').then((v) => setPermsDone(!!v));
    AsyncStorage.getItem('hasSeenOnboarding').then((v) => setOnboardDone(!!v));
  }, []);

  // Wait for auth + both AsyncStorage reads
  if (isLoading || permsDone === null || onboardDone === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.mist }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // First-ever launch → show permissions screen
  if (!permsDone) return <Redirect href="/permissions" />;

  // Authenticated user who hasn't seen onboarding (e.g. re-installed without re-registering)
  if (user && !onboardDone) return <Redirect href="/onboarding" />;

  return <Redirect href={user ? '/(tabs)' : '/(auth)/login'} />;
}
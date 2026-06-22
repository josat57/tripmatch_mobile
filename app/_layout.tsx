import { useEffect, useRef, useState } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Animated, Image, Platform, StyleSheet } from 'react-native';
import { useFonts } from 'expo-font';
import { DMSans_400Regular } from '@expo-google-fonts/dm-sans/400Regular';
import { DMSans_600SemiBold } from '@expo-google-fonts/dm-sans/600SemiBold';
import { DMSans_700Bold } from '@expo-google-fonts/dm-sans/700Bold';
import { Syne_700Bold } from '@expo-google-fonts/syne/700Bold';
import { Syne_800ExtraBold } from '@expo-google-fonts/syne/800ExtraBold';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider } from '../src/contexts/AuthContext';
import { Auth } from '../src/api/api';
import { Colors, Fonts } from '../src/theme';

// Type-only import — zero runtime execution, safe on all platforms.
import type * as NotificationsNS from 'expo-notifications';

SplashScreen.preventAutoHideAsync();

// expo-notifications throws during module initialisation in Expo Go on Android (SDK 53+).
// Use a conditional require so the native module is never loaded on that platform.
const IS_EXPO_GO_ANDROID =
  Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android';

const Notifications: typeof NotificationsNS | null = IS_EXPO_GO_ANDROID
  ? null
  : (() => {
      try { return require('expo-notifications') as typeof NotificationsNS; } catch { return null; }
    })();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Push notification helpers ───────────────────────────────────────────────

async function registerForPushNotifications() {
  if (!Notifications || !Device.isDevice) return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    // Don't show the system dialog before our permissions screen does.
    const hasSeenPermissions = await AsyncStorage.getItem('hasSeenPermissions');
    if (!hasSeenPermissions) return;
    return;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return;

  try {
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    await Auth.registerDeviceToken(token);
  } catch {}

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
    });
  }
}

function handleNotificationResponse(response: NotificationsNS.NotificationResponse) {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const type = data?.type as string | undefined;

  switch (type) {
    case 'message':
    case 'direct_message': {
      const senderId = data?.senderId as string | undefined;
      const senderName = data?.senderName as string | undefined;
      if (senderId) {
        router.push({
          pathname: '/messages/[id]',
          params: { id: senderId, name: senderName ?? '' },
        });
      }
      break;
    }
    case 'buddy_request':
      router.push('/buddies/requests');
      break;
    case 'trip_invite':
    case 'trip_approved':
    case 'trip_rejected': {
      const tripId = data?.tripId as string | undefined;
      if (tripId) {
        router.push({ pathname: '/trips/[id]', params: { id: tripId } });
      }
      break;
    }
    default:
      router.push('/notifications');
  }
}

// ─── Animated startup screen ─────────────────────────────────────────────────

function StartupOverlay({ onDone }: { onDone: () => void }) {
  const logoOpacity    = useRef(new Animated.Value(0)).current;
  const logoScale      = useRef(new Animated.Value(0.65)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const pulseScale     = useRef(new Animated.Value(0.5)).current;
  const pulseOpacity   = useRef(new Animated.Value(0)).current;
  const ringScale      = useRef(new Animated.Value(0.8)).current;
  const ringOpacity    = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.8, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 0.5, duration: 0,    useNativeDriver: true }),
      ]),
    );
    pulse.start();

    const ring = Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.timing(ringScale, { toValue: 1.8, duration: 1600, useNativeDriver: true }),
        Animated.timing(ringScale, { toValue: 0.8, duration: 0,    useNativeDriver: true }),
      ]),
    );
    ring.start();

    Animated.sequence([
      Animated.parallel([
        Animated.timing(logoOpacity,  { toValue: 1,   duration: 600, useNativeDriver: true }),
        Animated.spring(logoScale,    { toValue: 1, damping: 12, stiffness: 90, useNativeDriver: true }),
        Animated.timing(pulseOpacity, { toValue: 0.5, duration: 600, useNativeDriver: true }),
        Animated.timing(ringOpacity,  { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
      Animated.delay(280),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
      Animated.delay(860),
      Animated.timing(overlayOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
    ]).start(({ finished }) => {
      pulse.stop();
      ring.stop();
      if (finished) onDone();
    });
  }, []);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, startupStyles.overlay, { opacity: overlayOpacity }]}>
      <Animated.View
        style={[startupStyles.pulseRing, startupStyles.pulseRingOuter,
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]}
      />
      <Animated.View
        style={[startupStyles.pulseRing, startupStyles.pulseRingInner,
          { transform: [{ scale: ringScale }], opacity: ringOpacity }]}
      />
      <Animated.View style={[startupStyles.logoWrap, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          source={require('../assets/icon.png')}
          style={startupStyles.logoImage}
          resizeMode="contain"
        />
        <Animated.Text style={[startupStyles.tagline, { opacity: taglineOpacity }]}>
          TRAVEL · CONNECT · EXPLORE
        </Animated.Text>
      </Animated.View>
    </Animated.View>
  );
}

const startupStyles = StyleSheet.create({
  overlay:        { backgroundColor: Colors.earth, justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  pulseRing:      { position: 'absolute', borderRadius: 999, borderWidth: 1.5 },
  pulseRingOuter: { width: 220, height: 220, borderColor: Colors.primary },
  pulseRingInner: { width: 160, height: 160, borderColor: Colors.primaryLight },
  logoWrap:       { alignItems: 'center' },
  logoImage:      { width: 130, height: 130 },
  tagline:        { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.primaryLight, letterSpacing: 3, marginTop: 16 },
});

// ─── Root layout ─────────────────────────────────────────────────────────────

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_600SemiBold,
    DMSans_700Bold,
    Syne_700Bold,
    Syne_800ExtraBold,
  });

  const [startupDone, setStartupDone] = useState(false);

  const notifListener    = useRef<NotificationsNS.EventSubscription | null>(null);
  const responseListener = useRef<NotificationsNS.EventSubscription | null>(null);

  useEffect(() => {
    if (!fontsLoaded) return;

    SplashScreen.hideAsync();

    if (Notifications) {
      registerForPushNotifications();
      notifListener.current    = Notifications.addNotificationReceivedListener(() => {});
      responseListener.current = Notifications.addNotificationResponseReceivedListener(
        handleNotificationResponse,
      );
    }

    return () => {
      notifListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AuthProvider>
      <StatusBar style={startupDone ? 'dark' : 'light'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="permissions" />
        <Stack.Screen name="messages/[id]"   options={{ headerShown: true, title: 'Conversation' }} />
        <Stack.Screen name="notifications"    options={{ headerShown: true, title: 'Notifications' }} />
        <Stack.Screen name="trips/[id]"       options={{ headerShown: true, title: 'Trip Details' }} />
        <Stack.Screen name="trips/create"     options={{ headerShown: true, title: 'Create Trip' }} />
        <Stack.Screen name="profile/edit"     options={{ headerShown: true, title: 'Edit Profile' }} />
        <Stack.Screen name="buddies/requests" options={{ headerShown: true, title: 'Buddy Requests' }} />
      </Stack>

      {!startupDone && <StartupOverlay onDone={() => setStartupDone(true)} />}
    </AuthProvider>
  );
}
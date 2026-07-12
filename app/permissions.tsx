import { useRef, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as NotificationsNS from 'expo-notifications';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors, Fonts } from '../src/theme';
import { Auth } from '../src/api/api';

// expo-notifications crashes on import in Expo Go on Android (SDK 53+) — use conditional require.
const IS_EXPO_GO_ANDROID =
  Constants.executionEnvironment === 'storeClient' && Platform.OS === 'android';

const Notifications: typeof NotificationsNS | null = IS_EXPO_GO_ANDROID
  ? null
  : (() => {
      try { return require('expo-notifications') as typeof NotificationsNS; } catch { return null; }
    })();

const PERMISSIONS = [
  {
    icon: 'notifications' as const,
    title: 'Notifications',
    body: 'Get real-time alerts for trip invites, buddy requests, and messages.',
    accent: Colors.primary,
  },
  {
    icon: 'location' as const,
    title: 'Location',
    body: "Discover trips near you and let companions know where you're headed.",
    accent: Colors.sky,
  },
  {
    icon: 'images' as const,
    title: 'Photos',
    body: 'Upload a profile photo and share memories from your adventures.',
    accent: Colors.forest,
  },
];

export default function PermissionsScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Staggered card entrance animations
  const cardAnims = useRef(PERMISSIONS.map(() => new Animated.Value(0))).current;
  const headerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ...cardAnims.map((anim) =>
        Animated.timing(anim, { toValue: 1, duration: 420, useNativeDriver: true }),
      ),
    ]).start();
  }, []);

  const requestAll = async () => {
    setLoading(true);
    try {
      // Notifications — null on Expo Go Android (push removed in SDK 53+)
      if (Notifications && Device.isDevice) {
        await Notifications.requestPermissionsAsync();

        const { status } = await Notifications.getPermissionsAsync();
        if (status === 'granted') {
          const projectId =
            Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
          if (projectId) {
            try {
              const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
              await Auth.registerDeviceToken(token);
            } catch {}
          }
          if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
              name: 'default',
              importance: Notifications.AndroidImportance.MAX,
            });
          }
        }
      }

      // Location
      await Location.requestForegroundPermissionsAsync();

      // Photos (the app only ever picks from the library, never captures with the camera)
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    } finally {
      await AsyncStorage.setItem('hasSeenPermissions', '1');
      setLoading(false);
      router.replace(user ? '/(tabs)' : '/(auth)/login');
    }
  };

  const skip = async () => {
    await AsyncStorage.setItem('hasSeenPermissions', '1');
    router.replace(user ? '/(tabs)' : '/(auth)/login');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
          },
        ]}
      >
        <View style={styles.iconBadge}>
          <Ionicons name="shield-checkmark" size={32} color={Colors.primary} />
        </View>
        <Text style={styles.heading}>A few quick{'\n'}permissions</Text>
        <Text style={styles.sub}>
          TripMatch works best with access to these features. You can change them anytime in Settings.
        </Text>
      </Animated.View>

      {/* Permission cards */}
      <View style={styles.cards}>
        {PERMISSIONS.map((perm, i) => (
          <Animated.View
            key={perm.title}
            style={[
              styles.card,
              {
                opacity: cardAnims[i],
                transform: [
                  {
                    translateY: cardAnims[i].interpolate({
                      inputRange: [0, 1],
                      outputRange: [32, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={[styles.cardIcon, { backgroundColor: perm.accent + '18' }]}>
              <Ionicons name={perm.icon} size={26} color={perm.accent} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{perm.title}</Text>
              <Text style={styles.cardBody}>{perm.body}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.grantBtn, loading && { opacity: 0.7 }]}
          onPress={requestAll}
          disabled={loading}
        >
          <Ionicons name="checkmark-circle" size={20} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.grantBtnText}>
            {loading ? 'Requesting…' : 'Allow all permissions'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipBtn} onPress={skip} disabled={loading}>
          <Text style={styles.skipText}>Maybe later</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 72,
    paddingBottom: 40,
    justifyContent: 'space-between',
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBadge: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: Colors.primaryLight,
  },
  heading: {
    fontSize: 30,
    fontFamily: Fonts.headingXL,
    color: Colors.textDark,
    textAlign: 'center',
    lineHeight: 38,
    marginBottom: 12,
  },
  sub: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  cards: {
    gap: 14,
    flex: 1,
    justifyContent: 'center',
    marginVertical: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bgCard,
    borderRadius: 18,
    padding: 18,
    gap: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  cardText: { flex: 1 },
  cardTitle: {
    fontSize: 15,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    lineHeight: 19,
  },
  actions: { gap: 10 },
  grantBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bodyBold,
    color: Colors.white,
  },
  skipBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  skipText: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textMuted,
  },
});
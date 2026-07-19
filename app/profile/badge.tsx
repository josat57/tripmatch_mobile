import { useNavigation, Stack } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useEffect } from 'react';
import VerifiedBadgeCard from '../../src/components/VerifiedBadgeCard';
import { Colors } from '../../src/theme';

export default function BadgeScreen() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Verified Badge' });
  }, [navigation]);

  return (
    <>
      <Stack.Screen options={{ title: 'Verified Badge', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <VerifiedBadgeCard />

        <View style={styles.infoSection}>
          <View style={styles.infoBox}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Identity Verified</Text>
              <Text style={styles.infoText}>Your identity has been verified and approved.</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Build Trust</Text>
              <Text style={styles.infoText}>Your verified badge shows on your profile to build trust with other travelers.</Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>Share Your Badge</Text>
              <Text style={styles.infoText}>Download and share your badge on social media or in messages.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

import { Text } from 'react-native';
import { Fonts } from '../../src/theme';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  content: { padding: 20, paddingBottom: 40 },
  infoSection: { marginTop: 24, gap: 12 },
  infoBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: Colors.bgCard,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: Fonts.bodyBold,
    color: Colors.textDark,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});

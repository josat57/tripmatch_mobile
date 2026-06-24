import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator,
  TouchableOpacity, Share, Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Users } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

interface TravelDNA {
  archetype: string;
  traits: string[];
  budgetTier: string;
  travelFrequency: string;
  topAccommodation: string;
  shareUrl?: string;
}

const ARCHETYPE_EMOJI: Record<string, string> = {
  'The Luxury Explorer':   '💎',
  'The Adventure Seeker':  '🧗',
  'The Cultural Nomad':    '🏛️',
  'The Budget Backpacker': '🎒',
  'The Beach Wanderer':    '🏖️',
  'The Foodie Explorer':   '🍜',
  'The Curious Traveler':  '🌍',
};

const TRAIT_ICONS: Record<string, string> = {
  'Trail Blazer': '🥾', 'Photo Enthusiast': '📸', 'Culture Lover': '🎭',
  Foodie: '🍽️', 'Luxury Lover': '✨', 'Adrenaline Junkie': '⚡',
  'Eco Warrior': '🌿', 'Slow Traveler': '🧘', 'Retail Explorer': '🛍️',
};

export default function TravelDNAScreen() {
  const { user } = useAuth();
  const [dna, setDna]       = useState<TravelDNA | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?._id) return;
    Users.getTravelDNA(user._id)
      .then((d) => setDna(d as TravelDNA))
      .catch(() => Alert.alert('Error', 'Could not load Travel DNA.'))
      .finally(() => setLoading(false));
  }, [user?._id]);

  const handleShare = async () => {
    if (!dna) return;
    await Share.share({
      message: `My TripMatch Travel DNA: ${dna.archetype} ${ARCHETYPE_EMOJI[dna.archetype] ?? '✈️'}\nFind your match at tripmatch.io`,
      url: dna.shareUrl,
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Travel DNA', headerShown: true }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : !dna ? (
          <Text style={styles.error}>Could not load your Travel DNA. Update your travel preferences in your profile.</Text>
        ) : (
          <>
            {/* Archetype hero */}
            <View style={styles.hero}>
              <Text style={styles.heroEmoji}>{ARCHETYPE_EMOJI[dna.archetype] ?? '✈️'}</Text>
              <Text style={styles.heroLabel}>You are</Text>
              <Text style={styles.heroArchetype}>{dna.archetype}</Text>
            </View>

            {/* Traits */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your top traits</Text>
              <View style={styles.traitGrid}>
                {dna.traits.map((t) => (
                  <View key={t} style={styles.traitCard}>
                    <Text style={styles.traitIcon}>{TRAIT_ICONS[t] ?? '⭐'}</Text>
                    <Text style={styles.traitLabel}>{t}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Stats */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Travel profile</Text>
              {[
                { icon: 'wallet-outline', label: 'Budget tier',       value: dna.budgetTier },
                { icon: 'airplane-outline', label: 'Travel frequency', value: dna.travelFrequency },
                { icon: 'bed-outline', label: 'Preferred stay',       value: dna.topAccommodation },
              ].map(({ icon, label, value }) => (
                <View key={label} style={styles.statRow}>
                  <Ionicons name={icon as React.ComponentProps<typeof Ionicons>['name']} size={20} color={Colors.primary} />
                  <View style={styles.statText}>
                    <Text style={styles.statLabel}>{label}</Text>
                    <Text style={styles.statValue}>{value}</Text>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color={Colors.white} />
              <Text style={styles.shareBtnText}>Share my Travel DNA</Text>
            </TouchableOpacity>

            <Text style={styles.hint}>
              Update your travel preferences in Edit Profile to refine your DNA.
            </Text>
          </>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  content: { padding: 20, paddingBottom: 40 },
  loader: { marginTop: 80 },
  error: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', marginTop: 60, lineHeight: 22 },
  hero: {
    backgroundColor: Colors.earth, borderRadius: 20, padding: 32,
    alignItems: 'center', marginBottom: 20,
  },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroLabel: { fontSize: 13, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.7)', letterSpacing: 1 },
  heroArchetype: { fontSize: 24, fontFamily: Fonts.heading, color: Colors.white, textAlign: 'center', marginTop: 4 },
  section: { backgroundColor: Colors.white, borderRadius: 16, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted, letterSpacing: 0.8, marginBottom: 14, textTransform: 'uppercase' },
  traitGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  traitCard: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.bgMist, borderRadius: 100,
    paddingHorizontal: 14, paddingVertical: 8,
  },
  traitIcon: { fontSize: 16 },
  traitLabel: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textDark },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderLight },
  statText: { flex: 1 },
  statLabel: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },
  statValue: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textDark, marginTop: 1 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 14, marginBottom: 16,
  },
  shareBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
  hint: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});

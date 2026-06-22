import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../src/contexts/AuthContext';
import { Colors, Fonts } from '../src/theme';

const { width: W } = Dimensions.get('window');

interface Slide {
  key: string;
  emoji: string;
  emojiLabel: string;
  title: string;
  body: string;
  bg: string;
  accentText: string;
  dotActive: string;
  dotInactive: string;
}

const SLIDES: Slide[] = [
  {
    key: 'welcome',
    emoji: '✈️',
    emojiLabel: 'plane',
    title: 'Welcome to\nTripMatch',
    body: 'Your new favourite travel companion — discover destinations, connect with like-minded explorers, and make every journey unforgettable.',
    bg: Colors.earth,
    accentText: Colors.primary,
    dotActive: Colors.primary,
    dotInactive: 'rgba(125,196,42,0.3)',
  },
  {
    key: 'match',
    emoji: '🤝',
    emojiLabel: 'handshake',
    title: 'Find your\ntravel tribe',
    body: "Our AI analyses your travel style, budget, and destinations to match you with compatible companions you'll actually get on with.",
    bg: Colors.primaryDark,
    accentText: Colors.primaryLight,
    dotActive: Colors.primaryLight,
    dotInactive: 'rgba(181,224,74,0.3)',
  },
  {
    key: 'trips',
    emoji: '🗺️',
    emojiLabel: 'map',
    title: 'Discover &\njoin trips',
    body: 'Browse real trips organised by verified travellers. Request to join an existing adventure or post your own and find crew.',
    bg: Colors.ocean,
    accentText: Colors.sky,
    dotActive: Colors.sky,
    dotInactive: 'rgba(0,174,239,0.3)',
  },
  {
    key: 'chat',
    emoji: '💬',
    emojiLabel: 'chat',
    title: 'Plan together,\ntravel better',
    body: 'Message your companions before and during the trip. Coordinate logistics, share tips, and build friendships that outlast the journey.',
    bg: Colors.forest,
    accentText: '#6ee7b7',
    dotActive: '#6ee7b7',
    dotInactive: 'rgba(110,231,183,0.3)',
  },
];

export default function OnboardingScreen() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const slide = SLIDES[page];

  const goNext = () => {
    if (page < SLIDES.length - 1) {
      const next = page + 1;
      scrollRef.current?.scrollTo({ x: next * W, animated: true });
      setPage(next);
    } else {
      finish();
    }
  };

  const finish = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', '1');
    router.replace('/(tabs)');
  };

  const skip = async () => {
    await AsyncStorage.setItem('hasSeenOnboarding', '1');
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.root}>
      {/* Slide pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled
        onMomentumScrollEnd={(e) => {
          const newPage = Math.round(e.nativeEvent.contentOffset.x / W);
          setPage(newPage);
        }}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={s.key} style={[styles.slide, { width: W, backgroundColor: s.bg }]}>
            <SafeAreaView style={styles.slideSafe}>
              {/* Skip button */}
              {i < SLIDES.length - 1 && (
                <TouchableOpacity style={styles.skipTopBtn} onPress={skip}>
                  <Text style={[styles.skipTopText, { color: s.accentText + 'cc' }]}>Skip</Text>
                </TouchableOpacity>
              )}

              {/* Slide content */}
              <View style={styles.slideContent}>
                {/* Emoji badge */}
                <View style={[styles.emojiBadge, { borderColor: s.accentText + '40' }]}>
                  <Text style={styles.emoji}>{s.emoji}</Text>
                </View>

                {/* Personalised welcome on first slide */}
                {i === 0 && user?.firstName ? (
                  <Text style={[styles.slideTitle, { color: s.accentText }]}>
                    Welcome,{'\n'}{user.firstName}!
                  </Text>
                ) : (
                  <Text style={[styles.slideTitle, { color: s.accentText }]}>{s.title}</Text>
                )}

                <Text style={styles.slideBody}>{s.body}</Text>
              </View>
            </SafeAreaView>
          </View>
        ))}
      </ScrollView>

      {/* Fixed bottom control bar */}
      <View style={[styles.bar, { backgroundColor: slide.bg }]}>
        {/* Progress dots */}
        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => {
                scrollRef.current?.scrollTo({ x: i * W, animated: true });
                setPage(i);
              }}
              hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            >
              <View
                style={[
                  styles.dot,
                  i === page
                    ? [styles.dotActive, { backgroundColor: slide.dotActive, width: 24 }]
                    : [styles.dotInactive, { backgroundColor: slide.dotInactive }],
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next / finish button */}
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: slide.accentText }]}
          onPress={goNext}
        >
          {page === SLIDES.length - 1 ? (
            <Text style={[styles.nextBtnText, { color: slide.bg }]}>Let's go!</Text>
          ) : (
            <>
              <Text style={[styles.nextBtnText, { color: slide.bg }]}>Next</Text>
              <Ionicons name="arrow-forward" size={16} color={slide.bg} style={{ marginLeft: 6 }} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Slides
  slide: { flex: 1 },
  slideSafe: { flex: 1, paddingHorizontal: 28, paddingBottom: 20 },
  skipTopBtn: { alignSelf: 'flex-end', paddingTop: 16, paddingBottom: 8 },
  skipTopText: { fontSize: 14, fontFamily: Fonts.bodySemiBold },
  slideContent: { flex: 1, justifyContent: 'center', paddingBottom: 40 },

  emojiBadge: {
    width: 110,
    height: 110,
    borderRadius: 36,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 36,
  },
  emoji: { fontSize: 52 },

  slideTitle: {
    fontSize: 36,
    fontFamily: Fonts.headingXL,
    lineHeight: 44,
    marginBottom: 18,
    letterSpacing: -0.5,
  },
  slideBody: {
    fontSize: 15,
    fontFamily: Fonts.body,
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 24,
    maxWidth: 340,
  },

  // Bottom bar
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 20,
    paddingBottom: 36,
  },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  dotInactive: { width: 8 },

  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 100,
  },
  nextBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold },
});
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../theme';
import type { EligibilityCheck } from './TripCreationPolicyModal';

interface TripPolicyContentProps {
  mode?: 'modal' | 'page';
  eligibility?: EligibilityCheck[];
}

const SECTIONS = [
  {
    id: 'overview',
    title: 'What is a TripMatch Trip?',
    icon: 'globe-outline',
    color: Colors.primary,
    intro: 'TripMatch trips are community-organised group travel experiences. As a creator you design the journey; TripMatch connects you with compatible travel companions.',
    bullets: [
      'You set the destination, dates, budget and style.',
      'Participants request to join and you approve or decline.',
      'TripMatch handles matching, messaging and payments logistics.',
      'Trips can be public (discoverable by everyone) or private (invite-only).',
    ],
  },
  {
    id: 'eligibility',
    title: 'Creator Eligibility',
    icon: 'shield-outline',
    color: Colors.primary,
    intro: 'To protect every traveller on TripMatch, trip creators must meet all four requirements below before they can publish a trip.',
    bullets: [],
    custom: 'eligibility',
  },
  {
    id: 'responsibilities',
    title: 'Your Responsibilities',
    icon: 'star-outline',
    color: Colors.primary,
    intro: 'As a trip creator you take on a leadership role. Here is what that means in practice:',
    bullets: [
      'Provide accurate, honest information — destination, dates, costs, activities.',
      'Respond to participant queries within 48 hours.',
      'Give participants reasonable notice (≥ 14 days) before cancelling.',
      'Ensure trip activities are legal in the destination country.',
      'Share safety information (emergency contacts, travel advisories) with your group.',
      'Treat all participants with respect regardless of background, identity or ability.',
    ],
  },
  {
    id: 'content',
    title: 'Trip Content Guidelines',
    icon: 'document-text-outline',
    color: Colors.primary,
    intro: 'Your trip listing must meet TripMatch content standards to remain published.',
    subsections: [
      {
        label: 'Allowed',
        icon: 'checkmark-circle-outline',
        color: Colors.primary,
        items: [
          'Adventure, cultural, wellness, culinary and social travel',
          'Family-friendly or adult-only trips (clearly labelled)',
          'International and domestic destinations',
          'LGBTQ+ inclusive experiences',
        ],
      },
      {
        label: 'Not Allowed',
        icon: 'close-circle-outline',
        color: '#ef4444',
        items: [
          'Illegal activities or controlled substances',
          'Misleading descriptions or fabricated photos',
          'Discriminatory or exclusionary language',
          'Trips that violate destination country law',
          'Content that exploits or endangers minors',
        ],
      },
    ],
  },
  {
    id: 'cancellation',
    title: 'Cancellation & Modifications',
    icon: 'time-outline',
    color: Colors.primary,
    intro: 'Plans change — here is how TripMatch handles cancellations and updates.',
    subsections: [
      {
        label: 'If you cancel the trip',
        icon: 'alert-circle-outline',
        color: '#f59e0b',
        items: [
          '> 30 days notice — full refund to all participants.',
          '14–30 days notice — 50% refund to participants.',
          '< 14 days notice — no refund; may affect your creator rating.',
          'Repeated late cancellations may result in account review.',
        ],
      },
      {
        label: 'Modifications',
        icon: 'information-circle-outline',
        color: '#3b82f6',
        items: [
          'Minor changes (meeting point, accommodation) — notify participants in-app.',
          'Major changes (destination, dates, budget > 20%) — participants may withdraw with full refund.',
          'All changes must be communicated before the trip departure date.',
        ],
      },
    ],
  },
  {
    id: 'community',
    title: 'Community Standards',
    icon: 'heart-outline',
    color: Colors.primary,
    intro: 'TripMatch is built on mutual respect. Every member — creator or participant — must uphold these standards.',
    bullets: [
      'Zero tolerance for harassment, discrimination or hate speech.',
      'Respect personal boundaries and privacy of fellow travellers.',
      'Report unsafe behaviour immediately via the in-app report tool.',
      'Do not share other members\' personal information outside the platform.',
      'Violations may result in trip removal, account suspension or a permanent ban.',
    ],
  },
];

export default function TripPolicyContent({ mode = 'modal', eligibility }: TripPolicyContentProps) {
  return (
    <View>
      {SECTIONS.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: `${section.color}20` }]}>
              <Ionicons name={section.icon as any} size={20} color={section.color} />
            </View>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>

          <Text style={styles.intro}>{section.intro}</Text>

          {/* Eligibility Checklist */}
          {section.custom === 'eligibility' && eligibility ? (
            <View style={styles.checklistContainer}>
              {eligibility.map((check) => (
                <View key={check.id} style={styles.checklistItem}>
                  <View
                    style={[
                      styles.checklistIcon,
                      {
                        backgroundColor: check.passed
                          ? `${Colors.primary}20`
                          : check.passed === null
                            ? `${Colors.textMuted}20`
                            : '#ef444420',
                      },
                    ]}
                  >
                    <Ionicons
                      name={
                        check.passed === true
                          ? 'checkmark-circle'
                          : check.passed === false
                            ? 'close-circle'
                            : 'help-circle'
                      }
                      size={20}
                      color={
                        check.passed === true
                          ? Colors.primary
                          : check.passed === false
                            ? '#ef4444'
                            : Colors.textMuted
                      }
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.checklistLabel}>{check.label}</Text>
                    <Text style={styles.checklistDesc}>{check.description}</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          {/* Bullets */}
          {section.bullets && section.bullets.length > 0 ? (
            <View style={styles.bulletList}>
              {section.bullets.map((bullet, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* Subsections */}
          {section.subsections ? (
            <View style={styles.subsectionsContainer}>
              {section.subsections.map((subsection, idx) => (
                <View key={idx} style={styles.subsection}>
                  <View style={styles.subsectionHeader}>
                    <Ionicons name={subsection.icon as any} size={16} color={subsection.color} />
                    <Text style={[styles.subsectionTitle, { color: subsection.color }]}>
                      {subsection.label}
                    </Text>
                  </View>
                  <View style={styles.subsectionItems}>
                    {subsection.items.map((item, itemIdx) => (
                      <View key={itemIdx} style={styles.bulletItem}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    flex: 1,
  },
  intro: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textBody,
    lineHeight: 20,
    marginBottom: 16,
  },
  checklistContainer: {
    gap: 12,
    marginBottom: 16,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checklistIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checklistLabel: {
    fontSize: 13,
    fontFamily: Fonts.heading,
    color: Colors.textDark,
    marginBottom: 2,
  },
  checklistDesc: {
    fontSize: 11,
    fontFamily: Fonts.body,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  bulletList: {
    gap: 10,
    marginBottom: 16,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bulletDot: {
    fontSize: 14,
    fontFamily: Fonts.body,
    color: Colors.primary,
    marginTop: 2,
    minWidth: 14,
  },
  bulletText: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textBody,
    lineHeight: 19,
    flex: 1,
  },
  subsectionsContainer: {
    gap: 16,
  },
  subsection: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  subsectionTitle: {
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
  subsectionItems: {
    gap: 9,
  },
});
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts } from '../theme';

interface Filters {
  minBudget?: number;
  maxBudget?: number;
  style?: string;
  minDays?: number;
  maxDays?: number;
}

interface Props {
  visible: boolean;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  onClose: () => void;
}

const TRAVEL_STYLES = ['Adventure', 'Cultural', 'Luxury', 'Budget', 'Backpacking', 'Beach', 'Hiking', 'Wellness'];
const BUDGET_OPTIONS = [
  { label: 'Under $1k', min: 0, max: 1000 },
  { label: '$1k–$3k', min: 1000, max: 3000 },
  { label: '$3k–$8k', min: 3000, max: 8000 },
  { label: '$8k–$20k', min: 8000, max: 20000 },
  { label: '$20k+', min: 20000, max: 999999 },
];

export default function SearchFiltersSheet({ visible, filters, onFiltersChange, onClose }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Filter Trips</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textDark} />
          </TouchableOpacity>
        </View>

        {/* Travel Style */}
        <Text style={styles.sectionTitle}>Travel Style</Text>
        <View style={styles.chipGrid}>
          {TRAVEL_STYLES.map((style) => (
            <TouchableOpacity
              key={style}
              onPress={() => onFiltersChange({ ...filters, style: filters.style === style ? undefined : style })}
              style={[styles.chip, filters.style === style && styles.chipActive]}
            >
              <Text style={[styles.chipText, filters.style === style && styles.chipTextActive]}>
                {style}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Budget */}
        <Text style={styles.sectionTitle}>Budget per person</Text>
        <View style={styles.chipGrid}>
          {BUDGET_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => onFiltersChange({ ...filters, minBudget: opt.min, maxBudget: opt.max })}
              style={[
                styles.chip,
                filters.minBudget === opt.min && filters.maxBudget === opt.max && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filters.minBudget === opt.min && filters.maxBudget === opt.max && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.sectionTitle}>Trip Duration</Text>
        <View style={styles.chipGrid}>
          {[
            { label: 'Weekend (1-3 days)', min: 1, max: 3 },
            { label: 'Week (4-7 days)', min: 4, max: 7 },
            { label: '2 weeks (8-14 days)', min: 8, max: 14 },
            { label: '3+ weeks (15+ days)', min: 15, max: 365 },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.label}
              onPress={() => onFiltersChange({ ...filters, minDays: opt.min, maxDays: opt.max })}
              style={[
                styles.chip,
                filters.minDays === opt.min && filters.maxDays === opt.max && styles.chipActive,
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  filters.minDays === opt.min && filters.maxDays === opt.max && styles.chipTextActive,
                ]}
              >
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Clear Filters */}
        {Object.keys(filters).some((k) => filters[k as keyof Filters]) && (
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={() => onFiltersChange({})}
          >
            <Text style={styles.clearBtnText}>Clear all filters</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.applyBtn} onPress={onClose}>
          <Text style={styles.applyBtnText}>Apply filters</Text>
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.textDark },
  closeBtn: { padding: 4 },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.textDark, marginTop: 20, marginBottom: 12 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  chipText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted },
  chipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  clearBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  clearBtnText: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.error },
  applyBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  applyBtnText: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.white },
});

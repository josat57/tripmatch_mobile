import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Trips } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

const CATEGORIES = ['Adventure', 'Relaxation', 'Cultural', 'Business', 'Educational', 'Other'];
const TRAVEL_STYLES = ['Adventure', 'Cultural', 'Luxury', 'Budget', 'Backpacking', 'Beach', 'Hiking', 'Wellness'];
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AUD', 'CAD'];

export default function CreateTripScreen() {
  const [loading, setLoading] = useState(false);

  const [title, setTitle]             = useState('');
  const [description, setDescription] = useState('');
  const [city, setCity]               = useState('');
  const [country, setCountry]         = useState('');
  const [startDate, setStartDate]     = useState('');
  const [endDate, setEndDate]         = useState('');
  const [budgetAmount, setBudgetAmount] = useState('');
  const [currency, setCurrency]       = useState('USD');
  const [maxPax, setMaxPax]           = useState('');
  const [category, setCategory]       = useState('');
  const [styles2, setStyles2]         = useState<string[]>([]);

  const toggleStyle = (s: string) =>
    setStyles2((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing info', 'Please enter a trip title.');
      return;
    }
    if (!category) {
      Alert.alert('Missing info', 'Please select a category.');
      return;
    }
    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      Alert.alert('Invalid date', 'Start date must be in YYYY-MM-DD format.');
      return;
    }
    if (endDate && !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      Alert.alert('Invalid date', 'End date must be in YYYY-MM-DD format.');
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        locations: {
          address: {
            city: city.trim() || undefined,
            country: country.trim() || undefined,
          },
        },
        travelStyle: styles2.length > 0 ? styles2 : undefined,
      };
      if (startDate) payload.startDate = startDate;
      if (endDate)   payload.endDate   = endDate;
      if (budgetAmount && !isNaN(Number(budgetAmount))) {
        payload.budget = { amount: Number(budgetAmount), currency };
      }
      if (maxPax && !isNaN(Number(maxPax))) {
        payload.capacity = { max: Number(maxPax) };
      }

      await Trips.create(payload);
      Alert.alert('Trip created!', 'Your trip has been posted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: unknown) {
      Alert.alert(
        'Error',
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
          'Could not create trip. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Create Trip', headerShown: true }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

          <View style={styles.field}>
            <Text style={styles.label}>Trip title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Backpacking through Vietnam"
              placeholderTextColor={Colors.textLight}
              maxLength={100}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Tell potential companions about this trip…"
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={4}
              maxLength={1000}
            />
          </View>

          <Text style={styles.sectionLabel}>Category *</Text>
          <View style={styles.chipGrid}>
            {CATEGORIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.chip, category === c && styles.chipActive]}
              >
                <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Travel style</Text>
          <View style={styles.chipGrid}>
            {TRAVEL_STYLES.map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => toggleStyle(s)}
                style={[styles.chip, styles2.includes(s) && styles.chipActive]}
              >
                <Text style={[styles.chipText, styles2.includes(s) && styles.chipTextActive]}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.sectionLabel}>Destination</Text>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>City</Text>
              <TextInput
                style={styles.input}
                value={city}
                onChangeText={setCity}
                placeholder="Bangkok"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="Thailand"
                placeholderTextColor={Colors.textLight}
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Dates</Text>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Start (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={startDate}
                onChangeText={setStartDate}
                placeholder="2025-03-01"
                placeholderTextColor={Colors.textLight}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>End (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={endDate}
                onChangeText={setEndDate}
                placeholder="2025-03-14"
                placeholderTextColor={Colors.textLight}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>

          <Text style={styles.sectionLabel}>Budget (per person)</Text>
          <View style={styles.row}>
            <View style={[styles.field, { flex: 2 }]}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder="2500"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>
            <View style={[styles.field, { flex: 1 }]}>
              <Text style={styles.label}>Currency</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 2 }}>
                {CURRENCIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setCurrency(c)}
                    style={[styles.currencyChip, currency === c && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Max participants</Text>
            <TextInput
              style={styles.input}
              value={maxPax}
              onChangeText={setMaxPax}
              placeholder="8"
              placeholderTextColor={Colors.textLight}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleCreate} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
                <Text style={styles.submitBtnText}>Create Trip</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { padding: 20, paddingBottom: 40 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.bodySemiBold,
    color: Colors.textBody,
    marginBottom: 10,
    marginTop: 8,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  chipText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  chipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  currencyChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: 6,
  },
  row: { flexDirection: 'row', gap: 10 },
  submitBtn: {
    marginTop: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitBtnText: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.white },
});

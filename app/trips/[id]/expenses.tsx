import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Expenses } from '../../../src/api/api';
import { Colors, Fonts } from '../../../src/theme';

const CATEGORIES = ['food', 'transport', 'accommodation', 'activities', 'other'] as const;
type ExpenseCategory = typeof CATEGORIES[number];

const CAT_ICONS: Record<ExpenseCategory, string> = {
  food: '🍽️', transport: '🚌', accommodation: '🛏️', activities: '🎯', other: '📦',
};

interface Expense {
  _id: string;
  description: string;
  amount: number;
  category: ExpenseCategory;
  date?: string;
  paidBy?: { firstName?: string; lastName?: string };
  splitBetween?: { user: string; share: number; settled?: boolean }[];
  settled?: boolean;
}

interface Summary {
  total?: number;
  perPerson?: number;
  currency?: string;
}

export default function TripExpensesScreen() {
  const { id: tripId } = useLocalSearchParams<{ id: string }>();
  const [expenses, setExpenses]   = useState<Expense[]>([]);
  const [summary, setSummary]     = useState<Summary>({});
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Form state
  const [desc, setDesc]           = useState('');
  const [amount, setAmount]       = useState('');
  const [category, setCategory]   = useState<ExpenseCategory>('food');

  const load = useCallback(async (silent = false) => {
    if (!tripId) return;
    if (!silent) setLoading(true);
    try {
      const data = await Expenses.list(tripId) as { expenses?: Expense[]; summary?: Summary } | Expense[];
      if (Array.isArray(data)) {
        setExpenses(data);
      } else {
        setExpenses(data.expenses ?? []);
        setSummary(data.summary ?? {});
      }
    } catch {
      Alert.alert('Error', 'Could not load expenses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tripId]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleAdd = async () => {
    if (!desc.trim()) return Alert.alert('Required', 'Enter a description.');
    if (!amount || isNaN(Number(amount))) return Alert.alert('Required', 'Enter a valid amount.');
    setSaving(true);
    try {
      await Expenses.add(tripId!, {
        description: desc.trim(),
        amount: Number(amount),
        category,
        splitBetween: [],
      });
      setModalOpen(false);
      setDesc('');
      setAmount('');
      setCategory('food');
      load(true);
    } catch (err: unknown) {
      Alert.alert('Error', (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Could not add expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleSettle = (expense: Expense) => {
    Alert.alert('Mark settled', `Mark "${expense.description}" as settled?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Settle', onPress: async () => {
          try {
            await Expenses.settle(tripId!, expense._id);
            load(true);
          } catch {
            Alert.alert('Error', 'Could not mark as settled.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: Expense }) => (
    <View style={[styles.card, item.settled && styles.cardSettled]}>
      <View style={styles.catIcon}>
        <Text style={{ fontSize: 22 }}>{CAT_ICONS[item.category] ?? '📦'}</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDesc}>{item.description}</Text>
        <Text style={styles.cardMeta}>
          {item.paidBy ? `Paid by ${item.paidBy.firstName}` : 'Paid by member'}
          {item.date ? ` · ${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.cardAmount}>${item.amount.toLocaleString()}</Text>
        {!item.settled && (
          <TouchableOpacity onPress={() => handleSettle(item)} style={styles.settleBtn}>
            <Text style={styles.settleBtnText}>Settle</Text>
          </TouchableOpacity>
        )}
        {item.settled && <Text style={styles.settledBadge}>Settled</Text>}
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Expenses',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => setModalOpen(true)} style={{ marginRight: 4 }}>
              <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {/* Summary banner */}
        {(summary.total !== undefined) && (
          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>Total</Text>
              <Text style={styles.summaryValue}>{summary.currency ?? '$'}{summary.total?.toLocaleString()}</Text>
            </View>
            {summary.perPerson !== undefined && (
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Per person</Text>
                <Text style={styles.summaryValue}>{summary.currency ?? '$'}{summary.perPerson?.toLocaleString()}</Text>
              </View>
            )}
          </View>
        )}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} />
        ) : (
          <FlatList
            data={expenses}
            keyExtractor={(e) => e._id}
            renderItem={renderItem}
            contentContainerStyle={expenses.length === 0 ? styles.emptyContainer : styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💸</Text>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptyText}>Track and split costs with your travel group.</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
                  <Text style={styles.addBtnText}>Add expense</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Add expense modal */}
      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalOpen(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.sheet} keyboardShouldPersistTaps="handled">
            <Text style={styles.sheetTitle}>Add expense</Text>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Description *</Text>
              <TextInput style={styles.input} value={desc} onChangeText={setDesc}
                placeholder="e.g. Dinner at the beach" placeholderTextColor={Colors.textLight} autoFocus />
            </View>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Amount (USD) *</Text>
              <TextInput style={styles.input} value={amount} onChangeText={setAmount}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={Colors.textLight} />
            </View>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity key={c} style={[styles.catChip, category === c && styles.catChipActive]} onPress={() => setCategory(c)}>
                  <Text>{CAT_ICONS[c]}</Text>
                  <Text style={[styles.catChipText, category === c && styles.catChipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.sheetActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { flex: 1, marginTop: 0 }]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  summary: { flexDirection: 'row', backgroundColor: Colors.earth, padding: 16, gap: 24 },
  summaryItem: {},
  summaryLabel: { fontSize: 11, fontFamily: Fonts.body, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: 0.8 },
  summaryValue: { fontSize: 20, fontFamily: Fonts.heading, color: Colors.white },
  loader: { marginTop: 60 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardSettled: { opacity: 0.6 },
  catIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.bgMist, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardDesc: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textDark },
  cardMeta: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 2 },
  cardRight: { alignItems: 'flex-end', gap: 4 },
  cardAmount: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  settleBtn: { backgroundColor: Colors.primary + '20', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  settleBtnText: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.primaryDark },
  settledBadge: { fontSize: 11, fontFamily: Fonts.bodySemiBold, color: Colors.textMuted },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 6 },
  emptyText: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, maxHeight: '90%' },
  sheetTitle: { fontSize: 17, fontFamily: Fonts.bodySemiBold, color: Colors.textDark, marginBottom: 20 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    fontFamily: Fonts.body, color: Colors.textDark, backgroundColor: Colors.bgInput,
  },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 100, borderWidth: 1.5, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primaryDark },
  catChipText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, textTransform: 'capitalize' },
  catChipTextActive: { color: Colors.white, fontFamily: Fonts.bodySemiBold },
  sheetActions: { flexDirection: 'row', gap: 10, marginTop: 8, paddingBottom: Platform.OS === 'ios' ? 20 : 8 },
  cancelBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.textMuted },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  addBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
});
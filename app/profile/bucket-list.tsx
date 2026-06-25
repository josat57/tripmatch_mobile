import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Alert, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Users } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

interface BucketItem {
  destination: string;
  country?: string;
  addedAt?: string;
}

export default function BucketListScreen() {
  const [items, setItems]       = useState<BucketItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [destination, setDestination]   = useState('');
  const [country, setCountry]           = useState('');
  const [saving, setSaving]             = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await Users.getBucketList() as BucketItem[];
      setItems(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert('Error', 'Could not load bucket list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => { setRefreshing(true); load(true); };

  const handleAdd = async () => {
    if (!destination.trim()) return Alert.alert('Required', 'Enter a destination.');
    setSaving(true);
    try {
      const updated = await Users.addToBucketList(destination.trim(), country.trim() || undefined) as BucketItem[];
      setItems(Array.isArray(updated) ? updated : items);
      setModalVisible(false);
      setDestination('');
      setCountry('');
    } catch {
      Alert.alert('Error', 'Could not add destination.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (dest: string) => {
    Alert.alert('Remove', `Remove ${dest} from your bucket list?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await Users.removeFromBucketList(dest) as BucketItem[];
            setItems(Array.isArray(updated) ? updated : items.filter((i) => i.destination !== dest));
          } catch {
            Alert.alert('Error', 'Could not remove destination.');
          }
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: BucketItem }) => (
    <View style={styles.card}>
      <View style={styles.cardIcon}>
        <Text style={{ fontSize: 24 }}>📍</Text>
      </View>
      <View style={styles.cardBody}>
        <Text style={styles.cardDest}>{item.destination}</Text>
        {item.country ? <Text style={styles.cardCountry}>{item.country}</Text> : null}
        {item.addedAt && (
          <Text style={styles.cardDate}>
            Added {new Date(item.addedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={() => handleDelete(item.destination)} style={styles.deleteBtn} accessibilityLabel={`Remove ${item.destination} from bucket list`}>
        <Ionicons name="trash-outline" size={18} color={Colors.error} />
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Bucket List',
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity onPress={() => setModalVisible(true)} style={{ marginRight: 4 }} accessibilityLabel="Add to bucket list">
              <Ionicons name="add-circle-outline" size={26} color={Colors.primary} />
            </TouchableOpacity>
          ),
        }}
      />
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator style={styles.loader} color={Colors.primary} size="large" />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.destination}
            renderItem={renderItem}
            contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyBox}>
                <Text style={{ fontSize: 48, marginBottom: 12 }}>🌍</Text>
                <Text style={styles.emptyTitle}>Your bucket list is empty</Text>
                <Text style={styles.emptyText}>Add destinations you dream of visiting.</Text>
                <TouchableOpacity style={styles.addBtn} onPress={() => setModalVisible(true)}>
                  <Text style={styles.addBtnText}>Add destination</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Add destination modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setModalVisible(false)} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add to bucket list</Text>
            <View style={styles.field}>
              <Text style={styles.label}>Destination *</Text>
              <TextInput
                style={styles.input}
                value={destination}
                onChangeText={setDestination}
                placeholder="e.g. Machu Picchu"
                placeholderTextColor={Colors.textLight}
                autoFocus
              />
            </View>
            <View style={styles.field}>
              <Text style={styles.label}>Country</Text>
              <TextInput
                style={styles.input}
                value={country}
                onChangeText={setCountry}
                placeholder="e.g. Peru"
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <View style={styles.sheetRow}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.addBtn, { flex: 1 }]} onPress={handleAdd} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={Colors.white} />
                  : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgMist },
  loader: { marginTop: 80 },
  list: { padding: 16, gap: 10 },
  emptyContainer: { flex: 1 },
  card: {
    backgroundColor: Colors.white, borderRadius: 14, padding: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.bgMist, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardDest: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textDark },
  cardCountry: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textMuted, marginTop: 1 },
  cardDate: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 3 },
  deleteBtn: { padding: 6 },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textDark, marginBottom: 6 },
  emptyText: { fontSize: 14, fontFamily: Fonts.body, color: Colors.textMuted, textAlign: 'center' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  sheetTitle: { fontSize: 17, fontFamily: Fonts.bodySemiBold, color: Colors.textDark, marginBottom: 20 },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 15,
    fontFamily: Fonts.body, color: Colors.textDark, backgroundColor: Colors.bgInput,
  },
  sheetRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  cancelBtn: { borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 20, alignItems: 'center' },
  cancelBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.textMuted },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center', marginTop: 20 },
  addBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
});
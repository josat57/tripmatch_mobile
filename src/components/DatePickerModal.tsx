import { useState, useRef } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Platform,
} from 'react-native';
import { Colors, Fonts } from '../theme';

const ITEM_H = 44;
const VISIBLE = 5;
const PAD = Math.floor(VISIBLE / 2);

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = range(CURRENT_YEAR, CURRENT_YEAR + 10);

function daysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

function Column({
  items,
  selected,
  onSelect,
  width,
}: {
  items: (string | number)[];
  selected: number;
  onSelect: (i: number) => void;
  width: number;
}) {
  const ref = useRef<ScrollView>(null);

  const onMomentumEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
    onSelect(Math.max(0, Math.min(idx, items.length - 1)));
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height: ITEM_H * VISIBLE }}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_H}
      decelerationRate="fast"
      onMomentumScrollEnd={onMomentumEnd}
      contentOffset={{ x: 0, y: selected * ITEM_H }}
    >
      {Array(PAD).fill(null).map((_, i) => <View key={`t${i}`} style={{ height: ITEM_H }} />)}
      {items.map((item, i) => (
        <TouchableOpacity key={i} style={[styles.cell, { width }]} onPress={() => {
          ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
          onSelect(i);
        }}>
          <Text style={[styles.cellText, i === selected && styles.cellSelected]}>
            {String(item).padStart(2, '0')}
          </Text>
        </TouchableOpacity>
      ))}
      {Array(PAD).fill(null).map((_, i) => <View key={`b${i}`} style={{ height: ITEM_H }} />)}
    </ScrollView>
  );
}

interface Props {
  visible: boolean;
  value: Date | null;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  title?: string;
}

export default function DatePickerModal({ visible, value, onConfirm, onCancel, minimumDate, title }: Props) {
  const initial = value ?? minimumDate ?? new Date();
  const [day, setDay]     = useState(initial.getDate() - 1);
  const [month, setMonth] = useState(initial.getMonth());
  const [year, setYear]   = useState(Math.max(0, YEARS.indexOf(initial.getFullYear())));

  const selectedYear  = YEARS[year] ?? CURRENT_YEAR;
  const selectedMonth = month + 1;
  const days = range(1, daysInMonth(selectedMonth, selectedYear));
  const safeDayIdx = Math.min(day, days.length - 1);

  const handleConfirm = () => {
    const d = new Date(selectedYear, month, days[safeDayIdx]);
    onConfirm(d);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel} />
      <View style={styles.sheet}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.cancel}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{title ?? 'Select date'}</Text>
          <TouchableOpacity onPress={handleConfirm}>
            <Text style={styles.confirm}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.columns}>
          {/* Day */}
          <Column items={days} selected={safeDayIdx} onSelect={setDay} width={70} />
          {/* Month */}
          <Column items={MONTHS} selected={month} onSelect={setMonth} width={80} />
          {/* Year */}
          <Column items={YEARS} selected={year} onSelect={setYear} width={80} />
        </View>

        {/* Selection highlight bar */}
        <View pointerEvents="none" style={styles.highlight} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 15, fontFamily: Fonts.bodySemiBold, color: Colors.textDark },
  cancel: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textMuted },
  confirm: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.primary },
  columns: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 8,
    overflow: 'hidden',
  },
  cell: { height: ITEM_H, justifyContent: 'center', alignItems: 'center' },
  cellText: { fontSize: 17, fontFamily: Fonts.body, color: Colors.textMuted },
  cellSelected: { color: Colors.textDark, fontFamily: Fonts.bodyBold, fontSize: 19 },
  highlight: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: 56 + ITEM_H * PAD + 8,
    height: ITEM_H,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.bgInput,
    zIndex: -1,
  },
});
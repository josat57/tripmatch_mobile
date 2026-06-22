import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Notifications as NotificationsAPI } from '../src/api/api';
import { Colors, Fonts } from '../src/theme';

interface Notification {
  _id: string;
  type: string;
  title?: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  data?: Record<string, unknown>;
}

const TYPE_ICON: Record<string, React.ComponentProps<typeof Ionicons>['name']> = {
  buddy_request:   'person-add-outline',
  buddy_accepted:  'people-outline',
  trip_invite:     'map-outline',
  trip_approved:   'checkmark-circle-outline',
  trip_rejected:   'close-circle-outline',
  message:         'chatbubble-outline',
  system:          'information-circle-outline',
};

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [markingAll, setMarkingAll]       = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await NotificationsAPI.list();
      const list = data as Notification[] | { notifications?: Notification[] };
      setNotifications(
        Array.isArray(list) ? list : (list as { notifications?: Notification[] }).notifications ?? []
      );
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => n._id === id ? { ...n, isRead: true } : n)
    );
    try { await NotificationsAPI.markRead(id); } catch {}
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await NotificationsAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {}
    finally { setMarkingAll(false); }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diff < 60)   return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Notifications',
          headerShown: true,
          headerRight: unreadCount > 0
            ? () => (
                <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} style={{ marginRight: 16 }}>
                  {markingAll
                    ? <ActivityIndicator size="small" color={Colors.primary} />
                    : <Text style={styles.markAllText}>Mark all read</Text>
                  }
                </TouchableOpacity>
              )
            : undefined,
        }}
      />
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="notifications-off-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No notifications</Text>
          <Text style={styles.emptySub}>You're all caught up!</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
          }
        >
          {notifications.map((notif) => (
            <TouchableOpacity
              key={notif._id}
              style={[styles.row, !notif.isRead && styles.rowUnread]}
              onPress={() => handleMarkRead(notif._id)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconWrap, !notif.isRead && styles.iconWrapUnread]}>
                <Ionicons
                  name={TYPE_ICON[notif.type] ?? 'notifications-outline'}
                  size={20}
                  color={notif.isRead ? Colors.textLight : Colors.primary}
                />
              </View>
              <View style={styles.rowContent}>
                {notif.title ? (
                  <Text style={[styles.notifTitle, !notif.isRead && styles.notifTitleUnread]}>
                    {notif.title}
                  </Text>
                ) : null}
                <Text style={styles.notifBody} numberOfLines={2}>{notif.message}</Text>
                <Text style={styles.notifTime}>{formatTime(notif.createdAt)}</Text>
              </View>
              {!notif.isRead && <View style={styles.unreadDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgCard },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  markAllText: { fontSize: 13, fontFamily: Fonts.bodySemiBold, color: Colors.primary },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  rowUnread: { backgroundColor: Colors.mist },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  iconWrapUnread: { backgroundColor: Colors.mist, borderWidth: 1, borderColor: Colors.primaryLight },
  rowContent: { flex: 1 },
  notifTitle: { fontSize: 14, fontFamily: Fonts.bodySemiBold, color: Colors.textBody, marginBottom: 2 },
  notifTitleUnread: { color: Colors.textDark },
  notifBody: { fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted, lineHeight: 18 },
  notifTime: { fontSize: 11, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginTop: 6,
    flexShrink: 0,
  },
});

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Image, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Messaging } from '../../src/api/api';
import { Colors, Fonts } from '../../src/theme';

interface Conversation {
  userId: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount?: number;
}

export default function MessagesScreen() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await Messaging.getConversations();
      const d = data as Conversation[] | { conversations?: Conversation[] };
      setConversations(Array.isArray(d) ? d : (d as { conversations?: Conversation[] }).conversations ?? []);
    } catch {}
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const formatTime = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>Messages</Text>
      </View>

      {conversations.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="chatbubbles-outline" size={52} color={Colors.border} />
          <Text style={styles.emptyTitle}>No messages yet</Text>
          <Text style={styles.emptySub}>Connect with travel companions to start chatting.</Text>
          <TouchableOpacity style={styles.ctaBtn} onPress={() => router.push('/(tabs)/matches')}>
            <Text style={styles.ctaBtnText}>Find Matches</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={Colors.primary} />
          }
        >
          {conversations.map((conv) => (
            <TouchableOpacity
              key={conv.userId}
              style={styles.row}
              onPress={() => router.push({
                pathname: '/messages/[id]',
                params: {
                  id: conv.userId,
                  name: `${conv.firstName} ${conv.lastName}`,
                  avatar: conv.profileImage ?? '',
                },
              })}
            >
              {conv.profileImage ? (
                <Image source={{ uri: conv.profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitials}>
                    {conv.firstName?.[0]}{conv.lastName?.[0]}
                  </Text>
                </View>
              )}
              <View style={styles.rowContent}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowName}>{conv.firstName} {conv.lastName}</Text>
                  <Text style={styles.rowTime}>{formatTime(conv.lastMessageAt)}</Text>
                </View>
                <View style={styles.rowBottom}>
                  <Text style={styles.rowPreview} numberOfLines={1}>
                    {conv.lastMessage ?? 'Start a conversation…'}
                  </Text>
                  {(conv.unreadCount ?? 0) > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{conv.unreadCount}</Text>
                    </View>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgCard },
  topBar: {
    backgroundColor: Colors.bgCard,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  title: { fontSize: 22, fontFamily: Fonts.heading, color: Colors.textDark },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontFamily: Fonts.heading, color: Colors.textBody, marginTop: 14 },
  emptySub: {
    fontSize: 13,
    fontFamily: Fonts.body,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  ctaBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  ctaBtnText: { fontSize: 14, fontFamily: Fonts.bodyBold, color: Colors.white },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 14 },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 14,
    backgroundColor: Colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  avatarInitials: { fontSize: 16, fontFamily: Fonts.bodyBold, color: Colors.primaryDark },
  rowContent: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  rowName: { fontSize: 15, fontFamily: Fonts.bodyBold, color: Colors.textDark },
  rowTime: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight },
  rowBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowPreview: { flex: 1, fontSize: 13, fontFamily: Fonts.body, color: Colors.textMuted },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { fontSize: 11, fontFamily: Fonts.bodyBold, color: Colors.white },
});

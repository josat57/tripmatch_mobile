import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Messaging } from '../../src/api/api';
import { useAuth } from '../../src/contexts/AuthContext';
import { Colors, Fonts } from '../../src/theme';

interface Message {
  _id: string;
  senderId: string;
  content: string;
  createdAt: string;
  optimistic?: boolean;
}

const WS_INITIAL_DELAY = 1000;
const WS_MAX_DELAY     = 60000;

export default function ConversationScreen() {
  const { id: recipientId, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [typing, setTyping]     = useState(false);

  const wsRef        = useRef<WebSocket | null>(null);
  const flatListRef  = useRef<FlatList>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef    = useRef(false);
  const delayRef     = useRef(WS_INITIAL_DELAY);

  // Set the conversation header dynamically
  useEffect(() => {
    if (!name) return;
    navigation.setOptions({
      title: name,
      headerRight: avatar
        ? () => (
            <Image
              source={{ uri: avatar }}
              style={{ width: 32, height: 32, borderRadius: 16, marginRight: 12 }}
            />
          )
        : undefined,
    });
  }, [name, avatar, navigation]);

  useEffect(() => {
    if (!recipientId) return;
    Messaging.getDirectHistory(recipientId, 50)
      .then((data) => {
        const d = data as Message[] | { messages?: Message[] };
        const msgs = Array.isArray(d) ? d : (d as { messages?: Message[] }).messages ?? [];
        setMessages([...msgs].reverse());
      })
      .catch(() => Alert.alert('Error', 'Could not load messages.'))
      .finally(() => setLoading(false));
  }, [recipientId]);

  useEffect(() => {
    if (!recipientId) return;
    closedRef.current = false;
    delayRef.current  = WS_INITIAL_DELAY;

    const connect = async () => {
      if (closedRef.current) return;
      let ws: WebSocket;
      try {
        const { token } = await Messaging.getWsToken();
        const base = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:9000/api')
          .replace(/^http/, 'ws')
          .replace('/api', '');
        ws = new WebSocket(`${base}/ws/messages?token=${token}`);
        wsRef.current = ws;

        ws.onopen = () => {
          delayRef.current = WS_INITIAL_DELAY; // reset backoff on successful connection
        };

        ws.onmessage = (e) => {
          try {
            const payload = JSON.parse(e.data as string);
            if (payload.type === 'message' && payload.senderId === recipientId) {
              setMessages((prev) => [
                ...prev,
                {
                  _id: payload._id ?? String(Date.now()),
                  senderId: payload.senderId,
                  content: payload.content,
                  createdAt: payload.createdAt ?? new Date().toISOString(),
                },
              ]);
            }
            if (payload.type === 'typing' && payload.senderId === recipientId) {
              setTyping(payload.isTyping);
            }
          } catch {}
        };

        ws.onerror = () => {};
        ws.onclose = () => {
          if (closedRef.current) return;
          const delay = delayRef.current;
          delayRef.current = Math.min(delay * 2, WS_MAX_DELAY);
          setTimeout(connect, delay);
        };
      } catch {
        if (closedRef.current) return;
        const delay = delayRef.current;
        delayRef.current = Math.min(delay * 2, WS_MAX_DELAY);
        setTimeout(connect, delay);
      }
    };

    connect();
    return () => {
      closedRef.current = true;
      wsRef.current?.close();
    };
  }, [recipientId]);

  const emitTyping = useCallback((isTyping: boolean) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'typing', recipientId, isTyping }));
    }
  }, [recipientId]);

  const handleInputChange = (text: string) => {
    setInput(text);
    emitTyping(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => emitTyping(false), 1500);
  };

  const send = async () => {
    const content = input.trim();
    if (!content || sending || !recipientId) return;

    const optimisticId = `opt_${Date.now()}`;
    const optimisticMsg: Message = {
      _id: optimisticId,
      senderId: user?._id ?? '',
      content,
      createdAt: new Date().toISOString(),
      optimistic: true,
    };
    setMessages((prev) => [...prev, optimisticMsg]);
    setInput('');
    emitTyping(false);
    setSending(true);

    try {
      const res = await Messaging.sendDirectMessage(recipientId, content);
      const msg = (res as { message?: Message }).message;
      setMessages((prev) =>
        prev.map((m) => m._id === optimisticId ? { ...(msg ?? m), optimistic: false } : m)
      );
    } catch {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      Alert.alert('Failed to send', 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const isMine = (msg: Message) => msg.senderId === user?._id;

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: name ?? 'Conversation', headerShown: true }} />
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: name ?? 'Conversation', headerShown: true }} />
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>Send your first message to get the conversation started!</Text>
          }
          renderItem={({ item }) => (
            <View style={[styles.bubble, isMine(item) ? styles.mine : styles.theirs]}>
              <Text style={[styles.bubbleText, isMine(item) && styles.bubbleTextMine]}>
                {item.content}
              </Text>
              <Text style={[styles.bubbleTime, isMine(item) && styles.bubbleTimeMine]}>
                {formatTime(item.createdAt)}
                {item.optimistic ? ' ··' : ''}
              </Text>
            </View>
          )}
        />

        {typing && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>{name ?? 'Someone'} is typing…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={handleInputChange}
            placeholder="Message…"
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={send}
            disabled={!input.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Ionicons name="arrow-up" size={18} color={Colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mist },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  messageList: { padding: 16, gap: 8, flexGrow: 1, justifyContent: 'flex-end' },
  emptyText: {
    textAlign: 'center',
    fontFamily: Fonts.body,
    color: Colors.textLight,
    fontSize: 13,
    marginTop: 40,
  },
  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  theirs: {
    backgroundColor: Colors.bgCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  bubbleText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textBody, lineHeight: 21 },
  bubbleTextMine: { color: Colors.white },
  bubbleTime: { fontSize: 10, fontFamily: Fonts.body, color: Colors.textLight, marginTop: 3, alignSelf: 'flex-end' },
  bubbleTimeMine: { color: Colors.primaryLight },
  typingRow: { paddingHorizontal: 20, paddingBottom: 4 },
  typingText: { fontSize: 12, fontFamily: Fonts.body, color: Colors.textLight, fontStyle: 'italic' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    padding: 12,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    fontFamily: Fonts.body,
    color: Colors.textDark,
    backgroundColor: Colors.bgInput,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
});

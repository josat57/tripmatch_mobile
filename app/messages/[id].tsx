import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Messaging, Users } from '../../src/api/api';
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

const IMAGE_URL_RE = /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i;

export default function ConversationScreen() {
  const { id: recipientId, name, avatar } = useLocalSearchParams<{ id: string; name?: string; avatar?: string }>();
  const { user } = useAuth();
  const navigation = useNavigation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [typing, setTyping]     = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const wsRef        = useRef<WebSocket | null>(null);
  const flatListRef  = useRef<FlatList>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closedRef    = useRef(false);
  const delayRef     = useRef(WS_INITIAL_DELAY);

  const handleBlockReport = useCallback(() => {
    if (!recipientId) return;
    const displayName = name ?? 'this user';
    Alert.alert(`Report or block ${displayName}`, 'What would you like to do?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block user',
        style: 'destructive',
        onPress: async () => {
          try {
            await Users.block(recipientId);
            Alert.alert('Blocked', `${displayName} has been blocked.`, [
              { text: 'OK', onPress: () => navigation.goBack() },
            ]);
          } catch {
            Alert.alert('Error', 'Could not block user.');
          }
        },
      },
      {
        text: 'Report user',
        onPress: () => {
          Alert.prompt('Report', 'Briefly describe the issue:', async (reason) => {
            if (!reason) return;
            try {
              await Users.report(recipientId, reason);
              Alert.alert('Reported', 'Thank you. Our team will review this.');
            } catch {
              Alert.alert('Error', 'Could not submit report.');
            }
          });
        },
      },
    ]);
  }, [recipientId, name, navigation]);

  useEffect(() => {
    if (!name) return;
    navigation.setOptions({
      title: name,
      headerRight: () => (
        <View style={styles.headerRight}>
          {avatar ? (
            <Image source={{ uri: avatar }} style={styles.headerAvatar} />
          ) : null}
          <TouchableOpacity onPress={handleBlockReport} accessibilityLabel={`Report or block ${name}`}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors.textDark} />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [name, avatar, navigation, handleBlockReport]);

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

        ws.onopen = () => { delayRef.current = WS_INITIAL_DELAY; };

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

  const sendContent = async (content: string) => {
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

  const send = () => sendContent(input.trim());

  const pickAndSendImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow photo library access to share images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;

    setUploadingImage(true);
    try {
      const { imageUrl } = await Messaging.uploadImage(result.assets[0].uri);
      await sendContent(imageUrl);
    } catch {
      Alert.alert('Upload failed', 'Could not upload the image. Please try again.');
    } finally {
      setUploadingImage(false);
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

  const renderBubble = (item: Message) => {
    const mine = isMine(item);
    const isImage = IMAGE_URL_RE.test(item.content);

    return (
      <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
        {isImage ? (
          <Image
            source={{ uri: item.content }}
            style={styles.bubbleImage}
            contentFit="cover"
          />
        ) : (
          <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>
            {item.content}
          </Text>
        )}
        <Text style={[styles.bubbleTime, mine && styles.bubbleTimeMine]}>
          {formatTime(item.createdAt)}
          {item.optimistic ? ' ··' : ''}
        </Text>
      </View>
    );
  };

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
          renderItem={({ item }) => renderBubble(item)}
        />

        {typing && (
          <View style={styles.typingRow}>
            <Text style={styles.typingText}>{name ?? 'Someone'} is typing…</Text>
          </View>
        )}

        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.imageBtn}
            onPress={pickAndSendImage}
            disabled={uploadingImage || sending}
            accessibilityLabel="Send image"
          >
            {uploadingImage ? (
              <ActivityIndicator size="small" color={Colors.textMuted} />
            ) : (
              <Ionicons name="image-outline" size={22} color={Colors.textMuted} />
            )}
          </TouchableOpacity>

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
            accessibilityLabel="Send message"
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
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 14, marginRight: 12 },
  headerAvatar: { width: 32, height: 32, borderRadius: 16 },
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
  bubbleImage: {
    width: 200,
    height: 150,
    borderRadius: 10,
    marginBottom: 4,
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
    gap: 8,
    padding: 12,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  imageBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.bgInput,
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
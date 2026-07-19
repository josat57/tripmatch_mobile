import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Stack, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AI } from '../src/api/api';
import { Colors, Fonts } from '../src/theme';

interface Message {
  _id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

export default function AIPlannerScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      _id: '0',
      role: 'assistant',
      content: 'Hi! I\'m your AI travel assistant. Tell me about the trip you\'re planning—where would you like to go, when, and what\'s your style?',
      suggestions: ['Beach getaway', 'Mountain adventure', 'City exploration', 'Cultural tour'],
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string>();
  const [loading, setLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      title: 'Plan with AI',
      headerRight: () => (
        <TouchableOpacity
          style={styles.headerBtn}
          onPress={() => {
            Alert.alert(
              'Clear conversation?',
              'Start a new planning session',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: () => {
                    setMessages([
                      {
                        _id: '0',
                        role: 'assistant',
                        content: 'Hi! I\'m your AI travel assistant. Tell me about the trip you\'re planning—where would you like to go, when, and what\'s your style?',
                        suggestions: ['Beach getaway', 'Mountain adventure', 'City exploration', 'Cultural tour'],
                      },
                    ]);
                    setConversationId(undefined);
                    setInput('');
                  },
                },
              ]
            );
          }}
        >
          <Ionicons name="refresh-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || sending) return;

    const userMsg: Message = {
      _id: `msg_${Date.now()}`,
      role: 'user',
      content: text.trim(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setSending(true);

    try {
      const response = await AI.chat(text.trim(), conversationId);
      if (response.conversationId && !conversationId) {
        setConversationId(response.conversationId);
      }

      const assistantMsg: Message = {
        _id: `msg_${Date.now() + 1}`,
        role: 'assistant',
        content: response.message || 'I couldn\'t generate a response. Please try again.',
        suggestions: response.suggestions,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      Alert.alert('Error', 'Could not get AI response. Please try again.');
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }, [conversationId, sending]);

  const handleSuggestion = (text: string) => {
    sendMessage(text);
  };

  useEffect(() => {
    if (messages.length > 1) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  return (
    <>
      <Stack.Screen options={{ title: 'Plan with AI', headerShown: true }} />
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
          renderItem={({ item }) => (
            <View style={[styles.messageBubble, item.role === 'user' ? styles.userBubble : styles.assistantBubble]}>
              <Text style={[styles.messageText, item.role === 'user' && styles.userText]}>
                {item.content}
              </Text>

              {item.suggestions && item.suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {item.suggestions.map((suggestion: string, idx: number) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.suggestionChip}
                      onPress={() => handleSuggestion(suggestion)}
                      disabled={sending}
                    >
                      <Text style={styles.suggestionText}>{suggestion}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          )}
        />

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Describe your ideal trip…"
            placeholderTextColor={Colors.textLight}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || sending) && styles.sendBtnDisabled]}
            onPress={() => sendMessage(input)}
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
  messageList: { padding: 16, gap: 12, flexGrow: 1, justifyContent: 'flex-end' },
  messageBubble: {
    maxWidth: '85%',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.bgCard,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  messageText: { fontSize: 15, fontFamily: Fonts.body, color: Colors.textBody, lineHeight: 21 },
  userText: { color: Colors.white },
  suggestionsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  suggestionChip: {
    backgroundColor: Colors.primaryLight + '20',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.primaryLight,
  },
  suggestionText: { fontSize: 12, fontFamily: Fonts.bodySemiBold, color: Colors.forest },
  headerBtn: { marginRight: 12, padding: 4 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 12,
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
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
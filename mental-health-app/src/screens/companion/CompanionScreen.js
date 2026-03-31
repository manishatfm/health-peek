import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS, FONTS, SHADOWS, GRADIENTS } from '../../theme';
import companionService from '../../services/companionService';

const INITIAL_MESSAGE = {
  id: 'init',
  role: 'assistant',
  content: "hey 👋 I'm here if you want to talk. how are you doing today?",
};

export default function CompanionScreen() {
  const [messages, setMessages] = useState([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    scrollToBottom();

    try {
      // Build history excluding the initial greeting
      const history = next
        .filter(m => m.id !== 'init')
        .slice(0, -1)  // exclude the message we just added (it becomes "message" param)
        .map(m => ({ role: m.role, content: m.content }));

      const reply = await companionService.chat(text, history);
      const assistantMsg = { id: Date.now().toString() + '_a', role: 'assistant', content: reply };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: Date.now().toString() + '_err',
          role: 'assistant',
          content: "sorry, something went wrong on my end — try again?",
        },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const renderMessage = useCallback(({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.messageRow, isUser && styles.messageRowUser]}>
        {!isUser && (
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>🌿</Text>
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <LinearGradient
        colors={GRADIENTS.primary}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarEmoji}>🌿</Text>
        </View>
        <View>
          <Text style={styles.headerTitle}>Emotional Companion</Text>
          <Text style={styles.headerSub}>here for you</Text>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Message list */}
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={scrollToBottom}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            loading ? (
              <View style={[styles.messageRow]}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarEmoji}>🌿</Text>
                </View>
                <View style={[styles.bubble, styles.bubbleAssistant, styles.typingBubble]}>
                  <ActivityIndicator size="small" color={COLORS.textMuted || '#9e9e9e'} />
                </View>
              </View>
            ) : null
          }
        />

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="say something..."
            placeholderTextColor={COLORS.textLight}
            multiline
            maxLength={1000}
            editable={!loading}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            activeOpacity={0.75}
          >
            <LinearGradient
              colors={(!input.trim() || loading) ? ['#b0c9b7', '#b0c9b7'] : GRADIENTS.primary}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.sendBtnGradient}
            >
              <Text style={styles.sendIcon}>➤</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  flex: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: { fontSize: 20 },
  headerTitle: { ...FONTS.bold, fontSize: 16, color: '#fff' },
  headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 1 },

  // Messages
  messageList: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    gap: 8,
  },
  messageRowUser: {
    flexDirection: 'row-reverse',
  },
  avatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#e0ece4',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarEmoji: { fontSize: 15 },
  bubble: {
    maxWidth: '72%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleAssistant: {
    backgroundColor: COLORS.surface || '#fff',
    borderBottomLeftRadius: 4,
    ...SHADOWS.small,
  },
  bubbleUser: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  typingBubble: {
    paddingHorizontal: 18,
    paddingVertical: 13,
  },
  bubbleText: {
    ...FONTS.regular,
    fontSize: 14.5,
    lineHeight: 21,
    color: COLORS.text,
  },
  bubbleTextUser: {
    color: '#fff',
  },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: COLORS.surface || '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e6ede8',
    gap: 10,
  },
  input: {
    flex: 1,
    ...FONTS.regular,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.background,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    maxHeight: 100,
    borderWidth: 1.5,
    borderColor: '#cdddd2',
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    overflow: 'hidden',
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnGradient: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

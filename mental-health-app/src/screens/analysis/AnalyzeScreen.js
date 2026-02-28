import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { analysisService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { AnalysisResultCard } from '../../components/AnalysisComponents';
import { LoadingOverlay, ErrorBanner } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function AnalyzeScreen({ navigation }) {
  const { addAnalysis } = useAnalysis();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Empty Message', 'Please enter a message to analyze.');
      return;
    }
    if (trimmed.length > 5000) {
      Alert.alert('Too Long', 'Message must be under 5000 characters.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await analysisService.analyzeMessage(trimmed);
      setResult(data);
      addAnalysis(trimmed, data);

      // Crisis detection
      if (
        data.sentiment?.toLowerCase() === 'negative' &&
        data.confidence > 0.7
      ) {
        Alert.alert(
          '⚠️ High Risk Detected',
          'This message shows signs of significant distress. If you or someone you know needs help, please reach out to a mental health professional or call a crisis helpline.',
          [{ text: 'I Understand', style: 'cancel' }]
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [message, addAnalysis]);

  const handleClear = () => {
    setMessage('');
    setResult(null);
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Input Section */}
        <View style={styles.inputCard}>
          <Text style={styles.cardTitle}>Analyze a Message</Text>
          <Text style={styles.cardSubtitle}>
            Enter text to analyze its emotional tone and sentiment
          </Text>

          <TextInput
            style={styles.textArea}
            value={message}
            onChangeText={setMessage}
            placeholder="Type or paste a message here..."
            placeholderTextColor={COLORS.textLight}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={5000}
          />

          <View style={styles.inputFooter}>
            <Text style={styles.charCount}>
              {message.length}/5000
            </Text>
            <View style={styles.buttonRow}>
              {(message || result) && (
                <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
                  <Text style={styles.clearBtnText}>Clear</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.analyzeBtn, !message.trim() && styles.analyzeBtnDisabled]}
                onPress={handleAnalyze}
                disabled={!message.trim() || loading}
              >
                <Text style={styles.analyzeBtnText}>
                  {loading ? 'Analyzing...' : '🔍 Analyze'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatImport')}
          >
            <Text style={styles.quickIcon}>📁</Text>
            <Text style={styles.quickLabel}>Import Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('AnalysisHistory')}
          >
            <Text style={styles.quickIcon}>📊</Text>
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatHistory')}
          >
            <Text style={styles.quickIcon}>💬</Text>
            <Text style={styles.quickLabel}>Chat History</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && <AnalysisResultCard result={result} />}
      </ScrollView>

      <LoadingOverlay visible={loading} message="Analyzing message..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  cardTitle: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  cardSubtitle: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    minHeight: 120,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 24,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  charCount: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  clearBtn: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  analyzeBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOWS.small,
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: COLORS.textOnPrimary,
  },
  quickActions: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  quickIcon: { fontSize: 24, marginBottom: SPACING.xs },
  quickLabel: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
});

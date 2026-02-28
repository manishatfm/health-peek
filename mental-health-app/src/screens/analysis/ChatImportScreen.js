import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import { analysisService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function ChatImportScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [formatType, setFormatType] = useState('whatsapp');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const formats = [
    { key: 'whatsapp', label: 'WhatsApp', icon: '💬' },
    { key: 'telegram', label: 'Telegram', icon: '✈️' },
    { key: 'discord', label: 'Discord', icon: '🎮' },
    { key: 'imessage', label: 'iMessage', icon: '🍎' },
    { key: 'generic', label: 'Generic', icon: '📝' },
  ];

  const handleFilePick = async () => {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.plainText, DocumentPicker.types.allFiles],
      });
      const file = res[0];
      const response = await fetch(file.uri);
      const text = await response.text();
      setContent(text);
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        Alert.alert('Error', 'Failed to read file');
      }
    }
  };

  const handleImport = async () => {
    if (!content.trim() || content.trim().length < 10) {
      Alert.alert('Error', 'Please provide chat content (min 10 characters)');
      return;
    }

    setLoading(true);
    try {
      const data = await analysisService.importChat(
        content.trim(),
        formatType,
        userName.trim() || undefined
      );
      setResult(data);
      Alert.alert('Success', `Analyzed ${data.total_messages_analyzed || 0} messages!`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  const renderResult = () => {
    if (!result) return null;

    return (
      <View style={styles.resultCard}>
        <Text style={styles.resultTitle}>📊 Chat Analysis</Text>

        {/* Basic Stats */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.basic_stats?.total_messages || 0}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{Object.keys(result.participants || {}).length}</Text>
            <Text style={styles.statLabel}>Participants</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{result.format_detected || formatType}</Text>
            <Text style={styles.statLabel}>Format</Text>
          </View>
        </View>

        {/* Sentiment */}
        {result.sentiment_analysis && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sentiment Overview</Text>
            {Object.entries(result.sentiment_analysis.overall_sentiment || {}).map(([key, val]) => (
              <View key={key} style={styles.sentimentRow}>
                <Text style={styles.sentimentLabel}>{key}</Text>
                <View style={styles.sentimentBarTrack}>
                  <View style={[styles.sentimentBarFill, { width: `${Math.min(val * 100, 100)}%` }]} />
                </View>
                <Text style={styles.sentimentPct}>{Math.round(val * 100)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Red Flags */}
        {result.red_flags?.warnings?.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: COLORS.error }]}>⚠️ Red Flags</Text>
            {result.red_flags.warnings.map((warning, i) => (
              <Text key={i} style={styles.warningText}>• {warning}</Text>
            ))}
          </View>
        )}

        {/* Conversation Period */}
        {result.conversation_period && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📅 Period</Text>
            <Text style={styles.periodText}>
              {result.conversation_period.start_date} → {result.conversation_period.end_date}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Format Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Chat Format</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.formatRow}>
            {formats.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.formatChip, formatType === f.key && styles.formatChipActive]}
                onPress={() => setFormatType(f.key)}
              >
                <Text style={styles.formatIcon}>{f.icon}</Text>
                <Text style={[styles.formatLabel, formatType === f.key && styles.formatLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Your Name */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Name (Optional)</Text>
        <TextInput
          style={styles.nameInput}
          value={userName}
          onChangeText={setUserName}
          placeholder="Helps identify your messages"
          placeholderTextColor={COLORS.textLight}
        />
      </View>

      {/* Content Input */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Chat Content</Text>
          <TouchableOpacity style={styles.fileBtn} onPress={handleFilePick}>
            <Text style={styles.fileBtnText}>📎 Pick File</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.textArea}
          value={content}
          onChangeText={setContent}
          placeholder="Paste your exported chat here, or pick a file..."
          placeholderTextColor={COLORS.textLight}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />

        <Text style={styles.contentLength}>{content.length} characters</Text>
      </View>

      {/* Import Button */}
      <TouchableOpacity
        style={[styles.importBtn, (!content.trim() || loading) && styles.importBtnDisabled]}
        onPress={handleImport}
        disabled={!content.trim() || loading}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textOnPrimary} />
        ) : (
          <Text style={styles.importBtnText}>🚀 Analyze Chat</Text>
        )}
      </TouchableOpacity>

      {/* Results */}
      {renderResult()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  cardTitle: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.sm },
  formatRow: { flexDirection: 'row', gap: SPACING.sm },
  formatChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  formatChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '15' },
  formatIcon: { fontSize: 16, marginRight: SPACING.xs },
  formatLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  formatLabelActive: { color: COLORS.primary },
  nameInput: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fileBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.primary + '15',
  },
  fileBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.primary },
  textArea: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 160,
    borderWidth: 1,
    borderColor: COLORS.border,
    lineHeight: 22,
  },
  contentLength: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginTop: SPACING.xs, textAlign: 'right' },
  importBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.medium,
  },
  importBtnDisabled: { opacity: 0.5 },
  importBtnText: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.textOnPrimary },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    ...SHADOWS.medium,
  },
  resultTitle: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text, marginBottom: SPACING.lg },
  statsGrid: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.lg },
  statItem: {
    flex: 1,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { ...FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.primary },
  statLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  section: { marginTop: SPACING.lg },
  sectionTitle: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.sm },
  sentimentRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  sentimentLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, width: 70, textTransform: 'capitalize' },
  sentimentBarTrack: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginHorizontal: SPACING.sm },
  sentimentBarFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  sentimentPct: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.text, width: 40, textAlign: 'right' },
  warningText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.error, marginBottom: SPACING.xs, lineHeight: 20 },
  periodText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

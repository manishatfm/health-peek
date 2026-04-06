import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  UIManager,
  Platform,
  NativeModules,
} from 'react-native';
import { pick, isCancel } from '@react-native-documents/picker';
import RNBlobUtil from 'react-native-blob-util';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { analysisService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LANGUAGE_OPTIONS = [
  { code: '',          label: '🌐 Auto-detect' },
  // Indian languages
  { code: 'hinglish',  label: '🇮🇳 Hinglish (WhatsApp Hindi-English)' },
  { code: 'hi',        label: '🇮🇳 Hindi' },
  { code: 'bn',        label: '🇮🇳 Bengali' },
  { code: 'ta',        label: '🇮🇳 Tamil' },
  { code: 'te',        label: '🇮🇳 Telugu' },
  { code: 'mr',        label: '🇮🇳 Marathi' },
  { code: 'gu',        label: '🇮🇳 Gujarati' },
  // International
  { code: 'es',        label: '🇪🇸 Spanish' },
  { code: 'fr',        label: '🇫🇷 French' },
  { code: 'de',        label: '🇩🇪 German' },
  { code: 'pt',        label: '🇧🇷 Portuguese' },
  { code: 'ar',        label: '🇸🇦 Arabic' },
  { code: 'ru',        label: '🇷🇺 Russian' },
  { code: 'ja',        label: '🇯🇵 Japanese' },
  { code: 'zh',        label: '🇨🇳 Chinese' },
  { code: 'ko',        label: '🇰🇷 Korean' },
  { code: 'it',        label: '🇮🇹 Italian' },
  { code: 'nl',        label: '🇳🇱 Dutch' },
  { code: 'tr',        label: '🇹🇷 Turkish' },
  { code: 'pl',        label: '🇵🇱 Polish' },
  { code: 'en',        label: '🇬🇧 English' },
];

const WHATSAPP_STEPS = [
  { icon: 'chat', text: 'Open WhatsApp and go to the chat you want to analyze' },
  { icon: 'more-vert', text: 'Tap the 3-dot menu (⋮) at the top right' },
  { icon: 'more-horiz', text: 'Tap "More" → "Export chat"' },
  { icon: 'image-not-supported', text: 'Choose "Without Media" to get a .txt file' },
  { icon: 'share', text: 'Share the .txt file and select this app — it loads automatically!' },
];

// Guess format from URI filename or text content
function guessFormat(uri, text) {
  const name = (uri || '').toLowerCase();
  if (name.includes('whatsapp')) return 'whatsapp';
  if (name.includes('telegram')) return 'telegram';
  if (name.includes('discord')) return 'discord';
  if (name.includes('imessage') || name.includes('sms')) return 'imessage';
  if (text) {
    if (/\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}/.test(text)) return 'whatsapp';
    if (/\[\d{4}-\d{2}-\d{2}/.test(text)) return 'telegram';
  }
  return 'whatsapp';
}

async function readSharedFile(uri) {
  // Try fetch for file:// and content:// URIs
  try {
    const res = await fetch(uri);
    const text = await res.text();
    if (text && text.trim().length > 0) return text;
  } catch (_) {}
  // Fallback: RNBlobUtil for file:// paths
  try {
    const path = uri.replace(/^file:\/\//, '');
    return await RNBlobUtil.fs.readFile(path, 'utf8');
  } catch (_) {}
  return null;
}

export default function ChatImportScreen({ navigation }) {
  const [content, setContent] = useState('');
  const [formatType, setFormatType] = useState('whatsapp');
  const [userName, setUserName] = useState('');
  const [language, setLanguage] = useState('');
  const [langPickerOpen, setLangPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [guideExpanded, setGuideExpanded] = useState(true);
  const [sharedBanner, setSharedBanner] = useState(false);

  // On mount: check for a pending share intent from WhatsApp / other apps
  useEffect(() => {
    const checkShareIntent = async () => {
      try {
        const ShareIntentModule = NativeModules.ShareIntentModule;
        if (!ShareIntentModule) return;
        const shared = await ShareIntentModule.getSharedFile();
        if (!shared) return;

        let text = shared.text || null;
        if (!text && shared.uri) {
          text = await readSharedFile(shared.uri);
        }
        if (!text) return;

        setContent(text);
        setFormatType(guessFormat(shared.uri, text));
        setSharedBanner(true);
        setGuideExpanded(false);
      } catch (_) {}
    };
    checkShareIntent();
  }, []);

  const formats = [
    { key: 'whatsapp', label: 'WhatsApp', icon: 'chat' },
    { key: 'telegram', label: 'Telegram', icon: 'send' },
    { key: 'discord', label: 'Discord', icon: 'sports-esports' },
    { key: 'imessage', label: 'iMessage', icon: 'sms' },
    { key: 'generic', label: 'Generic', icon: 'description' },
  ];

  const toggleGuide = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setGuideExpanded(v => !v);
  };

  const handleFilePick = async () => {
    try {
      const [file] = await pick({
        type: ['text/plain', '*/*'],
      });
      let text = '';
      // Try fetch first; fall back to RNBlobUtil for content:// URIs
      try {
        const response = await fetch(file.uri);
        text = await response.text();
      } catch {
        const path = file.uri.replace(/^file:\/\//, '');
        text = await RNBlobUtil.fs.readFile(path, 'utf8');
      }
      if (!text || text.trim().length === 0) {
        Alert.alert('Empty File', 'The selected file appears to be empty.');
        return;
      }
      setContent(text);
      Alert.alert('File Loaded', `Loaded ${text.length.toLocaleString()} characters.`);
    } catch (err) {
      if (!isCancel(err)) {
        Alert.alert('Error', 'Failed to read file. Make sure you select a .txt chat export.');
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
        userName.trim() || undefined,
        language || null
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
        <Text style={styles.resultTitle}>Chat Analysis</Text>

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
            <Text style={[styles.sectionTitle, { color: COLORS.error }]}>Red Flags</Text>
            {result.red_flags.warnings.map((warning, i) => (
              <Text key={i} style={styles.warningText}>• {warning}</Text>
            ))}
          </View>
        )}

        {/* Language Info */}
        {result.language_info && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language Detected</Text>
            <Text style={styles.langInfoText}>
              {result.language_info.native_name} ({result.language_info.language_name})
              {result.language_info.region === 'india' ? '  🇮🇳 Indian' : ''}
              {result.language_info.detected_language === 'hinglish' ? '  💬 Hinglish' : ''}
            </Text>
          </View>
        )}

        {/* Conversation Period */}
        {result.conversation_period && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Period</Text>
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

      {/* ── Shared file banner ── */}
      {sharedBanner && (
        <View style={styles.sharedBanner}>
          <MaterialIcons name="check-circle" size={18} color={COLORS.success} />
          <Text style={styles.sharedBannerText}>Chat file loaded from share — ready to analyze!</Text>
          <TouchableOpacity onPress={() => setSharedBanner(false)}>
            <MaterialIcons name="close" size={16} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

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
                <MaterialIcons
                  name={f.icon}
                  size={16}
                  color={formatType === f.key ? COLORS.primary : COLORS.textSecondary}
                  style={{ marginRight: SPACING.xs }}
                />
                <Text style={[styles.formatLabel, formatType === f.key && styles.formatLabelActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* WhatsApp Export Guide */}
      {formatType === 'whatsapp' && (
        <View style={styles.guideCard}>
          <TouchableOpacity style={styles.guideHeader} onPress={toggleGuide} activeOpacity={0.7}>
            <MaterialIcons name="info-outline" size={18} color="#25D366" style={{ marginRight: SPACING.sm }} />
            <Text style={styles.guideTitle}>How to export a WhatsApp chat</Text>
            <MaterialIcons
              name={guideExpanded ? 'expand-less' : 'expand-more'}
              size={20}
              color="#25D366"
              style={{ marginLeft: 'auto' }}
            />
          </TouchableOpacity>
          {guideExpanded && (
            <View style={styles.guideSteps}>
              {WHATSAPP_STEPS.map((step, i) => (
                <View key={i} style={styles.guideStep}>
                  <View style={styles.guideStepNum}>
                    <Text style={styles.guideStepNumText}>{i + 1}</Text>
                  </View>
                  <MaterialIcons name={step.icon} size={16} color="#25D366" style={{ marginRight: SPACING.sm }} />
                  <Text style={styles.guideStepText}>{step.text}</Text>
                </View>
              ))}
              <View style={styles.guideTip}>
                <MaterialIcons name="lightbulb-outline" size={14} color={COLORS.primary} style={{ marginRight: 4 }} />
                <Text style={styles.guideTipText}>
                  The exported file is named like "WhatsApp Chat with Name.txt"
                </Text>
              </View>
            </View>
          )}
        </View>
      )}

      {/* Language Selector */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Language (Optional)</Text>
        <TouchableOpacity
          style={styles.langPickerButton}
          onPress={() => setLangPickerOpen(v => !v)}
        >
          <Text style={styles.langPickerButtonText}>
            {LANGUAGE_OPTIONS.find(o => o.code === language)?.label || '🌐 Auto-detect'}
          </Text>
          <MaterialIcons
            name={langPickerOpen ? 'expand-less' : 'expand-more'}
            size={20}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
        {langPickerOpen && (
          <ScrollView style={styles.langList} nestedScrollEnabled maxHeight={220}>
            {LANGUAGE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.code}
                style={[
                  styles.langItem,
                  language === opt.code && styles.langItemActive,
                ]}
                onPress={() => { setLanguage(opt.code); setLangPickerOpen(false); }}
              >
                <Text style={[
                  styles.langItemText,
                  language === opt.code && styles.langItemTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MaterialIcons name="attach-file" size={14} color={COLORS.primary} />
              <Text style={styles.fileBtnText}>Pick File</Text>
            </View>
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
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <MaterialIcons name="analytics" size={20} color={COLORS.textOnPrimary} />
            <Text style={styles.importBtnText}>Analyze Chat</Text>
          </View>
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
  formatIconStyle: { marginRight: SPACING.xs },
  formatLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  formatLabelActive: { color: COLORS.primary },
  guideCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: '#25D36630',
    ...SHADOWS.small,
  },
  guideHeader: { flexDirection: 'row', alignItems: 'center' },
  guideTitle: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: '#1A7A3A', flex: 1 },
  guideSteps: { marginTop: SPACING.md },
  guideStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.sm,
  },
  guideStepNum: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.sm,
    marginTop: 1,
  },
  guideStepNumText: { ...FONTS.bold, fontSize: 10, color: '#FFF' },
  guideStepText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: '#1A7A3A', flex: 1, lineHeight: 18 },
  guideTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  guideTipText: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.primary, flex: 1 },
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
  langPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.background,
  },
  langPickerButtonText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text },
  langList: {
    marginTop: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface,
  },
  langItem: { paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  langItemActive: { backgroundColor: COLORS.primary + '20' },
  langItemText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text },
  langItemTextActive: { ...FONTS.semiBold, color: COLORS.primary },
  langInfoText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 22 },
  sharedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.success + '15',
    borderWidth: 1,
    borderColor: COLORS.success + '40',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  sharedBannerText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.success, flex: 1 },
});

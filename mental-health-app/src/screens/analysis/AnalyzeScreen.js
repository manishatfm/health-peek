import React, { useState, useCallback, useRef } from 'react';
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
  Image,
  ActivityIndicator,
  PermissionsAndroid,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import AudioRecorderPlayer from 'react-native-audio-recorder-player';
import { analysisService, voiceService } from '../../services';
import { useAnalysis } from '../../context/AnalysisContext';
import { AnalysisResultCard } from '../../components/AnalysisComponents';
import { LoadingOverlay, ErrorBanner } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS, GRADIENTS } from '../../theme';

export default function AnalyzeScreen({ navigation }) {
  const { addAnalysis } = useAnalysis();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('text'); // 'text' or 'voice'
  const [isRecording, setIsRecording] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [recordDuration, setRecordDuration] = useState('00:00');
  const audioRecorderPlayer = useRef(new AudioRecorderPlayer()).current;

  const requestMicPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone Permission',
          message: 'Health Peek needs microphone access to analyze your voice.',
          buttonPositive: 'Allow',
        },
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const startVoiceRecording = useCallback(async () => {
    const hasPermission = await requestMicPermission();
    if (!hasPermission) {
      Alert.alert('Permission Required', 'Microphone permission is needed for voice analysis.');
      return;
    }
    setError(null);
    setResult(null);
    try {
      await audioRecorderPlayer.startRecorder();
      audioRecorderPlayer.addRecordBackListener((e) => {
        const secs = Math.floor(e.currentPosition / 1000);
        const mins = Math.floor(secs / 60);
        const remSecs = secs % 60;
        setRecordDuration(
          `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`,
        );
      });
      setIsRecording(true);
    } catch (err) {
      setError('Failed to start recording: ' + err.message);
    }
  }, [audioRecorderPlayer]);

  const stopAndAnalyzeVoice = useCallback(async () => {
    try {
      const filePath = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      setIsRecording(false);
      setRecordDuration('00:00');
      setVoiceProcessing(true);
      setError(null);

      const data = await voiceService.analyzeAudio(filePath, 'audio/wav');
      setResult(data);
      if (data?.text) {
        addAnalysis(data.text, data);
      }

      if (
        data?.sentiment?.toLowerCase() === 'negative' &&
        data?.confidence > 0.7
      ) {
        Alert.alert(
          'High Risk Detected',
          'This voice message shows signs of significant distress. If you or someone you know needs help, please reach out to a mental health professional or call a crisis helpline.',
          [{ text: 'I Understand', style: 'cancel' }],
        );
      }
    } catch (err) {
      setError(err.message || 'Voice analysis failed');
    } finally {
      setVoiceProcessing(false);
    }
  }, [audioRecorderPlayer, addAnalysis]);

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
          'High Risk Detected',
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
        {/* Header Banner */}
        <LinearGradient
          colors={GRADIENTS.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerBanner}
        >
          <View style={styles.headerLogoRow}>
            <View style={styles.headerLogoCircle}>
              <Image
                source={require('../../assets/logo.png')}
                style={styles.headerLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.headerTitle}>Health Peek</Text>
          </View>
          <Text style={styles.headerSubtitle}>Analyze sentiment & emotions from text or voice</Text>
        </LinearGradient>

        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        {/* Mode Tabs */}
        <View style={styles.modeTabs}>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'text' && styles.modeTabActive]}
            onPress={() => { setMode('text'); setResult(null); setError(null); }}
          >
            <MaterialIcons name="text-fields" size={18} color={mode === 'text' ? '#FFF' : COLORS.primary} />
            <Text style={[styles.modeTabText, mode === 'text' && styles.modeTabTextActive]}>Text</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeTab, mode === 'voice' && styles.modeTabActive]}
            onPress={() => { setMode('voice'); setResult(null); setError(null); }}
          >
            <MaterialIcons name="mic" size={18} color={mode === 'voice' ? '#FFF' : COLORS.primary} />
            <Text style={[styles.modeTabText, mode === 'voice' && styles.modeTabTextActive]}>Voice</Text>
          </TouchableOpacity>
        </View>

        {mode === 'text' ? (
          <>
            {/* Text Input Section */}
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
                    onPress={handleAnalyze}
                    disabled={!message.trim() || loading}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={GRADIENTS.primaryButton}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.analyzeBtn, (!message.trim() || loading) && styles.analyzeBtnDisabled]}
                    >
                      <MaterialIcons name="analytics" size={16} color="#FFF" style={{ marginRight: 6 }} />
                      <Text style={styles.analyzeBtnText}>
                        {loading ? 'Analyzing...' : 'Analyze'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Voice Analysis Section */}
            <View style={styles.inputCard}>
              <Text style={styles.cardTitle}>Voice Emotion Analysis</Text>
              <Text style={styles.cardSubtitle}>
                Record your voice to analyze emotions and sentiment
              </Text>

              <View style={styles.voiceCenter}>
                {isRecording && (
                  <View style={styles.recordingIndicator}>
                    <View style={styles.recordingDot} />
                    <Text style={styles.recordingText}>Recording... {recordDuration}</Text>
                  </View>
                )}

                <TouchableOpacity
                  onPress={isRecording ? stopAndAnalyzeVoice : startVoiceRecording}
                  disabled={voiceProcessing}
                  activeOpacity={0.8}
                  style={styles.voiceRecordBtnOuter}
                >
                  <LinearGradient
                    colors={isRecording ? ['#ef4444', '#dc2626'] : GRADIENTS.primaryButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.voiceRecordBtn}
                  >
                    <MaterialIcons
                      name={isRecording ? 'stop' : 'mic'}
                      size={40}
                      color="#FFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.voiceHint}>
                  {voiceProcessing
                    ? 'Analyzing your voice...'
                    : isRecording
                    ? 'Tap to stop & analyze'
                    : 'Tap to start recording'}
                </Text>

                {voiceProcessing && (
                  <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: SPACING.md }} />
                )}
              </View>
            </View>

            {/* Voice transcription in result */}
            {result?.text && (
              <View style={styles.transcriptionCard}>
                <Text style={styles.transcriptionLabel}>Transcription</Text>
                <Text style={styles.transcriptionText}>"{result.text}"</Text>
              </View>
            )}
          </>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatImport')}
          >
            <MaterialIcons name="folder-open" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>Import Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('AnalysisHistory')}
          >
            <MaterialIcons name="history" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>History</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickBtn}
            onPress={() => navigation.navigate('ChatHistory')}
          >
            <MaterialIcons name="chat-bubble-outline" size={24} color={COLORS.primary} style={styles.quickIconStyle} />
            <Text style={styles.quickLabel}>Chat History</Text>
          </TouchableOpacity>
        </View>

        {/* Result */}
        {result && <AnalysisResultCard result={result} />}
      </ScrollView>

      <LoadingOverlay visible={loading} message="Analyzing message..." />
      <LoadingOverlay visible={voiceProcessing} message="Analyzing voice emotions..." />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  headerBanner: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    alignItems: 'center',
  },
  headerLogoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  headerLogoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  headerLogo: {
    width: 28,
    height: 28,
  },
  headerTitle: {
    ...FONTS.bold,
    fontSize: 22,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: 'rgba(255,255,255,0.8)',
  },
  inputCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.xl,
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
    minHeight: 130,
    borderWidth: 1.5,
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
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  clearBtnText: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
  },
  analyzeBtn: {
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.glow,
  },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.md,
    color: '#FFFFFF',
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
    ...SHADOWS.medium,
    borderTopWidth: 3,
    borderTopColor: COLORS.primary + '30',
  },
  quickIconStyle: { marginBottom: SPACING.sm },
  quickLabel: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.text,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: 4,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  modeTabActive: {
    backgroundColor: COLORS.primary,
  },
  modeTabText: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: COLORS.primary,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
  },
  voiceCenter: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  voiceRecordBtnOuter: {
    marginVertical: SPACING.lg,
  },
  voiceRecordBtn: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  voiceHint: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    gap: 8,
  },
  recordingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ef4444',
  },
  recordingText: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.md,
    color: '#dc2626',
  },
  transcriptionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginTop: SPACING.md,
    ...SHADOWS.small,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary,
  },
  transcriptionLabel: {
    ...FONTS.semiBold,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  transcriptionText: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.lg,
    color: COLORS.text,
    fontStyle: 'italic',
    lineHeight: 24,
  },
});

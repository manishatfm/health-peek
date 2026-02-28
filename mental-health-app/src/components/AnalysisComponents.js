import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

export function SentimentBadge({ sentiment, size = 'md' }) {
  const colorMap = {
    positive: COLORS.positive,
    negative: COLORS.negative,
    neutral: COLORS.neutral,
    mixed: COLORS.mixed,
  };
  const color = colorMap[sentiment?.toLowerCase()] || COLORS.textSecondary;
  const emojiMap = {
    positive: '😊',
    negative: '😟',
    neutral: '😐',
    mixed: '🤔',
  };
  const emoji = emojiMap[sentiment?.toLowerCase()] || '❓';

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }, size === 'sm' && styles.badgeSm]}>
      <Text style={[styles.badgeEmoji, size === 'sm' && styles.badgeEmojiSm]}>{emoji}</Text>
      <Text style={[styles.badgeText, { color }, size === 'sm' && styles.badgeTextSm]}>
        {sentiment || 'Unknown'}
      </Text>
    </View>
  );
}

export function ConfidenceBar({ confidence }) {
  const pct = Math.round((confidence || 0) * 100);
  const color = pct >= 70 ? COLORS.positive : pct >= 40 ? COLORS.warning : COLORS.error;

  return (
    <View style={styles.confContainer}>
      <View style={styles.confHeader}>
        <Text style={styles.confLabel}>Confidence</Text>
        <Text style={[styles.confPct, { color }]}>{pct}%</Text>
      </View>
      <View style={styles.confTrack}>
        <View style={[styles.confFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

export function EmotionChips({ emotions }) {
  if (!emotions || Object.keys(emotions).length === 0) return null;

  const sorted = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <View style={styles.chipContainer}>
      <Text style={styles.chipTitle}>Emotions</Text>
      <View style={styles.chipRow}>
        {sorted.map(([emotion, score]) => (
          <View key={emotion} style={styles.chip}>
            <Text style={styles.chipText}>
              {emotion} {Math.round(score * 100)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function RiskIndicator({ sentiment, confidence }) {
  let level = 'Low';
  let color = COLORS.riskLow;
  const conf = confidence || 0;

  if (sentiment?.toLowerCase() === 'negative' && conf > 0.7) {
    level = 'High';
    color = COLORS.riskHigh;
  } else if (sentiment?.toLowerCase() === 'negative' && conf > 0.5) {
    level = 'Medium';
    color = COLORS.riskMedium;
  }

  return (
    <View style={[styles.riskBadge, { backgroundColor: color + '15', borderColor: color }]}>
      <Text style={[styles.riskText, { color }]}>⚡ Risk: {level}</Text>
    </View>
  );
}

export function AnalysisResultCard({ result }) {
  if (!result) return null;

  return (
    <View style={styles.resultCard}>
      <Text style={styles.resultTitle}>Analysis Result</Text>
      <View style={styles.resultRow}>
        <SentimentBadge sentiment={result.sentiment} />
        <RiskIndicator sentiment={result.sentiment} confidence={result.confidence} />
      </View>
      <ConfidenceBar confidence={result.confidence} />
      <EmotionChips emotions={result.emotions} />
      {result.emoji_analysis && result.emoji_analysis.has_emojis && (
        <View style={styles.emojiSection}>
          <Text style={styles.chipTitle}>Emoji Analysis</Text>
          <Text style={styles.emojiText}>
            Sentiment: {result.emoji_analysis.emoji_sentiment || 'N/A'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  badgeSm: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  badgeEmoji: { fontSize: 16, marginRight: SPACING.xs },
  badgeEmojiSm: { fontSize: 12 },
  badgeText: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, textTransform: 'capitalize' },
  badgeTextSm: { fontSize: FONTS.sizes.sm },
  confContainer: { marginVertical: SPACING.md },
  confHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: SPACING.xs },
  confLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  confPct: { ...FONTS.bold, fontSize: FONTS.sizes.sm },
  confTrack: { height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full },
  confFill: { height: 8, borderRadius: RADIUS.full },
  chipContainer: { marginTop: SPACING.md },
  chipTitle: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.primaryLight + '20',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  chipText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.primary, textTransform: 'capitalize' },
  riskBadge: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  riskText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm },
  resultCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginTop: SPACING.lg,
    ...SHADOWS.medium,
  },
  resultTitle: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text, marginBottom: SPACING.md },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emojiSection: { marginTop: SPACING.md },
  emojiText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

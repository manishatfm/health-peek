import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { analysisService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function ChatDetailScreen({ route }) {
  const { chatId } = route.params;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const result = await analysisService.getChatAnalysisById(chatId);
        setData(result);
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    })();
  }, [chatId]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Failed to load chat analysis</Text>
      </View>
    );
  }

  const analysis = data.analysis || data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Overview */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>📊 Overview</Text>
        <View style={styles.overviewGrid}>
          <StatBox label="Messages" value={analysis.basic_stats?.total_messages || 0} />
          <StatBox label="Participants" value={Object.keys(analysis.participants || {}).length} />
          <StatBox label="Format" value={data.format_detected || 'N/A'} />
        </View>
      </View>

      {/* Participants */}
      {analysis.participants && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>👥 Participants</Text>
          {Object.entries(analysis.participants).map(([name, info]) => (
            <View key={name} style={styles.participantRow}>
              <Text style={styles.participantName}>{name}</Text>
              <Text style={styles.participantCount}>{info.message_count || info} msgs</Text>
            </View>
          ))}
        </View>
      )}

      {/* Sentiment */}
      {analysis.sentiment_analysis && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>😊 Sentiment Analysis</Text>
          {Object.entries(analysis.sentiment_analysis.overall_sentiment || {}).map(([key, val]) => (
            <View key={key} style={styles.barRow}>
              <Text style={styles.barLabel}>{key}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[styles.barFill, {
                    width: `${Math.min(val * 100, 100)}%`,
                    backgroundColor: key === 'positive' ? COLORS.positive : key === 'negative' ? COLORS.negative : COLORS.neutral,
                  }]}
                />
              </View>
              <Text style={styles.barPct}>{Math.round(val * 100)}%</Text>
            </View>
          ))}
        </View>
      )}

      {/* Engagement Metrics */}
      {analysis.engagement_metrics && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📈 Engagement</Text>
          {analysis.engagement_metrics.avg_response_time && (
            <MetricRow label="Avg Response Time" value={analysis.engagement_metrics.avg_response_time} />
          )}
          {analysis.engagement_metrics.initiator && (
            <MetricRow label="Most Initiates" value={analysis.engagement_metrics.initiator} />
          )}
        </View>
      )}

      {/* Messaging Patterns */}
      {analysis.messaging_patterns?.most_active_hour !== undefined && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🕐 Patterns</Text>
          <MetricRow label="Most Active Hour" value={`${analysis.messaging_patterns.most_active_hour}:00`} />
          {analysis.messaging_patterns.most_active_day && (
            <MetricRow label="Most Active Day" value={analysis.messaging_patterns.most_active_day} />
          )}
        </View>
      )}

      {/* Red Flags */}
      {analysis.red_flags?.warnings?.length > 0 && (
        <View style={[styles.card, styles.redFlagCard]}>
          <Text style={[styles.cardTitle, { color: COLORS.error }]}>⚠️ Red Flags</Text>
          {analysis.red_flags.warnings.map((w, i) => (
            <Text key={i} style={styles.warningText}>• {w}</Text>
          ))}
        </View>
      )}

      {/* Emoji Stats */}
      {analysis.emoji_stats?.top_emojis?.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>😀 Top Emojis</Text>
          <View style={styles.emojiRow}>
            {analysis.emoji_stats.top_emojis.slice(0, 10).map((e, i) => (
              <View key={i} style={styles.emojiChip}>
                <Text style={styles.emojiChar}>{e.emoji || e[0]}</Text>
                <Text style={styles.emojiCount}>{e.count || e[1]}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Period */}
      {analysis.conversation_period && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📅 Conversation Period</Text>
          <Text style={styles.periodText}>
            {analysis.conversation_period.start_date} → {analysis.conversation_period.end_date}
          </Text>
          {analysis.conversation_period.duration_days && (
            <Text style={styles.periodDuration}>
              {analysis.conversation_period.duration_days} days
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function StatBox({ label, value }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MetricRow({ label, value }) {
  return (
    <View style={styles.metricRow}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { ...FONTS.medium, color: COLORS.error },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  redFlagCard: { borderLeftWidth: 3, borderLeftColor: COLORS.error },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.md },
  overviewGrid: { flexDirection: 'row', gap: SPACING.md },
  statBox: {
    flex: 1,
    backgroundColor: COLORS.primary + '10',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
  },
  statValue: { ...FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.primary },
  statLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  participantRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  participantName: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.text },
  participantCount: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  barRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  barLabel: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, width: 70, textTransform: 'capitalize' },
  barTrack: { flex: 1, height: 8, backgroundColor: COLORS.border, borderRadius: 4, marginHorizontal: SPACING.sm },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.text, width: 40, textAlign: 'right' },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  metricLabel: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  metricValue: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.text },
  warningText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.error, marginBottom: SPACING.xs, lineHeight: 20 },
  emojiRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  emojiChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  emojiChar: { fontSize: 18, marginRight: SPACING.xs },
  emojiCount: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  periodText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  periodDuration: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.primary, marginTop: SPACING.xs },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { dashboardService } from '../../services';
import { TimeRangeSelector, EmptyState, ErrorBanner } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  const [stats, setStats] = useState(null);
  const [moodTrends, setMoodTrends] = useState(null);
  const [timeRange, setTimeRange] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsData, moodData] = await Promise.all([
        dashboardService.getDashboardStats(timeRange),
        dashboardService.getMoodTrends(timeRange),
      ]);
      setStats(statsData);
      setMoodTrends(moodData);
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getRiskColor = (level) => {
    const colors = {
      low: COLORS.riskLow,
      medium: COLORS.riskMedium,
      high: COLORS.riskHigh,
      critical: COLORS.riskCritical,
    };
    return colors[level?.toLowerCase()] || COLORS.textSecondary;
  };

  if (!loading && !stats) {
    return (
      <View style={styles.container}>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
        <EmptyState
          icon="📊"
          title="No Data Yet"
          message="Analyze some messages to see your dashboard stats."
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} colors={[COLORS.primary]} />
      }
    >
      <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {stats && (
        <>
          {/* Wellbeing Score */}
          <View style={styles.wellbeingCard}>
            <View style={styles.wellbeingCircle}>
              <Text style={styles.wellbeingScore}>
                {(stats.wellbeingScore || 0).toFixed(1)}
              </Text>
              <Text style={styles.wellbeingMax}>/10</Text>
            </View>
            <Text style={styles.wellbeingLabel}>Wellbeing Score</Text>
            <Text style={styles.wellbeingDesc}>{stats.description || ''}</Text>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: getRiskColor(stats.riskLevel) }]}>
              <Text style={[styles.statCardValue, { color: getRiskColor(stats.riskLevel) }]}>
                {stats.riskLevel || 'N/A'}
              </Text>
              <Text style={styles.statCardLabel}>Risk Level</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: COLORS.info }]}>
              <Text style={[styles.statCardValue, { color: COLORS.info }]}>
                {stats.communicationFrequency || 0}
              </Text>
              <Text style={styles.statCardLabel}>Messages</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={[styles.statCard, { borderLeftColor: COLORS.primary }]}>
              <Text style={[styles.statCardValue, { color: COLORS.primary }]}>
                {stats.totalAnalyses || 0}
              </Text>
              <Text style={styles.statCardLabel}>Analyses</Text>
            </View>
            <View style={[styles.statCard, { borderLeftColor: COLORS.accent }]}>
              <Text style={[styles.statCardValue, { color: COLORS.accent }]}>
                {Math.round((stats.averageConfidence || 0) * 100)}%
              </Text>
              <Text style={styles.statCardLabel}>Avg Confidence</Text>
            </View>
          </View>

          {/* Sentiment Distribution */}
          {stats.sentimentDistribution && (
            <View style={styles.distributionCard}>
              <Text style={styles.cardTitle}>Sentiment Distribution</Text>
              {Object.entries(stats.sentimentDistribution).map(([sentiment, count]) => {
                const total = Object.values(stats.sentimentDistribution).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? (count / total) * 100 : 0;
                const colorMap = { positive: COLORS.positive, negative: COLORS.negative, neutral: COLORS.neutral };
                const color = colorMap[sentiment] || COLORS.textSecondary;

                return (
                  <View key={sentiment} style={styles.distRow}>
                    <Text style={[styles.distLabel, { color }]}>{sentiment}</Text>
                    <View style={styles.distBarTrack}>
                      <View style={[styles.distBarFill, { width: `${pct}%`, backgroundColor: color }]} />
                    </View>
                    <Text style={styles.distPct}>{Math.round(pct)}%</Text>
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* Mood Trends */}
      {moodTrends?.trends?.length > 0 && (
        <View style={styles.trendsCard}>
          <Text style={styles.cardTitle}>Mood Trends</Text>
          <Text style={styles.trendSubtitle}>
            {moodTrends.totalDataPoints} data points
          </Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.trendScroll}>
            <View style={styles.trendBars}>
              {moodTrends.trends.slice(-14).map((point, i) => {
                const sentimentScore = point.sentiment === 'positive' ? 1 : point.sentiment === 'negative' ? -1 : 0;
                const height = Math.abs(sentimentScore) * 40 + 20;
                const color = sentimentScore > 0 ? COLORS.positive : sentimentScore < 0 ? COLORS.negative : COLORS.neutral;

                return (
                  <View key={i} style={styles.trendBarContainer}>
                    <View style={[styles.trendBar, { height, backgroundColor: color }]} />
                    <Text style={styles.trendDate}>
                      {new Date(point.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.trendLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.positive }]} />
              <Text style={styles.legendText}>Positive</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.neutral }]} />
              <Text style={styles.legendText}>Neutral</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: COLORS.negative }]} />
              <Text style={styles.legendText}>Negative</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xxxl },
  wellbeingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  wellbeingCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: SPACING.md,
  },
  wellbeingScore: { ...FONTS.bold, fontSize: 32, color: COLORS.textOnPrimary },
  wellbeingMax: { ...FONTS.regular, fontSize: FONTS.sizes.lg, color: 'rgba(255,255,255,0.7)', marginTop: 8 },
  wellbeingLabel: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.textOnPrimary },
  wellbeingDesc: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.8)', textAlign: 'center', marginTop: SPACING.xs },
  statsRow: { flexDirection: 'row', gap: SPACING.md, marginBottom: SPACING.md },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderLeftWidth: 4,
    ...SHADOWS.small,
  },
  statCardValue: { ...FONTS.bold, fontSize: FONTS.sizes.xxl, textTransform: 'capitalize' },
  statCardLabel: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  distributionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.md },
  distRow: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.sm },
  distLabel: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, width: 70, textTransform: 'capitalize' },
  distBarTrack: { flex: 1, height: 10, backgroundColor: COLORS.border, borderRadius: 5, marginHorizontal: SPACING.sm },
  distBarFill: { height: 10, borderRadius: 5 },
  distPct: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.text, width: 40, textAlign: 'right' },
  trendsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  trendSubtitle: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  trendScroll: { marginBottom: SPACING.md },
  trendBars: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm, paddingVertical: SPACING.sm },
  trendBarContainer: { alignItems: 'center', width: 40 },
  trendBar: { width: 24, borderRadius: 4, minHeight: 8 },
  trendDate: { ...FONTS.regular, fontSize: 9, color: COLORS.textLight, marginTop: 4 },
  trendLegend: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.lg },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});

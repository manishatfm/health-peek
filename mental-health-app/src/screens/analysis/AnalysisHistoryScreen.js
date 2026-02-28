import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { useAnalysis } from '../../context/AnalysisContext';
import { SentimentBadge, ConfidenceBar } from '../../components/AnalysisComponents';
import { EmptyState, ConfirmDialog } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function AnalysisHistoryScreen() {
  const { analysisHistory, isLoading, loadAnalysisHistory, removeAnalysis } = useAnalysis();
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => {
    loadAnalysisHistory();
  }, [loadAnalysisHistory]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await removeAnalysis(deleteTarget);
    } catch (err) {
      Alert.alert('Error', 'Failed to delete analysis');
    }
    setDeleteTarget(null);
  }, [deleteTarget, removeAnalysis]);

  const renderItem = ({ item }) => {
    const date = new Date(item.timestamp || item.created_at);
    const timeStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return (
      <View style={styles.historyItem}>
        <View style={styles.itemHeader}>
          <SentimentBadge sentiment={item.sentiment} size="sm" />
          <Text style={styles.itemTime}>{timeStr}</Text>
        </View>
        <Text style={styles.itemMessage} numberOfLines={2}>{item.message}</Text>
        <View style={styles.itemFooter}>
          <Text style={styles.confText}>
            Confidence: {Math.round((item.confidence || 0) * 100)}%
          </Text>
          <TouchableOpacity onPress={() => setDeleteTarget(item.analysis_id)}>
            <Text style={styles.deleteBtn}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (!isLoading && analysisHistory.length === 0) {
    return (
      <EmptyState
        icon="📊"
        title="No Analysis History"
        message="Analyze some messages to see your history here."
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={analysisHistory}
        keyExtractor={(item) => item.analysis_id || item._id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadAnalysisHistory} colors={[COLORS.primary]} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Analysis"
        message="Are you sure you want to delete this analysis?"
        confirmText="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  list: { padding: SPACING.lg },
  historyItem: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  itemTime: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textLight },
  itemMessage: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text, lineHeight: 20, marginBottom: SPACING.sm },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  confText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  deleteBtn: { fontSize: 18, padding: SPACING.xs },
  separator: { height: SPACING.md },
});

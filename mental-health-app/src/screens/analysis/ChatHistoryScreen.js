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
import { analysisService } from '../../services';
import { EmptyState, ConfirmDialog } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function ChatHistoryScreen({ navigation }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analysisService.getChatHistory();
      setHistory(Array.isArray(data) ? data : data?.history || []);
    } catch (err) {
      if (err.message !== 'UNAUTHORIZED') {
        Alert.alert('Error', 'Failed to load chat history');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await analysisService.deleteChatImport(deleteTarget);
      setHistory(prev => prev.filter(h => (h._id || h.analysis_id) !== deleteTarget));
    } catch {
      Alert.alert('Error', 'Failed to delete');
    }
    setDeleteTarget(null);
  }, [deleteTarget]);

  const renderItem = ({ item }) => {
    const date = new Date(item.created_at);
    const dateStr = date.toLocaleDateString();
    const totalMsgs = item.total_messages || item.analysis?.basic_stats?.total_messages || 0;
    const format = item.format_detected || 'unknown';
    const participants = item.analysis?.participants ? Object.keys(item.analysis.participants).length : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('ChatDetail', { chatId: item._id || item.analysis_id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{format}</Text>
          </View>
          <Text style={styles.dateText}>{dateStr}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{totalMsgs}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{participants}</Text>
            <Text style={styles.statLabel}>People</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => setDeleteTarget(item._id || item.analysis_id)}
        >
          <Text style={styles.deleteBtnText}>🗑️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (!loading && history.length === 0) {
    return (
      <EmptyState
        icon="💬"
        title="No Chat Imports"
        message="Import a chat to see analysis here."
        actionLabel="Import Chat"
        onAction={() => navigation.navigate('ChatImport')}
      />
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={history}
        keyExtractor={(item) => item._id || item.analysis_id || Math.random().toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadHistory} colors={[COLORS.primary]} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Delete Chat Import"
        message="This will permanently delete this chat analysis."
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
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  formatBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
  },
  formatText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary, textTransform: 'capitalize' },
  dateText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight },
  statsRow: { flexDirection: 'row', gap: SPACING.lg },
  stat: { alignItems: 'center' },
  statValue: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text },
  statLabel: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  deleteBtn: { position: 'absolute', right: SPACING.md, bottom: SPACING.md, padding: SPACING.xs },
  deleteBtnText: { fontSize: 16 },
  separator: { height: SPACING.md },
});

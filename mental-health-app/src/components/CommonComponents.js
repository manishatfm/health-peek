import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Modal,
} from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../theme';

export function LoadingOverlay({ visible, message = 'Loading...' }) {
  if (!visible) return null;
  return (
    <View style={styles.overlay}>
      <View style={styles.loadingCard}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{message}</Text>
      </View>
    </View>
  );
}

export function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>⚠️ {message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss}>
          <Text style={styles.errorDismiss}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function EmptyState({ icon = '📭', title, message, actionLabel, onAction }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>{icon}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.emptyAction} onPress={onAction}>
          <Text style={styles.emptyActionText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function ConfirmDialog({ visible, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false }) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.dialogCard}>
          <Text style={styles.dialogTitle}>{title}</Text>
          <Text style={styles.dialogMessage}>{message}</Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity style={styles.dialogCancelBtn} onPress={onCancel}>
              <Text style={styles.dialogCancelText}>{cancelText}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dialogConfirmBtn, destructive && styles.dialogDestructiveBtn]}
              onPress={onConfirm}
            >
              <Text style={styles.dialogConfirmText}>{confirmText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SectionHeader({ title, subtitle, rightAction }) {
  return (
    <View style={styles.sectionHeader}>
      <View>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle && <Text style={styles.sectionSubtitle}>{subtitle}</Text>}
      </View>
      {rightAction}
    </View>
  );
}

export function TimeRangeSelector({ value, onChange, options }) {
  const defaultOptions = options || ['7d', '30d', '90d'];
  const labels = { '7d': '7 Days', '30d': '30 Days', '90d': '90 Days', all: 'All Time' };
  return (
    <View style={styles.rangeContainer}>
      {defaultOptions.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.rangeButton, value === opt && styles.rangeButtonActive]}
          onPress={() => onChange(opt)}
        >
          <Text style={[styles.rangeText, value === opt && styles.rangeTextActive]}>
            {labels[opt] || opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  loadingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    ...SHADOWS.large,
  },
  loadingText: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.md,
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
  },
  errorBanner: {
    backgroundColor: COLORS.error + '15',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    borderRadius: RADIUS.sm,
  },
  errorText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.error, flex: 1 },
  errorDismiss: { fontSize: 18, color: COLORS.error, marginLeft: SPACING.md },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xxxl * 2,
    paddingHorizontal: SPACING.xxl,
  },
  emptyIcon: { fontSize: 48, marginBottom: SPACING.lg },
  emptyTitle: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text, marginBottom: SPACING.sm },
  emptyMessage: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  emptyAction: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xxl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.full,
  },
  emptyActionText: { ...FONTS.semiBold, color: COLORS.textOnPrimary, fontSize: FONTS.sizes.md },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xxl,
  },
  dialogCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    width: '100%',
    maxWidth: 340,
    ...SHADOWS.large,
  },
  dialogTitle: { ...FONTS.bold, fontSize: FONTS.sizes.xl, color: COLORS.text, marginBottom: SPACING.sm },
  dialogMessage: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  dialogActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: SPACING.md },
  dialogCancelBtn: { paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md, borderRadius: RADIUS.md },
  dialogCancelText: { ...FONTS.medium, color: COLORS.textSecondary, fontSize: FONTS.sizes.md },
  dialogConfirmBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  dialogDestructiveBtn: { backgroundColor: COLORS.error },
  dialogConfirmText: { ...FONTS.semiBold, color: COLORS.textOnPrimary, fontSize: FONTS.sizes.md },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  sectionTitle: { ...FONTS.bold, fontSize: FONTS.sizes.xxl, color: COLORS.text },
  sectionSubtitle: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  rangeContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.xs,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  rangeButton: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  rangeButtonActive: { backgroundColor: COLORS.primary },
  rangeText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  rangeTextActive: { color: COLORS.textOnPrimary },
});

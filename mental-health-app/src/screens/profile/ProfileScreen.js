import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { user, logout, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const updated = await authService.updateProfile({ name: name.trim() });
      updateUser(updated);
      setEditing(false);
      Alert.alert('Success', 'Profile updated.');
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {user?.profile_image ? (
            <Image source={{ uri: user.profile_image }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>
              {(user?.name || user?.email || '?')[0].toUpperCase()}
            </Text>
          )}
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Profile Information</Text>

        <Text style={styles.label}>Name</Text>
        {editing ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
              <Text style={styles.saveBtnText}>{saving ? '...' : 'Save'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditing(false); setName(user?.name || ''); }}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoText}>{user?.name || 'Not set'}</Text>
            <TouchableOpacity onPress={() => setEditing(true)}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.label}>Email</Text>
        <Text style={styles.infoText}>{user?.email || 'N/A'}</Text>

        {user?.is_admin && (
          <>
            <Text style={styles.label}>Role</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          </>
        )}
      </View>

      {/* Account Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Export')}>
          <Text style={styles.menuIcon}>📤</Text>
          <Text style={styles.menuText}>Export & Reports</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AnalysisHistory')}>
          <Text style={styles.menuIcon}>📊</Text>
          <Text style={styles.menuText}>Analysis History</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('ChatHistory')}>
          <Text style={styles.menuIcon}>💬</Text>
          <Text style={styles.menuText}>Chat Imports</Text>
          <Text style={styles.menuArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Health Peek v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  avatarContainer: { alignItems: 'center', marginBottom: SPACING.xl, marginTop: SPACING.md },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { ...FONTS.bold, fontSize: 36, color: '#FFF' },
  userName: { ...FONTS.bold, fontSize: 22, color: COLORS.text },
  userEmail: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.lg },
  label: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text },
  editLink: { ...FONTS.semiBold, fontSize: FONTS.sizes.md, color: COLORS.primary },
  editRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.divider,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  saveBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  saveBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.sm, color: '#FFF' },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cancelBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  adminBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.md,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  adminBadgeText: { ...FONTS.semiBold, fontSize: FONTS.sizes.sm, color: COLORS.primary },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  menuIcon: { fontSize: 20, marginRight: SPACING.md },
  menuText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.text, flex: 1 },
  menuArrow: { ...FONTS.regular, fontSize: 24, color: COLORS.textLight },
  logoutBtn: {
    backgroundColor: COLORS.error + '10',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  logoutText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.error },
  versionText: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.sm,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});

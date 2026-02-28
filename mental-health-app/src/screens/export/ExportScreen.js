import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { dashboardService } from '../../services';
import { TimeRangeSelector } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

const REPORT_TYPES = [
  {
    key: 'personal',
    title: 'Personal Report',
    icon: '📋',
    desc: 'Comprehensive analysis of your mental health trends, patterns, and detailed insights.',
    endpoint: 'personal',
  },
  {
    key: 'clinical',
    title: 'Clinical Summary',
    icon: '🏥',
    desc: 'Professional-grade summary suitable for sharing with healthcare providers.',
    endpoint: 'clinical',
  },
  {
    key: 'charts',
    title: 'Data Charts',
    icon: '📊',
    desc: 'Visual charts and graphs of your mood trends and sentiment distribution.',
    endpoint: 'charts',
  },
];

const EXPORT_FORMATS = [
  { key: 'csv', label: 'CSV', icon: '📑' },
  { key: 'json', label: 'JSON', icon: '📦' },
];

export default function ExportScreen() {
  const [timeRange, setTimeRange] = useState('30d');
  const [downloading, setDownloading] = useState(null);
  const [exporting, setExporting] = useState(null);

  const handleDownloadReport = async (report) => {
    setDownloading(report.key);
    try {
      await dashboardService.downloadReport(report.endpoint, timeRange);
      Alert.alert('Success', `${report.title} downloaded successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    } finally {
      setDownloading(null);
    }
  };

  const handleExport = async (format) => {
    setExporting(format);
    try {
      await dashboardService.exportData(timeRange, format);
      Alert.alert('Success', `Data exported as ${format.toUpperCase()} successfully.`);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to export data.');
    } finally {
      setExporting(null);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <Text style={styles.heading}>📤 Export & Reports</Text>
      <Text style={styles.subheading}>Download reports or export your data</Text>

      {/* Time Range */}
      <View style={styles.rangeSection}>
        <Text style={styles.sectionTitle}>Time Period</Text>
        <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
      </View>

      {/* Reports */}
      <Text style={styles.sectionTitle}>📥 Download Reports (PDF)</Text>
      {REPORT_TYPES.map((report) => (
        <View key={report.key} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardIcon}>{report.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>{report.title}</Text>
              <Text style={styles.cardDesc}>{report.desc}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={() => handleDownloadReport(report)}
            disabled={downloading === report.key}
          >
            {downloading === report.key ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={styles.downloadBtnText}>Download PDF</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}

      {/* Data Export */}
      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>📊 Export Raw Data</Text>
      <View style={styles.exportRow}>
        {EXPORT_FORMATS.map((fmt) => (
          <TouchableOpacity
            key={fmt.key}
            style={styles.exportCard}
            onPress={() => handleExport(fmt.key)}
            disabled={exporting === fmt.key}
          >
            <Text style={styles.exportIcon}>{fmt.icon}</Text>
            {exporting === fmt.key ? (
              <ActivityIndicator color={COLORS.primary} size="small" style={{ marginTop: 8 }} />
            ) : (
              <>
                <Text style={styles.exportLabel}>{fmt.label}</Text>
                <Text style={styles.exportHint}>Export as {fmt.label}</Text>
              </>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  heading: { ...FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: 4 },
  subheading: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: SPACING.xl },
  rangeSection: { marginBottom: SPACING.xl },
  sectionTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.md },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  cardBody: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.md },
  cardIcon: { fontSize: 28, marginRight: SPACING.md },
  cardTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: 4 },
  cardDesc: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  downloadBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  downloadBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.md, color: '#FFFFFF' },
  exportRow: { flexDirection: 'row', gap: SPACING.md },
  exportCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  exportIcon: { fontSize: 36, marginBottom: SPACING.sm },
  exportLabel: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text },
  exportHint: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Linking,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { blogService } from '../../services';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function BlogDetailScreen({ route }) {
  const { blogId, blogUrl, title } = route.params || {};
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (blogUrl) {
      // RSS article — just show link
      setBlog({ title: title || 'Article', link: blogUrl });
      setLoading(false);
      return;
    }

    const fetchBlog = async () => {
      try {
        const data = await blogService.getBlog(blogId);
        setBlog(data);
      } catch {
        setBlog(null);
      } finally {
        setLoading(false);
      }
    };
    if (blogId) fetchBlog();
    else setLoading(false);
  }, [blogId, blogUrl, title]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!blog) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Article not found.</Text>
      </View>
    );
  }

  // RSS article — show title and open in browser
  if (blog.link && !blog.content && !blog.sections) {
    return (
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <Text style={styles.title}>{blog.title}</Text>
          <TouchableOpacity
            style={styles.openBtn}
            onPress={() => Linking.openURL(blog.link)}
          >
            <Text style={styles.openBtnText}>🌐 Open in Browser</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // Full blog post
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Category & Tags */}
        <View style={styles.metaRow}>
          {blog.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{blog.category}</Text>
            </View>
          )}
          {(blog.tags || []).map((tag, i) => (
            <View key={i} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.title}>{blog.title}</Text>

        {/* Author */}
        {blog.author_email && (
          <Text style={styles.authorText}>By {blog.author_email}</Text>
        )}
        {blog.created_at && (
          <Text style={styles.dateText}>
            {new Date(blog.created_at).toLocaleDateString('en-US', {
              year: 'numeric', month: 'long', day: 'numeric',
            })}
          </Text>
        )}

        {/* Description */}
        {blog.description && (
          <Text style={styles.description}>{blog.description}</Text>
        )}

        {/* Content */}
        {blog.content && <Text style={styles.body}>{blog.content}</Text>}

        {/* Sections */}
        {(blog.sections || []).map((section, idx) => (
          <View key={idx} style={styles.section}>
            {section.heading && <Text style={styles.sectionHeading}>{section.heading}</Text>}
            {section.body && <Text style={styles.sectionBody}>{section.body}</Text>}
            {(section.tips || []).length > 0 && (
              <View style={styles.tipsContainer}>
                {section.tips.map((tip, ti) => (
                  <View key={ti} style={styles.tipRow}>
                    <Text style={styles.tipBullet}>💡</Text>
                    <Text style={styles.tipText}>{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}

        {/* Likes */}
        <View style={styles.footer}>
          <Text style={styles.likes}>❤️ {blog.likes || 0} likes</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: SPACING.lg, paddingBottom: 60 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  errorText: { ...FONTS.medium, fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.sm },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  categoryText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.primary, textTransform: 'capitalize' },
  tagBadge: {
    backgroundColor: COLORS.divider,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  tagText: { ...FONTS.regular, fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  title: { ...FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: SPACING.sm },
  authorText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, marginBottom: 2 },
  dateText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight, marginBottom: SPACING.lg },
  description: {
    ...FONTS.medium,
    fontSize: FONTS.sizes.lg,
    color: COLORS.textSecondary,
    lineHeight: 24,
    marginBottom: SPACING.lg,
    fontStyle: 'italic',
  },
  body: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionHeading: {
    ...FONTS.bold,
    fontSize: FONTS.sizes.xl,
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  sectionBody: {
    ...FONTS.regular,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 24,
    marginBottom: SPACING.md,
  },
  tipsContainer: {
    backgroundColor: COLORS.primary + '08',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  tipRow: { flexDirection: 'row', marginBottom: SPACING.sm },
  tipBullet: { marginRight: SPACING.sm, fontSize: 16 },
  tipText: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.text, flex: 1, lineHeight: 22 },
  footer: {
    paddingTop: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    alignItems: 'center',
  },
  likes: { ...FONTS.semiBold, fontSize: FONTS.sizes.lg, color: COLORS.secondary },
  openBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
    alignSelf: 'center',
    marginTop: SPACING.xl,
    ...SHADOWS.small,
  },
  openBtnText: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: '#FFFFFF' },
});

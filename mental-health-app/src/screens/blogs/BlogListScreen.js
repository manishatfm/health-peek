import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Image,
  RefreshControl,
} from 'react-native';
import { blogService } from '../../services';
import { EmptyState } from '../../components/CommonComponents';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../theme';

export default function BlogListScreen({ navigation }) {
  const [blogs, setBlogs] = useState([]);
  const [rssArticles, setRssArticles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('blogs');

  const loadBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const [adminBlogs, builtIn, rss] = await Promise.allSettled([
        blogService.getAdminBlogs(),
        blogService.getAllBlogs(),
        blogService.getRssArticles(),
      ]);

      const admin = adminBlogs.status === 'fulfilled' ? (Array.isArray(adminBlogs.value) ? adminBlogs.value : adminBlogs.value?.posts || []) : [];
      const built = builtIn.status === 'fulfilled' ? (Array.isArray(builtIn.value) ? builtIn.value : []) : [];
      const rssData = rss.status === 'fulfilled' ? (Array.isArray(rss.value) ? rss.value : rss.value?.articles || []) : [];

      setBlogs([...admin, ...built]);
      setRssArticles(rssData);
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBlogs();
  }, [loadBlogs]);

  const handleBlogPress = (blog) => {
    if (blog.link || blog.url) {
      // RSS article - navigate to detail with url
      navigation.navigate('BlogDetail', { blogUrl: blog.link || blog.url, title: blog.title });
    } else {
      navigation.navigate('BlogDetail', { blogId: blog._id || blog.id });
    }
  };

  const handleLike = async (blogId) => {
    try {
      await blogService.likeBlog(blogId);
      setBlogs(prev =>
        prev.map(b => (b._id || b.id) === blogId ? { ...b, likes: (b.likes || 0) + 1 } : b)
      );
    } catch {
      // Ignore
    }
  };

  const renderBlogItem = ({ item }) => {
    const isRss = !!(item.link || item.url);

    return (
      <TouchableOpacity
        style={styles.blogCard}
        onPress={() => handleBlogPress(item)}
        activeOpacity={0.7}
      >
        {item.cover_image && (
          <Image
            source={{ uri: item.cover_image.startsWith('data:') ? item.cover_image : `data:image/jpeg;base64,${item.cover_image}` }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        )}
        {item.image && !item.cover_image && (
          <Image source={{ uri: item.image }} style={styles.coverImage} resizeMode="cover" />
        )}

        <View style={styles.blogContent}>
          <View style={styles.blogHeader}>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            {isRss && (
              <View style={[styles.categoryBadge, { backgroundColor: COLORS.info + '20' }]}>
                <Text style={[styles.categoryText, { color: COLORS.info }]}>RSS</Text>
              </View>
            )}
          </View>

          <Text style={styles.blogTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.blogDesc} numberOfLines={3}>
            {item.description || item.summary || ''}
          </Text>

          <View style={styles.blogFooter}>
            {item.author_email && (
              <Text style={styles.authorText}>By {item.author_email}</Text>
            )}
            {!isRss && item._id && (
              <TouchableOpacity
                style={styles.likeBtn}
                onPress={() => handleLike(item._id)}
              >
                <Text style={styles.likeBtnText}>❤️ {item.likes || 0}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'blogs' ? blogs : rssArticles;

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'blogs' && styles.activeTab]}
          onPress={() => setActiveTab('blogs')}
        >
          <Text style={[styles.tabText, activeTab === 'blogs' && styles.activeTabText]}>
            📝 Articles
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'rss' && styles.activeTab]}
          onPress={() => setActiveTab('rss')}
        >
          <Text style={[styles.tabText, activeTab === 'rss' && styles.activeTabText]}>
            📡 RSS Feed
          </Text>
        </TouchableOpacity>
      </View>

      {!loading && currentData.length === 0 ? (
        <EmptyState
          icon="📚"
          title={activeTab === 'blogs' ? 'No Articles Yet' : 'No RSS Articles'}
          message={activeTab === 'blogs' ? 'Check back for mental wellness articles.' : 'RSS feed is currently unavailable.'}
        />
      ) : (
        <FlatList
          data={currentData}
          keyExtractor={(item, i) => item._id || item.id || item.link || `${i}`}
          renderItem={renderBlogItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={loadBlogs} colors={[COLORS.primary]} />
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    borderRadius: RADIUS.md,
  },
  activeTab: { backgroundColor: COLORS.primary + '15' },
  tabText: { ...FONTS.medium, fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  activeTabText: { color: COLORS.primary },
  list: { padding: SPACING.lg },
  blogCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  coverImage: { width: '100%', height: 160 },
  blogContent: { padding: SPACING.lg },
  blogHeader: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.sm },
  categoryBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  categoryText: { ...FONTS.semiBold, fontSize: FONTS.sizes.xs, color: COLORS.primary, textTransform: 'capitalize' },
  blogTitle: { ...FONTS.bold, fontSize: FONTS.sizes.lg, color: COLORS.text, marginBottom: SPACING.xs },
  blogDesc: { ...FONTS.regular, fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 20 },
  blogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  authorText: { ...FONTS.regular, fontSize: FONTS.sizes.sm, color: COLORS.textLight },
  likeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.secondary + '10',
  },
  likeBtnText: { ...FONTS.medium, fontSize: FONTS.sizes.sm, color: COLORS.secondary },
  separator: { height: SPACING.md },
});

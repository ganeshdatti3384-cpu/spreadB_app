import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { promotionAPI } from '../../services/api';

const BrowseScreen = ({ navigation }) => {
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [categories, setCategories] = useState(['All']);

  const fetchPromotions = useCallback(async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory !== 'All') params.category = selectedCategory;
      const res = await promotionAPI.browse(params);
      setPromotions(res.data?.promotions || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await promotionAPI.getFilters();
        const cats = res.data?.categories || [];
        setCategories(['All', ...cats]);
      } catch (e) {}
    };
    fetchFilters();
  }, []);

  useEffect(() => {
    const timer = setTimeout(fetchPromotions, 400);
    return () => clearTimeout(timer);
  }, [fetchPromotions]);

  const onRefresh = () => { setRefreshing(true); fetchPromotions(); };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PromotionDetail', { id: item._id })}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={styles.brandIcon}>
          <Ionicons name="business-outline" size={18} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.budget}>₹{item.budget?.toLocaleString()} · {item.budgetType}</Text>
        </View>
        <View style={[styles.badge, item.applicationStatus === 'open' ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.badgeText, item.applicationStatus === 'open' ? styles.textOpen : styles.textClosed]}>
            {item.applicationStatus}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      )}

      <View style={styles.meta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.locations?.[0] || 'Remote'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.duration}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="star" size={12} color={COLORS.warning} />
          <Text style={styles.metaText}>{item.requiredSticks} sticks</Text>
        </View>
      </View>

      <View style={styles.chips}>
        {item.categories?.slice(0, 3).map((cat, i) => (
          <View key={i} style={styles.chip}>
            <Text style={styles.chipText}>{cat}</Text>
          </View>
        ))}
        {item.openings > 0 && (
          <View style={[styles.chip, styles.chipGreen]}>
            <Text style={[styles.chipText, { color: COLORS.primary }]}>
              {item.openings - (item.filledPositions || 0)} spots left
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse Campaigns</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={COLORS.gray400} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search campaigns..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.gray400} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* Category filter */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, selectedCategory === item && styles.filterChipActive]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text style={[styles.filterText, selectedCategory === item && styles.filterTextActive]}>
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Results */}
      <FlatList
        data={promotions}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No campaigns found</Text>
              <Text style={styles.emptySubtext}>Try adjusting your search or filters</Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  searchContainer: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text },
  filterList: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
    gap: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  filterChip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  filterChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  filterText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  filterTextActive: { color: COLORS.primary, fontWeight: '700' },
  list: { padding: SPACING.xl, paddingBottom: 100 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  brandIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text, lineHeight: 22 },
  budget: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  badgeOpen: { backgroundColor: '#dcfce7' },
  badgeClosed: { backgroundColor: COLORS.gray100 },
  badgeText: { fontSize: FONTS.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  textOpen: { color: COLORS.primary },
  textClosed: { color: COLORS.textSecondary },
  desc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20, marginBottom: SPACING.md },
  meta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  chipGreen: { backgroundColor: COLORS.primaryLight },
  chipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  empty: { alignItems: 'center', paddingVertical: 60, gap: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text },
  emptySubtext: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
});

export default BrowseScreen;

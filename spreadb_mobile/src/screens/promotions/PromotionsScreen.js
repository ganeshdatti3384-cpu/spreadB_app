import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { browsePromotions, searchPromotions, getMyPromotions, deletePromotion } from '../../api/promotions';

const FILTER_CATEGORIES = ['All', 'Fashion', 'Tech', 'Food', 'Travel', 'Beauty', 'Fitness', 'Lifestyle', 'Gaming', 'Music'];
const BRAND_TABS = ['all', 'active', 'closed'];

const STATUS_MAP = {
  active: { bg: COLORS.primaryLight, text: COLORS.primary },
  closed: { bg: '#FFF3E0', text: '#E65100' },
  draft:  { bg: '#F5F5F5', text: COLORS.textSecondary },
  urgent: { bg: '#FDECEA', text: COLORS.error },
};

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const s = STATUS_MAP[status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary };
  return (
    <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
      <Text style={[styles.statusText, { color: s.text }]}>{status}</Text>
    </View>
  );
}

// ─── Category Pill ────────────────────────────────────────────────────────────
function CategoryPill({ label }) {
  return (
    <View style={styles.categoryPill}>
      <Text style={styles.categoryPillText}>{label}</Text>
    </View>
  );
}

// ─── Influencer Card ──────────────────────────────────────────────────────────
function InfluencerCard({ item, onPress }) {
  const deadline = item.applicationDeadline
    ? new Date(item.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Open';

  return (
    <View style={styles.card}>
      {/* Badges row */}
      <View style={styles.cardTopRow}>
        <CategoryPill label={item.categories?.[0] || 'General'} />
        <StatusBadge status={item.status === 'urgent' ? 'Urgent' : item.status} />
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {/* Brand */}
      {item.brandName && (
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.brandName}</Text>
        </View>
      )}

      {/* Locations */}
      {item.locations?.length > 0 && (
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{item.locations.slice(0, 3).join(' · ')}</Text>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Ionicons name="cash-outline" size={13} color={COLORS.primary} />
          <Text style={styles.statValue}>₹{item.budget?.toLocaleString()}</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="flash-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.statValueMuted}>{item.requiredSticks || 0} Sticks ⚡</Text>
        </View>
        <View style={styles.statItem}>
          <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.statValueMuted}>{deadline}</Text>
        </View>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.applyBtn} onPress={onPress} activeOpacity={0.85}>
        <Text style={styles.applyBtnText}>View & Apply</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Brand Card ───────────────────────────────────────────────────────────────
function BrandCard({ item, onPress, onEdit, onDelete, deleting }) {
  return (
    <View style={styles.card}>
      {/* Badges row */}
      <View style={styles.cardTopRow}>
        <CategoryPill label={item.categories?.[0] || 'General'} />
        <StatusBadge status={item.status} />
      </View>

      {/* Title */}
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>

      {/* Stats grid */}
      <View style={styles.brandStatsGrid}>
        <View style={styles.brandStatBox}>
          <Text style={styles.brandStatBoxLabel}>Budget</Text>
          <Text style={styles.brandStatBoxValue}>₹{item.budget?.toLocaleString()}</Text>
        </View>
        <View style={styles.brandStatDivider} />
        <View style={styles.brandStatBox}>
          <Text style={styles.brandStatBoxLabel}>Openings</Text>
          <Text style={styles.brandStatBoxValue}>{item.openings || 0}</Text>
        </View>
        <View style={styles.brandStatDivider} />
        <View style={styles.brandStatBox}>
          <Text style={styles.brandStatBoxLabel}>Applied</Text>
          <Text style={[styles.brandStatBoxValue, { color: COLORS.primary }]}>{item.applicantCount || 0}</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.brandActions}>
        <TouchableOpacity style={styles.viewApplicantsBtn} onPress={onPress} activeOpacity={0.85}>
          <Ionicons name="people-outline" size={14} color={COLORS.primary} />
          <Text style={styles.viewApplicantsBtnText}>View Applicants</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconBtn} onPress={onEdit} activeOpacity={0.8}>
          <Ionicons name="create-outline" size={16} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, styles.iconBtnDanger]}
          onPress={onDelete}
          activeOpacity={0.8}
          disabled={deleting}
        >
          {deleting
            ? <ActivityIndicator size="small" color={COLORS.error} />
            : <Ionicons name="trash-outline" size={16} color={COLORS.error} />
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PromotionsScreen({ navigation }) {
  const { user } = useAuth();
  const isInfluencer = user?.role === 'Influencer';
  const isBrand      = user?.role === 'Brand Owner';

  const [promotions, setPromotions]   = useState([]);
  const [search, setSearch]           = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeTab, setActiveTab]     = useState('all');
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [deletingId, setDeletingId]   = useState(null);

  const load = useCallback(async () => {
    try {
      const res = isBrand ? await getMyPromotions() : await browsePromotions();
      setPromotions(res.data?.promotions || []);
    } catch (e) {
      console.log('Promotions load error:', e?.response?.status, e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isBrand]);

  const handleSearch = useCallback(async (text) => {
    setSearch(text);
    if (!text.trim()) return load();
    try {
      const res = await searchPromotions({
        search: text,
        category: activeFilter !== 'All' ? activeFilter : undefined,
      });
      setPromotions(res.data?.promotions || []);
    } catch (e) { console.log('Search error:', e?.response?.status); }
  }, [activeFilter, load]);

  const handleFilter = useCallback(async (cat) => {
    setActiveFilter(cat);
    setLoading(true);
    try {
      const params = cat !== 'All' ? { category: cat } : {};
      if (search.trim()) params.search = search;
      const res = await searchPromotions(params);
      setPromotions(res.data?.promotions || []);
    } catch (e) { console.log('Filter error:', e?.response?.status); }
    finally { setLoading(false); }
  }, [search]);

  const handleDelete = (id) => {
    Alert.alert('Delete Campaign', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          setDeletingId(id);
          try {
            await deletePromotion(id);
            setPromotions(prev => prev.filter(p => p._id !== id));
          } catch (e) {
            Alert.alert('Error', 'Failed to delete campaign');
          } finally {
            setDeletingId(null);
          }
        },
      },
    ]);
  };

  useEffect(() => { load(); }, [load]);

  const displayed = isBrand && activeTab !== 'all'
    ? promotions.filter(p => p.status?.toLowerCase() === activeTab)
    : promotions;

  return (
    <View style={styles.container}>

      {/* ── INFLUENCER HEADER ── */}
      {isInfluencer && (
        <LinearGradient
          colors={['#0A2010', '#0D3015', '#0A1628']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.influencerHeader}
        >
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.headerTitle}>Campaigns</Text>
              <Text style={styles.headerSub}>{promotions.length} available</Text>
            </View>
          </View>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.5)" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search campaigns..."
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={search}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.5)" />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      )}

      {/* ── BRAND HEADER ── */}
      {isBrand && (
        <View style={styles.brandHeader}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.brandHeaderTitle}>My Campaigns</Text>
              <Text style={styles.brandHeaderSub}>{promotions.length} campaigns</Text>
            </View>
            <TouchableOpacity
              style={styles.postBtn}
              onPress={() => navigation.navigate('CreatePromotion')}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.postBtnText}>Post</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.brandSearchBar}>
            <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.brandSearchInput}
              placeholder="Search campaigns..."
              placeholderTextColor={COLORS.placeholder}
              value={search}
              onChangeText={handleSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => handleSearch('')}>
                <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>

          {/* Segmented tab control */}
          <View style={styles.segmentedControl}>
            {BRAND_TABS.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[styles.segmentTab, activeTab === tab && styles.segmentTabActive]}
                onPress={() => setActiveTab(tab)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentTabText, activeTab === tab && styles.segmentTabTextActive]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── CATEGORY FILTER CHIPS (influencer) ── */}
      {isInfluencer && (
        <View style={styles.filterWrap}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterContent}
          >
            {FILTER_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.filterChip, activeFilter === cat && styles.filterChipActive]}
                onPress={() => handleFilter(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, activeFilter === cat && styles.filterChipTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* ── LIST ── */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) =>
            isInfluencer
              ? <InfluencerCard
                  item={item}
                  onPress={() => navigation.navigate('PromotionDetail', { id: item._id })}
                />
              : <BrandCard
                  item={item}
                  onPress={() => navigation.navigate('PromotionDetail', { id: item._id })}
                  onEdit={() => navigation.navigate('CreatePromotion', { editId: item._id, editData: item })}
                  onDelete={() => handleDelete(item._id)}
                  deleting={deletingId === item._id}
                />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="search-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No campaigns found</Text>
              <Text style={styles.emptySubtitle}>
                {isBrand
                  ? 'Post your first campaign to get started'
                  : 'Try different filters or check back later'}
              </Text>
              {isBrand && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => navigation.navigate('CreatePromotion')}
                >
                  <Ionicons name="add" size={16} color="#fff" />
                  <Text style={styles.emptyActionText}>Post Campaign</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* ── FAB (brand) ── */}
      {isBrand && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('CreatePromotion')}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Influencer header (gradient)
  influencerHeader: { paddingTop: 52, paddingHorizontal: 20, paddingBottom: 20 },
  headerContent: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerSub:   { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: SIZES.radiusLg, paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },

  // Brand header (white)
  brandHeader: {
    backgroundColor: COLORS.white, paddingTop: 52, paddingHorizontal: 20,
    paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  brandHeaderTitle: { fontSize: 22, fontWeight: '700', color: COLORS.text },
  brandHeaderSub:   { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  postBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 9,
  },
  postBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  brandSearchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: SIZES.radiusLg,
    paddingHorizontal: 14, height: 44, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  brandSearchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  // Segmented control (brand tabs)
  segmentedControl: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: SIZES.radius, padding: 4,
  },
  segmentTab: {
    flex: 1, paddingVertical: 9, alignItems: 'center',
    borderRadius: SIZES.radius - 2,
  },
  segmentTabActive: {
    backgroundColor: COLORS.white,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  segmentTabText:       { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500', textTransform: 'capitalize' },
  segmentTabTextActive: { color: COLORS.text, fontWeight: '700' },

  // Category filter chips
  filterWrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  filterContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    borderRadius: 999, paddingHorizontal: 16, paddingVertical: 7,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  filterChipActive:     { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterChipText:       { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  filterChipTextActive: { color: '#fff', fontWeight: '600' },

  // List
  list: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 100 },

  // Card
  card: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTopRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  categoryPill: {
    backgroundColor: COLORS.primaryLight, borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  categoryPillText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },
  statusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusText:  { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  cardTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, lineHeight: 22, marginBottom: 8 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5 },
  metaText: { fontSize: 12, color: COLORS.textSecondary, flex: 1 },

  // Influencer stats row
  statsRow: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    marginTop: 4, marginBottom: 14,
  },
  statItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statValue:     { fontSize: 13, fontWeight: '700', color: COLORS.text },
  statValueMuted: { fontSize: 13, color: COLORS.textSecondary },

  applyBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 42, alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // Brand stats grid
  brandStatsGrid: {
    flexDirection: 'row', backgroundColor: COLORS.background,
    borderRadius: SIZES.radius, padding: 14, marginBottom: 14, marginTop: 4,
  },
  brandStatBox:     { flex: 1, alignItems: 'center', gap: 4 },
  brandStatBoxLabel: { fontSize: 10, color: COLORS.textSecondary },
  brandStatBoxValue: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  brandStatDivider:  { width: 1, backgroundColor: COLORS.borderLight, marginHorizontal: 4 },

  // Brand actions
  brandActions: { flexDirection: 'row', gap: 8 },
  viewApplicantsBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: SIZES.radius, height: 40,
  },
  viewApplicantsBtnText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  iconBtn: {
    width: 40, height: 40, borderRadius: SIZES.radius,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: COLORS.border,
  },
  iconBtnDanger: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyAction: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    paddingHorizontal: 20, paddingVertical: 11,
  },
  emptyActionText: { color: '#fff', fontWeight: '700', fontSize: 13 },

  // FAB
  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    elevation: 8, shadowColor: COLORS.primary, shadowOpacity: 0.45,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
});

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { useLocation } from '../../hooks/useLocation';
import { browsePromotions, getMyPromotions } from '../../api/promotions';
import { getMyApplications } from '../../api/applications';
import { getCounts } from '../../api/notifications';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG = {
  active:   { bg: COLORS.primaryLight, text: COLORS.primary },
  closed:   { bg: '#FFF0E0', text: '#C84B00' },
  pending:  { bg: '#FFF8E0', text: '#B07800' },
  accepted: { bg: COLORS.primaryLight, text: COLORS.primary },
  rejected: { bg: '#FDECEA', text: COLORS.error },
};

function StatusBadge({ status }) {
  const s = STATUS_CFG[status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary };
  return (
    <View style={[badge.wrap, { backgroundColor: s.bg }]}>
      <Text style={[badge.text, { color: s.text }]}>{status}</Text>
    </View>
  );
}
const badge = StyleSheet.create({
  wrap: { borderRadius: SIZES.radiusFull, paddingHorizontal: 8, paddingVertical: 3 },
  text: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
});

// ─── Greeting ─────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, accent, onPress }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={onPress ? 0.75 : 1}>
      <View style={[styles.statIcon, { backgroundColor: accent + '1A' }]}>
        <Ionicons name={icon} size={18} color={accent} />
      </View>
      <Text style={styles.statValue}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({ icon, label, accent, bg, onPress }) {
  return (
    <TouchableOpacity style={styles.qa} onPress={onPress} activeOpacity={0.75}>
      <View style={[styles.qaIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={accent} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

// ─── Campaign Card ────────────────────────────────────────────────────────────
function CampaignCard({ item, onPress }) {
  const deadline = item.applicationDeadline
    ? new Date(item.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : 'Open';
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={styles.catBadge}>
          <Text style={styles.catText}>{item.categories?.[0] || 'General'}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
      <View style={styles.cardMeta}>
        <View style={styles.metaRow}>
          <Ionicons name="business-outline" size={11} color={COLORS.textLight} />
          <Text style={styles.metaText}>{item.brandName || 'Brand'}</Text>
        </View>
        <View style={styles.cardBottom}>
          <Text style={styles.cardBudget}>₹{item.budget?.toLocaleString()}</Text>
          <View style={styles.metaRow}>
            <Ionicons name="time-outline" size={11} color={COLORS.textLight} />
            <Text style={styles.metaText}>{deadline}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const { user } = useAuth();
  const { locationName, requestLocation } = useLocation();
  const isInfluencer = user?.role === 'Influencer';

  const [promotions,   setPromotions]   = useState([]);
  const [applications, setApplications] = useState([]);
  const [counts,       setCounts]       = useState({});
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [search,       setSearch]       = useState('');

  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';

  const load = useCallback(async () => {
    try {
      const promises = [
        isInfluencer ? browsePromotions() : getMyPromotions(),
        getCounts().catch(() => ({ data: { counts: {} } })),
      ];
      if (isInfluencer) promises.push(getMyApplications().catch(() => ({ data: { applications: [] } })));
      const results = await Promise.allSettled(promises);
      if (results[0].status === 'fulfilled') setPromotions(results[0].value.data?.promotions || []);
      if (results[1].status === 'fulfilled') {
        const countsData = results[1].value.data?.counts || {};
        setCounts(countsData);
      }
      if (results[2]?.status === 'fulfilled') setApplications(results[2].value.data?.applications || []);
    } catch (e) {
      console.log('Home load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isInfluencer]);

  useEffect(() => { load(); requestLocation(); }, [load]);

  // Refresh counts when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Silently refresh counts when returning to home screen
      getCounts().then(res => {
        if (res.data?.counts) {
          setCounts(res.data.counts);
        }
      }).catch(() => {});
    });
    return unsubscribe;
  }, [navigation]);

  const filtered = search.trim()
    ? promotions.filter(p => p.title?.toLowerCase().includes(search.toLowerCase()))
    : promotions;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />
        }
      >
        {/* ── HERO ── */}
        <LinearGradient
          colors={['#0A2010', '#0D3015', '#0A1628']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          {/* Top row */}
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroGreeting}>{getGreeting()}</Text>
              <Text style={styles.heroName}>{firstName} 👋</Text>
              {locationName && (
                <View style={styles.locRow}>
                  <Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.65)" />
                  <Text style={styles.locText}>{locationName}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('Notifications')}
              style={styles.notifBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={20} color="#fff" />
              {counts.notifications > 0 && (
                <View style={styles.notifDot}>
                  <Text style={styles.notifDotText}>
                    {counts.notifications > 9 ? '9+' : counts.notifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Sticks pill — influencer only */}
          {isInfluencer && (
            <TouchableOpacity
              style={styles.sticksPill}
              onPress={() => navigation.navigate('Wallet')}
              activeOpacity={0.8}
            >
              <Ionicons name="flash" size={13} color={COLORS.primary} />
              <Text style={styles.sticksPillText}>
                {counts.sticks ?? 0} Sticks Remaining
              </Text>
              <Ionicons name="chevron-forward" size={12} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          )}

          {/* Search */}
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={15} color={COLORS.textLight} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search campaigns..."
              placeholderTextColor={COLORS.placeholder}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={15} color={COLORS.textLight} />
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>

        {/* ── STATS ── */}
        <View style={styles.statsRow}>
          {isInfluencer ? (
            <>
              <StatCard icon="send-outline"   label="Applied"  value={counts.applications || applications.length} accent={COLORS.primary}  onPress={() => navigation.navigate('MyApplications')} />
              <StatCard icon="cash-outline"   label="Earnings" value={`₹${counts.earnings || 0}`}                accent="#1A4FBF"          onPress={() => navigation.navigate('Wallet')} />
              <StatCard icon="flash"   label="Sticks Left"  value={counts.sticks || 0}                        accent="#D97706"          onPress={() => navigation.navigate('Wallet')} />
            </>
          ) : (
            <>
              <StatCard icon="briefcase-outline" label="Campaigns" value={counts.promotions || promotions.length} accent={COLORS.primary} onPress={() => navigation.navigate('Promotions')} />
              <StatCard icon="send-outline"      label="Proposals" value={counts.proposals || 0}                  accent="#1A4FBF"         onPress={() => navigation.navigate('Proposals')} />
              <StatCard icon="people-outline"    label="Collabs"   value={counts.collaborations || 0}             accent="#7C3AED" />
            </>
          )}
        </View>

        {/* ── QUICK ACTIONS ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.qaRow}>
            {isInfluencer ? (
              <>
                <QuickAction icon="search-outline"      label="Browse"       accent={COLORS.primary} bg={COLORS.primaryLight} onPress={() => navigation.navigate('Promotions')} />
                <QuickAction icon="send-outline"        label="Applications" accent="#1A4FBF"         bg="#E8EEFB"             onPress={() => navigation.navigate('MyApplications')} />
                <QuickAction icon="chatbubbles-outline" label="Messages"     accent="#7C3AED"         bg="#F0E8FF"             onPress={() => navigation.navigate('Messages')} />
                <QuickAction icon="wallet-outline"      label="Wallet"       accent="#D97706"         bg="#FEF3C7"             onPress={() => navigation.navigate('Wallet')} />
              </>
            ) : (
              <>
                <QuickAction icon="megaphone-outline"      label="Post"         accent={COLORS.primary} bg={COLORS.primaryLight} onPress={() => navigation.navigate('CreatePromotion')} />
                <QuickAction icon="people-outline"         label="Influencers"  accent="#1A4FBF"         bg="#E8EEFB"             onPress={() => navigation.navigate('Promotions')} />
                <QuickAction icon="document-text-outline"  label="Proposals"    accent="#7C3AED"         bg="#F0E8FF"             onPress={() => navigation.navigate('Proposals')} />
                <QuickAction icon="wallet-outline"         label="Wallet"       accent="#D97706"         bg="#FEF3C7"             onPress={() => navigation.navigate('Wallet')} />
              </>
            )}
          </View>
        </View>

        {/* ── CAMPAIGNS ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {isInfluencer ? 'Featured Campaigns' : 'My Active Campaigns'}
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Promotions')} activeOpacity={0.7}>
              <Text style={styles.seeAll}>View all</Text>
            </TouchableOpacity>
          </View>

          {filtered.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.emptyIcon}>
                <Ionicons name="search-outline" size={26} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>
                {isInfluencer ? 'No campaigns yet' : 'No campaigns posted'}
              </Text>
              <Text style={styles.emptySub}>
                {isInfluencer ? 'Check back soon for new opportunities' : 'Post your first campaign to get started'}
              </Text>
              {!isInfluencer && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('CreatePromotion')}>
                  <Ionicons name="add" size={14} color="#fff" />
                  <Text style={styles.emptyBtnText}>Post Campaign</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16 }}>
              {filtered.slice(0, 8).map(item => (
                <CampaignCard
                  key={item._id}
                  item={item}
                  onPress={() => navigation.navigate('PromotionDetail', { id: item._id })}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── RECENT ACTIVITY ── */}
        {isInfluencer && applications.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyApplications')} activeOpacity={0.7}>
                <Text style={styles.seeAll}>See all</Text>
              </TouchableOpacity>
            </View>
            {applications.slice(0, 3).map(item => {
              const cfg = STATUS_CFG[item.status?.toLowerCase()] || {};
              return (
                <TouchableOpacity
                  key={item._id}
                  style={styles.actCard}
                  onPress={() => navigation.navigate('MyApplications')}
                  activeOpacity={0.85}
                >
                  <View style={[styles.actDot, { backgroundColor: cfg.text || COLORS.textLight }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.actTitle} numberOfLines={1}>
                      {item.promotion?.title || item.campaignId?.title || 'Campaign'}
                    </Text>
                    <Text style={styles.actDate}>
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
                    </Text>
                  </View>
                  <StatusBadge status={item.status} />
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={{ height: 36 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  // Hero
  hero: { paddingTop: 56, paddingHorizontal: 20, paddingBottom: 28 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  heroGreeting: { fontSize: SIZES.sm + 1, color: 'rgba(255,255,255,0.65)', marginBottom: 2, fontWeight: '500' },
  heroName:     { fontSize: SIZES.xxxl, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  locRow:       { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  locText:      { fontSize: SIZES.xs + 1, color: 'rgba(255,255,255,0.6)' },

  notifBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  notifDot: {
    position: 'absolute', top: 6, right: 6,
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#FF4444',
    borderWidth: 1.5, borderColor: COLORS.heroTop,
  },
  notifDotText: { display: 'none' },

  sticksPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: 14,
  },
  sticksPillText: { fontSize: SIZES.sm + 1, fontWeight: '700', color: COLORS.primaryDark },

  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 14, height: 46,
    elevation: 0,
  },
  searchInput: { flex: 1, fontSize: SIZES.base, color: COLORS.text },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4, gap: 10,
  },
  statCard: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg, padding: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  statIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: SIZES.lg, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: SIZES.xs, color: COLORS.textSecondary, marginTop: 2, textAlign: 'center', fontWeight: '500' },

  // Sections
  section:       { paddingHorizontal: 16, marginTop: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle:  { fontSize: SIZES.base, fontWeight: '800', color: COLORS.text, letterSpacing: -0.2 },
  seeAll:        { fontSize: SIZES.sm + 1, color: COLORS.primary, fontWeight: '700' },

  // Quick Actions
  qaRow: { flexDirection: 'row', gap: 10 },
  qa: {
    flex: 1, backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg, paddingVertical: 14, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  qaIcon:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  qaLabel: { fontSize: SIZES.xs, color: COLORS.text, fontWeight: '700', textAlign: 'center' },

  // Campaign Cards
  card: {
    width: 220, backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusLg, padding: 14, marginRight: 12,
    borderWidth: 1, borderColor: COLORS.borderLight,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
  cardTop:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catBadge:   { backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radiusFull, paddingHorizontal: 8, paddingVertical: 3 },
  catText:    { fontSize: SIZES.xs, color: COLORS.primaryDark, fontWeight: '700' },
  cardTitle:  { fontSize: SIZES.md, fontWeight: '700', color: COLORS.text, marginBottom: 10, lineHeight: 19 },
  cardMeta:   { gap: 6 },
  metaRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:   { fontSize: SIZES.xs + 1, color: COLORS.textSecondary },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardBudget: { fontSize: SIZES.md, fontWeight: '800', color: COLORS.primary },

  // Activity
  actCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.card, borderRadius: SIZES.radius, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.borderLight,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  actDot:   { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  actTitle: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.text },
  actDate:  { fontSize: SIZES.xs + 1, color: COLORS.textLight, marginTop: 2 },

  // Empty
  emptyCard: {
    backgroundColor: COLORS.card, borderRadius: SIZES.radiusLg, padding: 32, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  emptyIcon:    { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  emptyTitle:   { fontSize: SIZES.base, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  emptySub:     { fontSize: SIZES.xs + 1, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 18, marginBottom: 16 },
  emptyBtn:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 18, paddingVertical: 10 },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: SIZES.md },
});

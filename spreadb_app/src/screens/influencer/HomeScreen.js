import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, RefreshControl, StatusBar, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { promotionAPI, profileAPI, notificationAPI, BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';

const HomeScreen = ({ navigation }) => {
  const { user, role } = useAuth();
  const [profile, setProfile] = useState(null);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, promoRes, countRes] = await Promise.allSettled([
        profileAPI.getInfluencer(),
        promotionAPI.browse({ limit: 10 }),
        notificationAPI.getCounts(),
      ]);
      if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data);
      if (promoRes.status === 'fulfilled') {
        setPromotions(promoRes.value.data?.promotions || promoRes.value.data || []);
      }
      if (countRes.status === 'fulfilled') {
        setUnreadCount(countRes.value.data?.unreadNotifications || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/${path}`;
  };

  const renderPromoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.promoCard}
      onPress={() => navigation.navigate('PromotionDetail', { id: item._id })}
      activeOpacity={0.85}
    >
      <View style={styles.promoHeader}>
        <View style={styles.brandAvatar}>
          <Ionicons name="business-outline" size={20} color={COLORS.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.promoTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.promoBudget}>
            ₹{item.budget?.toLocaleString()} · {item.budgetType}
          </Text>
        </View>
        <View style={[styles.statusBadge, item.applicationStatus === 'open' ? styles.badgeOpen : styles.badgeClosed]}>
          <Text style={[styles.statusText, item.applicationStatus === 'open' ? styles.statusOpen : styles.statusClosed]}>
            {item.applicationStatus}
          </Text>
        </View>
      </View>

      {item.description && (
        <Text style={styles.promoDesc} numberOfLines={2}>{item.description}</Text>
      )}

      <View style={styles.promoMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="location-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.locations?.[0] || 'Remote'}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.duration}</Text>
        </View>
        <View style={styles.metaItem}>
          <Ionicons name="people-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.metaText}>{item.openings} openings</Text>
        </View>
      </View>

      <View style={styles.promoFooter}>
        <View style={styles.categoryRow}>
          {item.categories?.slice(0, 2).map((cat, i) => (
            <View key={i} style={styles.catChip}>
              <Text style={styles.catChipText}>{cat}</Text>
            </View>
          ))}
        </View>
        <View style={styles.sticksRequired}>
          <Ionicons name="star" size={12} color={COLORS.warning} />
          <Text style={styles.sticksText}>{item.requiredSticks} sticks</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const sticks = profile?.sticks?.total || 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>
            Hello, {profile?.firstName || user?.email?.split('@')[0] || 'there'} 👋
          </Text>
          <Text style={styles.subGreeting}>Find your next campaign</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => navigation.navigate('Notifications')}
          >
            <Ionicons name="notifications-outline" size={24} color={COLORS.text} />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            {profile?.profilePhoto ? (
              <Image
                source={{ uri: getPhotoUrl(profile.profilePhoto) }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={20} color={COLORS.gray400} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* Sticks balance card */}
        <View style={styles.sticksCard}>
          <View>
            <Text style={styles.sticksLabel}>Your Sticks Balance</Text>
            <Text style={styles.sticksValue}>{sticks}</Text>
          </View>
          <TouchableOpacity
            style={styles.buyBtn}
            onPress={() => navigation.navigate('BuySticks')}
          >
            <Ionicons name="add-circle-outline" size={16} color={COLORS.white} />
            <Text style={styles.buyBtnText}>Buy Sticks</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickActions}>
          {[
            { icon: 'search-outline', label: 'Browse', screen: 'Browse' },
            { icon: 'document-text-outline', label: 'My Apps', screen: 'MyApplications' },
            { icon: 'chatbubble-outline', label: 'Messages', screen: 'Messages' },
            { icon: 'wallet-outline', label: 'Wallet', screen: 'Wallet' },
          ].map((action) => (
            <TouchableOpacity
              key={action.label}
              style={styles.quickAction}
              onPress={() => navigation.navigate(action.screen)}
            >
              <View style={styles.quickActionIcon}>
                <Ionicons name={action.icon} size={22} color={COLORS.primary} />
              </View>
              <Text style={styles.quickActionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Promotions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Campaigns</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Browse')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading campaigns...</Text>
            </View>
          ) : promotions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="megaphone-outline" size={48} color={COLORS.gray300} />
              <Text style={styles.emptyText}>No campaigns available yet</Text>
            </View>
          ) : (
            <FlatList
              data={promotions}
              renderItem={renderPromoCard}
              keyExtractor={(item) => item._id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={{ height: SPACING.md }} />}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  greeting: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  subGreeting: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  notifBtn: { position: 'relative' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { fontSize: 9, color: COLORS.white, fontWeight: '700' },
  avatar: { width: 36, height: 36, borderRadius: 18 },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sticksCard: {
    margin: SPACING.xl,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.md,
  },
  sticksLabel: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.8)', marginBottom: 4 },
  sticksValue: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: COLORS.white },
  buyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    gap: 6,
  },
  buyBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.white, fontWeight: '600' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  quickAction: { flex: 1, alignItems: 'center', gap: 6 },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  quickActionLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, fontWeight: '500' },
  section: { paddingHorizontal: SPACING.xl, paddingBottom: SPACING.xxxl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text },
  seeAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  promoCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.sm,
  },
  promoHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md, marginBottom: SPACING.md },
  brandAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.text },
  promoBudget: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
  },
  badgeOpen: { backgroundColor: '#dcfce7' },
  badgeClosed: { backgroundColor: COLORS.gray100 },
  statusText: { fontSize: FONTS.sizes.xs, fontWeight: '600', textTransform: 'capitalize' },
  statusOpen: { color: COLORS.primary },
  statusClosed: { color: COLORS.textSecondary },
  promoDesc: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  promoMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  promoFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  categoryRow: { flexDirection: 'row', gap: SPACING.sm },
  catChip: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  catChipText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  sticksRequired: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sticksText: { fontSize: FONTS.sizes.xs, color: COLORS.warning, fontWeight: '600' },
  loadingContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl },
  loadingText: { color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: SPACING.xxxl, gap: SPACING.md },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

export default HomeScreen;

import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { getAgreements } from '../../api/applications';
import { useAuth } from '../../context/AuthContext';

const STATUS_CONFIG = {
  signed: { bg: COLORS.primaryLight, text: COLORS.primary, icon: 'checkmark-circle-outline', label: 'Signed' },
  pending: { bg: '#FFF8E1', text: '#F9A825', icon: 'time-outline', label: 'Pending Signature' },
  active: { bg: COLORS.primaryLight, text: COLORS.primary, icon: 'checkmark-circle-outline', label: 'Active' },
  expired: { bg: '#F5F5F5', text: COLORS.textSecondary, icon: 'close-circle-outline', label: 'Expired' },
  cancelled: { bg: '#FDECEA', text: COLORS.error, icon: 'close-circle-outline', label: 'Cancelled' },
};

function getStatusConfig(status) {
  return (
    STATUS_CONFIG[status?.toLowerCase()] || {
      bg: COLORS.background,
      text: COLORS.textSecondary,
      icon: 'document-outline',
      label: status || 'Unknown',
    }
  );
}

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function AgreementCard({ item, role, navigation }) {
  const cfg = getStatusConfig(item.status);
  const createdDate = formatDate(item.createdAt);
  const otherParty = item.brandName || item.influencerName || '';

  return (
    <View style={styles.card}>
      {/* Top row */}
      <View style={styles.cardTop}>
        <View style={styles.docIconWrap}>
          <Ionicons name="document-text" size={22} color={COLORS.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.campaignTitle || item.promotion?.title || 'Agreement'}
          </Text>
          {otherParty ? (
            <Text style={styles.otherParty}>
              {role === 'influencer' ? 'Brand' : 'Influencer'}: {otherParty}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Status + date row */}
      <View style={styles.cardFooter}>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.text} />
          <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
        {createdDate ? (
          <Text style={styles.dateText}>{createdDate}</Text>
        ) : null}
      </View>

      {/* View button */}
      <TouchableOpacity 
        style={styles.viewBtn} 
        activeOpacity={0.75}
        onPress={() => {
          // Navigate to agreement detail with default template
          navigation.navigate('AgreementDetail', { 
            agreement: item,
            role: role 
          });
        }}
      >
        <Text style={styles.viewBtnText}>View Agreement</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function AgreementsScreen({ navigation, route }) {
  const { user } = useAuth();
  // role can come from route params (deep link) or from the logged-in user
  const role = route?.params?.role || (user?.role === 'Influencer' ? 'influencer' : 'brand');
  const [agreements, setAgreements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getAgreements();
      setAgreements(res.data?.agreements || []);
    } catch (e) {
      console.log('Agreements load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>Agreements</Text>
          {!loading && (
            <Text style={styles.headerSubtitle}>{agreements.length} agreements</Text>
          )}
        </View>
        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <AgreementCard item={item} role={role} navigation={navigation} />}
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
                <Ionicons name="document-text-outline" size={36} color={COLORS.textSecondary} />
              </View>
              <Text style={styles.emptyTitle}>No agreements yet</Text>
              <Text style={styles.emptySubtitle}>
                Agreements will appear here once your applications are accepted
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 52,
    paddingBottom: 14,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '700', color: COLORS.text },
  headerSubtitle: { fontSize: SIZES.sm, color: COLORS.textSecondary, marginTop: 1 },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  docIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  cardInfo: { flex: 1 },
  cardTitle: {
    fontSize: SIZES.base + 1,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
    marginBottom: 3,
  },
  otherParty: { fontSize: SIZES.xs + 1, color: COLORS.textSecondary },

  // Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  statusBadgeText: { fontSize: SIZES.xs, fontWeight: '600' },
  dateText: { fontSize: SIZES.xs, color: COLORS.textSecondary },

  // View button
  viewBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radius + 2,
    paddingVertical: 9,
    alignItems: 'center',
  },
  viewBtnText: { fontSize: SIZES.md, fontWeight: '600', color: COLORS.text },

  // Empty state
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.borderLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.text },
  emptySubtitle: {
    fontSize: SIZES.md, color: COLORS.textSecondary,
    marginTop: 6, textAlign: 'center', lineHeight: 20,
  },
});

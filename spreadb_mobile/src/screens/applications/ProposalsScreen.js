import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Modal, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { getProposals } from '../../api/promotions';
import { reviewApplication } from '../../api/applications';

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:  { bg: '#FFF8E1', text: '#F9A825' },
  accepted: { bg: COLORS.primaryLight, text: COLORS.primary },
  rejected: { bg: '#FDECEA', text: COLORS.error },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

function InitialsAvatar({ name, size = 40 }) {
  const initials = name
    ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

// ─── Campaign dropdown ────────────────────────────────────────────────────────
function CampaignDropdown({ campaigns, selected, onSelect }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrap}>
      <TouchableOpacity
        style={styles.dropdownBtn}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{selected}</Text>
        <Ionicons name="chevron-down" size={16} color={COLORS.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.dropdownOverlay} onPress={() => setOpen(false)} activeOpacity={1}>
          <View style={styles.dropdownMenu}>
            <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
              {campaigns.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.dropdownItem, selected === c && styles.dropdownItemActive]}
                  onPress={() => { onSelect(c); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, selected === c && styles.dropdownItemTextActive]}>
                    {c}
                  </Text>
                  {selected === c && (
                    <Ionicons name="checkmark" size={16} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProposalsScreen({ navigation }) {
  const [proposals, setProposals]       = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState('All Campaigns');
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    try {
      console.log('=== Loading Proposals ===');
      const res = await getProposals();
      console.log('Proposals response:', JSON.stringify(res.data, null, 2));
      const proposalsData = res.data?.proposals || res.data?.applications || [];
      console.log('Extracted proposals:', proposalsData.length);
      if (proposalsData.length > 0) {
        console.log('First proposal sample:', JSON.stringify(proposalsData[0], null, 2));
      }
      setProposals(proposalsData);
    } catch (e) {
      console.log('Proposals load error:', e);
      console.log('Error response:', e.response?.data);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build unique campaign list from live data
  const campaignOptions = [
    'All Campaigns',
    ...Array.from(
      new Set(proposals.map(p => p.promotion?.title).filter(Boolean))
    ),
  ];

  const filtered = selectedCampaign === 'All Campaigns'
    ? proposals
    : proposals.filter(p => p.promotion?.title === selectedCampaign);

  const handleReview = (applicationId, status, influencerName) => {
    const action = status === 'accepted' ? 'Accept' : 'Reject';
    Alert.alert(
      `${action} Application`,
      status === 'accepted'
        ? `Accept ${influencerName}'s application?`
        : `Reject ${influencerName}'s application?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: action,
          style: status === 'rejected' ? 'destructive' : 'default',
          onPress: async () => {
            setActionLoading(prev => ({ ...prev, [applicationId]: status }));
            try {
              await reviewApplication({ applicationId, status });
              setProposals(prev =>
                prev.map(p => p._id === applicationId ? { ...p, status } : p)
              );
            } catch (e) {
              Alert.alert('Error', e.response?.data?.message || 'Action failed. Please try again.');
            } finally {
              setActionLoading(prev => ({ ...prev, [applicationId]: null }));
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }) => {
    console.log('Rendering item:', {
      id: item._id,
      hasInfluencer: !!item.influencer,
      influencerFirstName: item.influencer?.firstName,
      influencerLastName: item.influencer?.lastName,
      influencerName: item.influencer?.name,
      userName: item.userName
    });
    
    const influencerName = item.influencer?.firstName
      ? `${item.influencer.firstName} ${item.influencer.lastName || ''}`.trim()
      : item.influencer?.name || item.userName || 'Influencer';
    
    console.log('Calculated influencerName:', influencerName);
    
    const username = item.influencer?.username
      ? `@${item.influencer.username}`
      : item.influencer?.email || null;
    const appliedDate = item.appliedAt
      ? new Date(item.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
      : null;
    const followers = item.influencer?.followersCount
      ? item.influencer.followersCount >= 1000
        ? `${(item.influencer.followersCount / 1000).toFixed(0)}K`
        : `${item.influencer.followersCount}`
      : null;
    const isPending      = item.status?.toLowerCase() === 'pending';
    const isLoadingAccept = actionLoading[item._id] === 'accepted';
    const isLoadingReject = actionLoading[item._id] === 'rejected';

    return (
      <View style={styles.card}>
        {/* Top row: avatar + name + status */}
        <View style={styles.cardHeader}>
          <InitialsAvatar name={influencerName} />
          <View style={styles.cardHeaderInfo}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.influencerName}>{influencerName}</Text>
              {item.boostSticks > 0 && (
                <View style={styles.boostPill}>
                  <Text style={styles.boostPillText}>🪄 Boosted ({item.boostSticks})</Text>
                </View>
              )}
            </View>
            {username && <Text style={styles.influencerUsername}>{username}</Text>}
          </View>
          <StatusBadge status={item.status} />
        </View>

        {/* Campaign */}
        {item.promotion?.title && (
          <View style={styles.metaRow}>
            <Ionicons name="megaphone-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>{item.promotion.title}</Text>
          </View>
        )}

        {/* Date + followers */}
        <View style={styles.infoRow}>
          {appliedDate && (
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
              <Text style={styles.metaText}>{appliedDate}</Text>
            </View>
          )}
          {followers && (
            <Text style={styles.followersText}>{followers} followers</Text>
          )}
        </View>

        {/* Actions */}
        {isPending ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.rejectBtn, isLoadingReject && styles.btnLoading]}
              onPress={() => handleReview(item._id, 'rejected', influencerName)}
              disabled={!!actionLoading[item._id]}
              activeOpacity={0.8}
            >
              {isLoadingReject ? (
                <ActivityIndicator size="small" color={COLORS.error} />
              ) : (
                <>
                  <Ionicons name="close" size={16} color={COLORS.error} />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, isLoadingAccept && styles.btnLoading]}
              onPress={() => handleReview(item._id, 'accepted', influencerName)}
              disabled={!!actionLoading[item._id]}
              activeOpacity={0.8}
            >
              {isLoadingAccept ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons name="checkmark" size={16} color={COLORS.white} />
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.viewDetailsBtn}
            onPress={() => {
              const promoId = item.promotion?._id || item.promotion;
              if (promoId) navigation.navigate('PromotionDetail', { id: promoId });
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.viewDetailsBtnText}>View Campaign & Work</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Proposals</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Sub-header: count + campaign filter */}
      <View style={styles.subHeader}>
        <Text style={styles.subHeaderCount}>{proposals.length} total proposals</Text>
        <CampaignDropdown
          campaigns={campaignOptions}
          selected={selectedCampaign}
          onSelect={setSelectedCampaign}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
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
                <Ionicons name="time-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No proposals yet</Text>
              <Text style={styles.emptySubtitle}>
                {selectedCampaign === 'All Campaigns'
                  ? 'Proposals from influencers will appear here'
                  : `No proposals for "${selectedCampaign}"`}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle:  { fontSize: 18, fontWeight: '700', color: COLORS.text },

  // Sub-header
  subHeader: {
    backgroundColor: COLORS.white, paddingHorizontal: 16,
    paddingTop: 12, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  subHeaderCount: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 10 },

  // Dropdown
  dropdownWrap: { position: 'relative' },
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 44, paddingHorizontal: 14, backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLg, borderWidth: 1, borderColor: COLORS.border,
  },
  dropdownBtnText: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text, marginRight: 8 },
  dropdownOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center', paddingHorizontal: 24,
  },
  dropdownMenu: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    borderWidth: 1, borderColor: COLORS.border,
    maxHeight: 280, overflow: 'hidden',
    elevation: 8, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  dropdownItemActive:    { backgroundColor: COLORS.primaryLight },
  dropdownItemText:      { fontSize: 14, color: COLORS.text },
  dropdownItemTextActive: { fontWeight: '600', color: COLORS.primary },

  // List
  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  // Card
  card: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardHeader:     { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar:         { backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center' },
  avatarText:     { fontWeight: '700', color: COLORS.primary },
  cardHeaderInfo: { flex: 1 },
  influencerName:     { fontSize: 15, fontWeight: '700', color: COLORS.text },
  influencerUsername: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  statusBadge:     { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  metaText: { flex: 1, fontSize: 13, color: COLORS.textSecondary },

  infoRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 4,
  },
  followersText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  // Action buttons
  actionRow: {
    flexDirection: 'row', gap: 10,
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.error, borderRadius: SIZES.radius, height: 40,
  },
  rejectBtnText: { color: COLORS.error, fontWeight: '700', fontSize: 13 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 40,
  },
  acceptBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 13 },
  btnLoading: { opacity: 0.7 },

  viewDetailsBtn: {
    marginTop: 14, paddingTop: 14,
    borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    alignItems: 'center', justifyContent: 'center', height: 40,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
  },
  viewDetailsBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.text },

  // Empty state
  empty:        { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle:    { fontSize: 16, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 6, textAlign: 'center', lineHeight: 20 },
  boostPill: {
    backgroundColor: '#FEF3C7',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderWidth: 0.5,
    borderColor: '#F59E0B',
  },
  boostPillText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#D97706',
  },
});

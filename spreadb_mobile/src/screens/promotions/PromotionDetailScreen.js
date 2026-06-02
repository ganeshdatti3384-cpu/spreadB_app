import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getPromotionById, getCampaignApplicants } from '../../api/promotions';
import { applyForPromotion, getSticksBalance, startConversation } from '../../api/applications';
import { deriveSharedKey, encryptMessage } from '../../utils/e2ee';

const TABS = ['Overview', 'Requirements', 'Brand'];

const STATUS_COLORS = {
  active: { bg: COLORS.primaryLight, text: COLORS.primary },
  closed: { bg: '#FFF3E0', text: '#E65100' },
  draft:  { bg: '#F5F5F5', text: COLORS.textSecondary },
};

const APP_STATUS_COLORS = {
  pending:  { bg: '#FFF8E1', text: '#F9A825' },
  accepted: { bg: COLORS.primaryLight, text: COLORS.primary },
  rejected: { bg: '#FDECEA', text: COLORS.error },
};

function Chip({ label, color, bgColor, outline }) {
  return (
    <View style={[
      styles.chip,
      outline ? styles.chipOutline : { backgroundColor: bgColor || COLORS.primaryLight },
    ]}>
      <Text style={[styles.chipText, { color: color || COLORS.primary }]}>{label}</Text>
    </View>
  );
}

export default function PromotionDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const { user } = useAuth();
  const isInfluencer = user?.role === 'Influencer';
  const isBrand = user?.role === 'Brand Owner';

  const [promotion, setPromotion] = useState(null);
  const [applicants, setApplicants] = useState([]);
  const [sticksBalance, setSticksBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [activeTab, setActiveTab] = useState('Overview');
  const [chatLoading, setChatLoading] = useState(false);
  const [brandOwnerId, setBrandOwnerId] = useState(null);

  const load = useCallback(async () => {
    try {
      const promoRes = await getPromotionById(id);
      const promo = promoRes.data?.promotion || promoRes.data;
      setPromotion(promo);
      setBrandOwnerId(promo.brandOwnerId || promo.brandOwner);
      if (isInfluencer && promo?.applicants) {
        const myId = String(user?._id || '');
        const app = promo.applicants.find(a =>
          String(a.userId || a.user || '') === myId
        );
        if (app) { setHasApplied(true); setMyApplication(app); }
      }
    } catch (e) {
      console.log('Promotion detail load error:', e?.response?.status, e?.message);
    }

    // Secondary calls — failures are non-fatal
    if (isInfluencer) {
      try {
        const sticksRes = await getSticksBalance();
        // Backend returns { availableSticks, freeSticks, purchasedSticks, spentSticks }
        setSticksBalance(
          sticksRes.data?.availableSticks ??
          sticksRes.data?.balance ??
          sticksRes.data?.sticks?.total ??
          0
        );
      } catch (e) {
        console.log('Sticks balance error:', e?.response?.status);
        setSticksBalance(0);
      }
    }
    if (isBrand) {
      try {
        const appRes = await getCampaignApplicants(id);
        setApplicants(appRes.data?.applicants || []);
      } catch (e) {
        console.log('Applicants load error:', e?.response?.status);
      }
    }

    setLoading(false);
  }, [id, isInfluencer, isBrand, user]);

  useEffect(() => { load(); }, [load]);

  const handleApply = async () => {
    if (hasApplied) return;
    Alert.alert(
      'Apply for Campaign',
      `Apply for "${promotion?.title}"? This will use ${promotion?.requiredSticks || 0} sticks.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Apply', onPress: async () => {
            setApplying(true);
            try {
              await applyForPromotion({ campaignId: id });
              setHasApplied(true);
              Alert.alert('Success', 'Application submitted successfully!');
              load(); // Reload to get updated data
            } catch (e) {
              const msg = e.response?.data?.message || 'Failed to apply. Please try again.';
              Alert.alert('Error', msg);
            } finally {
              setApplying(false);
            }
          }
        },
      ]
    );
  };

  const handleStartChat = async () => {
    if (!brandOwnerId) {
      Alert.alert('Error', 'Brand owner information not available');
      return;
    }
    
    setChatLoading(true);
    try {
      const key = deriveSharedKey(user?._id, brandOwnerId);
      const initialText = `Hi! I'm interested in your campaign "${promotion?.title}"`;
      const encryptedText = encryptMessage(initialText, key);

      const res = await startConversation({
        receiverId: brandOwnerId,
        content: encryptedText,
        relatedPromotion: id
      });
      
      const conversationId = res.data?.conversationId || res.data?.conversation?._id;
      if (conversationId) {
        navigation.navigate('Chat', { conversationId });
      } else {
        Alert.alert('Success', 'Message sent! Check your messages.');
        navigation.navigate('Messages');
      }
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to start conversation. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!promotion) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={COLORS.border} />
        <Text style={styles.errorText}>Campaign not found</Text>
        <TouchableOpacity style={styles.goBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.goBackBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = STATUS_COLORS[promotion.status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary };
  const deadline = promotion.applicationDeadline
    ? new Date(promotion.applicationDeadline).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'Open';

  const appStatusStyle = myApplication
    ? APP_STATUS_COLORS[myApplication.status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary }
    : null;

  const canApply = isInfluencer && !hasApplied && promotion.status?.toLowerCase() === 'active';
  const sticksOk = sticksBalance !== null && sticksBalance >= (promotion.requiredSticks || 0);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{promotion.title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status & category badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
            <Text style={[styles.statusPillText, { color: statusStyle.text }]}>{promotion.status}</Text>
          </View>
          {promotion.categories?.[0] && (
            <View style={styles.categoryPill}>
              <Text style={styles.categoryPillText}>{promotion.categories[0]}</Text>
            </View>
          )}
        </View>

        {/* Title & brand */}
        <View style={styles.titleSection}>
          <Text style={styles.campaignTitle}>{promotion.title}</Text>
          {promotion.brandName && (
            <View style={styles.brandRow}>
              <Ionicons name="business-outline" size={14} color={COLORS.textSecondary} />
              <Text style={styles.brandNameText}>{promotion.brandName}</Text>
            </View>
          )}
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="wallet-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statBoxLabel}>Budget</Text>
            </View>
            <Text style={styles.statBoxValue}>₹{promotion.budget?.toLocaleString()}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statBoxLabel}>Duration</Text>
            </View>
            <Text style={styles.statBoxValue}>{promotion.duration || '—'}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="people-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statBoxLabel}>Openings</Text>
            </View>
            <Text style={styles.statBoxValue}>{promotion.openings || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <View style={styles.statIconRow}>
              <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
              <Text style={styles.statBoxLabel}>Deadline</Text>
            </View>
            <Text style={[styles.statBoxValue, { fontSize: 11 }]} numberOfLines={1}>{deadline}</Text>
          </View>
        </View>

        {/* Sticks balance (influencer) */}
        {isInfluencer && sticksBalance !== null && (
          <View style={[styles.sticksCard, { borderColor: sticksOk ? COLORS.primary : COLORS.error }]}>
            <View style={styles.sticksLeft}>
              <Ionicons name="star" size={20} color={sticksOk ? COLORS.primary : COLORS.error} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.sticksTitle}>Your Sticks Balance</Text>
                <Text style={[styles.sticksValue, { color: sticksOk ? COLORS.primary : COLORS.error }]}>
                  {sticksBalance} sticks
                </Text>
              </View>
            </View>
            <View style={[styles.sticksStatus, { backgroundColor: sticksOk ? COLORS.primaryLight : '#FDECEA' }]}>
              <Text style={[styles.sticksStatusText, { color: sticksOk ? COLORS.primary : COLORS.error }]}>
                {sticksOk ? 'Eligible' : 'Insufficient'}
              </Text>
            </View>
          </View>
        )}

        {/* Applied banner */}
        {hasApplied && (
          <View style={styles.appliedBanner}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            <Text style={styles.appliedText}>Application Submitted</Text>
            {myApplication && (
              <View style={[styles.appStatusBadge, { backgroundColor: appStatusStyle?.bg }]}>
                <Text style={[styles.appStatusText, { color: appStatusStyle?.text }]}>
                  {myApplication.status}
                </Text>
              </View>
            )}
            {!myApplication && (
              <View style={[styles.appStatusBadge, { backgroundColor: '#FFF8E1' }]}>
                <Text style={[styles.appStatusText, { color: '#F9A825' }]}>Pending</Text>
              </View>
            )}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabBar}>
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'Overview' && (
            <View>
              <Text style={styles.sectionLabel}>Description</Text>
              <Text style={styles.descText}>{promotion.description || 'No description provided.'}</Text>

              {promotion.locations?.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Locations</Text>
                  <View style={styles.chipRow}>
                    {promotion.locations.map((loc, i) => (
                      <Chip key={i} label={loc} bgColor="#EFF6FF" color="#1F57C3" />
                    ))}
                  </View>
                </>
              )}

              {promotion.categories?.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Categories</Text>
                  <View style={styles.chipRow}>
                    {promotion.categories.map((cat, i) => (
                      <Chip key={i} label={cat} />
                    ))}
                  </View>
                </>
              )}

              {promotion.skills?.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Required Skills</Text>
                  <View style={styles.chipRow}>
                    {promotion.skills.map((skill, i) => (
                      <Chip key={i} label={skill} outline />
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {activeTab === 'Requirements' && (
            <View>
              <View style={styles.reqRow}>
                <View style={styles.reqIcon}>
                  <Ionicons name="time-outline" size={18} color={COLORS.primary} />
                </View>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqLabel}>Duration</Text>
                  <Text style={styles.reqValue}>{promotion.duration || 'Not specified'}</Text>
                </View>
              </View>
              <View style={styles.reqRow}>
                <View style={styles.reqIcon}>
                  <Ionicons name="star-outline" size={18} color={COLORS.warning} />
                </View>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqLabel}>Required Sticks</Text>
                  <Text style={styles.reqValue}>{promotion.requiredSticks || 0} sticks minimum</Text>
                </View>
              </View>
              <View style={styles.reqRow}>
                <View style={styles.reqIcon}>
                  <Ionicons name="people-outline" size={18} color="#1F57C3" />
                </View>
                <View style={styles.reqInfo}>
                  <Text style={styles.reqLabel}>Openings Available</Text>
                  <Text style={styles.reqValue}>{promotion.openings || 0} spots</Text>
                </View>
              </View>
              {promotion.requirements && (
                <View style={styles.reqRow}>
                  <View style={styles.reqIcon}>
                    <Ionicons name="document-text-outline" size={18} color={COLORS.textSecondary} />
                  </View>
                  <View style={styles.reqInfo}>
                    <Text style={styles.reqLabel}>Additional Requirements</Text>
                    <Text style={styles.reqValue}>{promotion.requirements}</Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {activeTab === 'Brand' && (
            <View>
              <View style={styles.brandCard}>
                <View style={styles.brandAvatar}>
                  <Ionicons name="business-outline" size={24} color={COLORS.primary} />
                </View>
                <View style={styles.brandInfo}>
                  <Text style={styles.brandCardName}>{promotion.brandName || 'Brand'}</Text>
                  {promotion.industry && (
                    <Text style={styles.brandIndustry}>{promotion.industry}</Text>
                  )}
                </View>
              </View>

              {promotion.brandDescription && (
                <>
                  <Text style={styles.sectionLabel}>About</Text>
                  <Text style={styles.descText}>{promotion.brandDescription}</Text>
                </>
              )}

              {/* Social links */}
              <View style={styles.socialLinks}>
                {promotion.brand?.instagram && (
                  <View style={styles.socialRow}>
                    <Ionicons name="logo-instagram" size={16} color="#E1306C" />
                    <Text style={styles.socialText}>{promotion.brand.instagram}</Text>
                  </View>
                )}
                {promotion.brand?.facebook && (
                  <View style={styles.socialRow}>
                    <Ionicons name="logo-facebook" size={16} color="#1877F2" />
                    <Text style={styles.socialText}>{promotion.brand.facebook}</Text>
                  </View>
                )}
                {promotion.brand?.website && (
                  <View style={styles.socialRow}>
                    <Ionicons name="globe-outline" size={16} color={COLORS.textSecondary} />
                    <Text style={styles.socialText}>{promotion.brand.website}</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Applicants list (brand) */}
        {isBrand && applicants.length > 0 && (
          <View style={styles.applicantsSection}>
            <Text style={styles.sectionLabel}>Applicants ({applicants.length})</Text>
            {applicants.map((app, i) => {
              const fullName = app.firstName && app.lastName
                ? `${app.firstName} ${app.lastName}`.trim()
                : app.name || app.influencer?.name || 'Influencer';
              const initials = fullName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
              
              return (
                <View key={i} style={styles.applicantRow}>
                  <View style={styles.applicantAvatar}>
                    <Text style={styles.applicantAvatarText}>{initials}</Text>
                  </View>
                  <View style={styles.applicantInfo}>
                    <Text style={styles.applicantName}>{fullName}</Text>
                    <Text style={styles.applicantEmail}>{app.email || app.influencer?.email || ''}</Text>
                  </View>
                  <View style={[styles.appStatusBadge, {
                    backgroundColor: APP_STATUS_COLORS[app.status?.toLowerCase()]?.bg || COLORS.background
                  }]}>
                    <Text style={[styles.appStatusText, {
                      color: APP_STATUS_COLORS[app.status?.toLowerCase()]?.text || COLORS.textSecondary
                    }]}>{app.status}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Bottom sticky button */}
      <View style={styles.bottomBar}>
        {isInfluencer && (
          <View style={styles.bottomRow}>
            {/* Chat button - always visible for influencers */}
            <TouchableOpacity
              style={[styles.bottomBtnSecondary, chatLoading && styles.bottomBtnDisabled]}
              onPress={handleStartChat}
              disabled={chatLoading || !brandOwnerId}
              activeOpacity={0.85}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Ionicons name="chatbubble-outline" size={20} color={COLORS.primary} />
              )}
            </TouchableOpacity>

            {/* Apply button */}
            <TouchableOpacity
              style={[
                styles.bottomBtn,
                styles.bottomBtnFlex,
                hasApplied && styles.bottomBtnApplied,
                (!canApply && !hasApplied) && styles.bottomBtnDisabled,
              ]}
              onPress={handleApply}
              disabled={!canApply || applying}
              activeOpacity={0.85}
            >
              {applying ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name={hasApplied ? 'checkmark-circle-outline' : 'send-outline'}
                    size={18}
                    color={COLORS.white}
                  />
                  <Text style={styles.bottomBtnText}>
                    {hasApplied
                      ? 'Already Applied'
                      : `Apply Now (${promotion.requiredSticks || 0} Sticks)`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
        {isBrand && (
          <TouchableOpacity
            style={styles.bottomBtn}
            onPress={() => navigation.navigate('Proposals')}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={18} color={COLORS.white} />
            <Text style={styles.bottomBtnText}>Edit Campaign</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  errorText: { fontSize: 15, color: COLORS.textSecondary, marginTop: 12 },
  goBackBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingHorizontal: 20, paddingVertical: 10 },
  goBackBtnText: { color: COLORS.white, fontWeight: '700' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginHorizontal: 8,
  },

  scroll: { flex: 1 },

  badgeRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4,
  },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  categoryPill: { backgroundColor: COLORS.primaryLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  categoryPillText: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  titleSection: { paddingHorizontal: 20, paddingVertical: 12 },
  campaignTitle: { fontSize: 20, fontWeight: '700', color: COLORS.text, lineHeight: 28, marginBottom: 8 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandNameText: { fontSize: 13, color: COLORS.textSecondary },

  statsGrid: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    marginHorizontal: 16, marginBottom: 4,
    borderRadius: SIZES.radiusLg, padding: 16,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  statBoxLabel: { fontSize: 11, color: COLORS.textSecondary },
  statBoxValue: { fontSize: 14, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  sticksCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.white, marginHorizontal: 16, marginTop: 10,
    borderRadius: SIZES.radius, padding: 14, borderWidth: 1.5,
  },
  sticksLeft: { flexDirection: 'row', alignItems: 'center' },
  sticksTitle: { fontSize: 12, color: COLORS.textSecondary },
  sticksValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  sticksStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  sticksStatusText: { fontSize: 12, fontWeight: '600' },

  appliedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.primaryLight, marginHorizontal: 16, marginTop: 10,
    borderRadius: SIZES.radius, padding: 14,
  },
  appliedText: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.primary },
  appStatusBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  appStatusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white, marginTop: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },

  tabContent: { backgroundColor: COLORS.white, padding: 20, marginTop: 2 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 16,
  },
  descText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  chipOutline: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: 'transparent' },
  chipText: { fontSize: 12, fontWeight: '500' },

  reqRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  reqIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  reqInfo: { flex: 1 },
  reqLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 2 },
  reqValue: { fontSize: 14, fontWeight: '600', color: COLORS.text },

  brandCard: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  brandAvatar: {
    width: 56, height: 56, borderRadius: 12,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  brandInfo: { flex: 1 },
  brandCardName: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  brandIndustry: { fontSize: 12, color: COLORS.textSecondary },
  socialLinks: { gap: 10, marginTop: 8 },
  socialRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  socialText: { fontSize: 13, color: COLORS.textSecondary },

  applicantsSection: { backgroundColor: COLORS.white, padding: 20, marginTop: 2 },
  applicantRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
  },
  applicantAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  applicantAvatarText: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  applicantInfo: { flex: 1 },
  applicantName: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  applicantEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  bottomBar: {
    backgroundColor: COLORS.white, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border, paddingBottom: 28,
  },
  bottomRow: {
    flexDirection: 'row', gap: 10,
  },
  bottomBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 52,
  },
  bottomBtnFlex: { flex: 1 },
  bottomBtnSecondary: {
    width: 52, height: 52, borderRadius: SIZES.radius,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.primary,
  },
  bottomBtnApplied: { backgroundColor: COLORS.primaryDark },
  bottomBtnDisabled: { backgroundColor: COLORS.textLight, opacity: 0.6 },
  bottomBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});

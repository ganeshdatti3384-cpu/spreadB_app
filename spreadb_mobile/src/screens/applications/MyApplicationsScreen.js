import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { getMyApplications, startConversation } from '../../api/applications';
import { getMySubmissions } from '../../api/submissions';
import { useAuth } from '../../context/AuthContext';
import { deriveSharedKey, encryptMessage } from '../../utils/e2ee';

const TABS = ['All', 'Pending', 'Accepted', 'Rejected'];

const STATUS_CONFIG = {
  pending:  { bg: '#FFF8E1', text: '#F9A825', icon: 'time-outline' },
  accepted: { bg: COLORS.primaryLight, text: COLORS.primary, icon: 'checkmark-circle-outline' },
  rejected: { bg: '#FDECEA', text: COLORS.error, icon: 'close-circle-outline' },
  completed:{ bg: '#EEF2FF', text: '#1F57C3', icon: 'checkmark-done-outline' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || { bg: COLORS.background, text: COLORS.textSecondary, icon: 'ellipse-outline' };
  return (
    <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon} size={11} color={cfg.text} />
      <Text style={[styles.statusBadgeText, { color: cfg.text }]}>{status}</Text>
    </View>
  );
}

function ApplicationCard({ item, mySubmission, onPress, onChat, onAgreement, onSubmitWork, onViewSubmission }) {
  const appliedDate = item.appliedAt
    ? new Date(item.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.promotion?.title || 'Campaign'}</Text>
        <StatusBadge status={item.status} />
      </View>

      {item.promotion?.brandName && (
        <View style={styles.brandRow}>
          <Ionicons name="business-outline" size={13} color={COLORS.textSecondary} />
          <Text style={styles.brandName}>{item.promotion.brandName}</Text>
        </View>
      )}

      <View style={styles.cardMeta}>
        {item.promotion?.budget && (
          <View style={styles.metaItem}>
            <Ionicons name="wallet-outline" size={13} color={COLORS.primary} />
            <Text style={styles.metaBudget}>₹{item.promotion.budget?.toLocaleString()}</Text>
          </View>
        )}
        {appliedDate && (
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.textSecondary} />
            <Text style={styles.metaGray}>Applied {appliedDate}</Text>
          </View>
        )}
      </View>

      {/* Action buttons - only show for accepted applications */}
      {item.status?.toLowerCase() === 'accepted' && (
        <>
          {/* Brand Owner Details */}
          <View style={styles.brandOwnerSection}>
            <View style={styles.brandOwnerHeader}>
              <Ionicons name="person-circle-outline" size={16} color={COLORS.primary} />
              <Text style={styles.brandOwnerTitle}>Brand Owner</Text>
            </View>
            <View style={styles.brandOwnerInfo}>
              <Text style={styles.brandOwnerName}>
                {item.promotion?.brandOwnerName || item.promotion?.brandName || 'Brand Owner'}
              </Text>
              {item.promotion?.brandOwnerEmail && (
                <View style={styles.brandOwnerContact}>
                  <Ionicons name="mail-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.brandOwnerEmail}>{item.promotion.brandOwnerEmail}</Text>
                </View>
              )}
              {item.promotion?.brandOwnerPhone && (
                <View style={styles.brandOwnerContact}>
                  <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} />
                  <Text style={styles.brandOwnerEmail}>{item.promotion.brandOwnerPhone}</Text>
                </View>
              )}
            </View>
          </View>
          
          <View style={styles.cardActionsContainer}>
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onAgreement();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="document-text-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Agreement</Text>
              </TouchableOpacity>
              
              {/* Chat button */}
              <TouchableOpacity
                style={[styles.actionBtn, styles.actionBtnChat]}
                onPress={(e) => {
                  e.stopPropagation();
                  onChat(item);
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="chatbubble-outline" size={14} color={COLORS.primary} />
                <Text style={styles.actionBtnText}>Chat</Text>
              </TouchableOpacity>
            </View>

            {/* Submit Work or View/Update Submission */}
            {!mySubmission ? (
              <TouchableOpacity
                style={styles.submitWorkBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  onSubmitWork();
                }}
                activeOpacity={0.8}
              >
                <Ionicons name="cloud-upload-outline" size={16} color={COLORS.white} />
                <Text style={styles.submitWorkBtnText}>Submit Work</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  style={[styles.submitWorkBtn, { backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.primary }]}
                  onPress={(e) => {
                    e.stopPropagation();
                    onViewSubmission();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.submitWorkBtnText, { color: COLORS.primary }]}>View Submitted Work</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.submitWorkBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onSubmitWork();
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cloud-upload-outline" size={16} color={COLORS.white} />
                  <Text style={styles.submitWorkBtnText}>Update Details</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

export default function MyApplicationsScreen({ navigation }) {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  const [chatLoading, setChatLoading] = useState(null);

  const load = useCallback(async () => {
    try {
      const [appsRes, subsRes] = await Promise.all([
        getMyApplications(),
        getMySubmissions().catch(() => ({ data: { submissions: [] } }))
      ]);
      setApplications(appsRes.data?.applications || []);
      setSubmissions(subsRes.data?.submissions || []);
    } catch (e) {
      console.log('Applications load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleStartChat = async (application) => {
    console.log('=== Starting Chat ===');
    console.log('Application data:', JSON.stringify(application, null, 2));
    
    const brandOwnerId = application.promotion?.brandOwnerId?._id || 
                        application.promotion?.brandOwnerId || 
                        application.promotion?.brandOwner;
    
    // Get brand owner's actual name from promotion data
    const brandOwnerName = application.promotion?.brandOwnerName || 
                          application.promotion?.brandName || 
                          'Brand Owner';
    const campaignTitle = application.promotion?.title || 'Campaign';
    
    console.log('Extracted data:', {
      brandOwnerId,
      brandOwnerName,
      campaignTitle
    });
    
    if (!brandOwnerId) {
      console.error('Brand owner ID not found in application data');
      Alert.alert('Error', 'Brand owner information not available. Please try again later.');
      return;
    }
    
    setChatLoading(application._id);
    try {
      const promoId = application.promotion?._id || application.promotion || application.campaignId?._id || application.campaignId;
      const key = deriveSharedKey(user?._id, brandOwnerId);
      const initialText = `Hi! I'd like to discuss my application for "${campaignTitle}"`;
      const encryptedText = encryptMessage(initialText, key);

      const res = await startConversation({
        receiverId: brandOwnerId,
        content: encryptedText,
        relatedPromotion: promoId
      });
      
      console.log('Start conversation response:', res.data);
      
      const conversationId = res.data?.conversationId || res.data?.conversation?._id;
      
      if (conversationId) {
        console.log('Navigating to chat with:', {
          conversationId,
          participantName: brandOwnerName,
          campaignName: campaignTitle
        });
        
        // Navigate to chat with brand owner's name
        navigation.navigate('Chat', { 
          conversationId,
          participantName: brandOwnerName,
          campaignName: campaignTitle
        });
      } else {
        console.log('No conversation ID returned, navigating to Messages');
        Alert.alert('Success', 'Message sent! Check your messages.');
        navigation.navigate('MainApp', { screen: 'Messages' });
      }
    } catch (e) {
      console.error('Start chat error:', e);
      console.error('Error response:', e.response?.data);
      const msg = e.response?.data?.message || 'Failed to start conversation. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setChatLoading(null);
    }
  };

  useEffect(() => { load(); }, [load]);

  const filtered = activeTab === 'All'
    ? applications
    : applications.filter(a => a.status?.toLowerCase() === activeTab.toLowerCase());

  const counts = TABS.reduce((acc, tab) => {
    acc[tab] = tab === 'All'
      ? applications.length
      : applications.filter(a => a.status?.toLowerCase() === tab.toLowerCase()).length;
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <View>
          <Text style={styles.headerTitle}>My Applications</Text>
          <Text style={styles.headerSub}>{applications.length} applications</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
            {counts[tab] > 0 && (
              <View style={[styles.tabBadge, activeTab === tab && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab && styles.tabBadgeTextActive]}>
                  {counts[tab]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => {
            const promoId = item.promotion?._id || item.promotion || item.campaignId;
            const mySubmission = submissions.find(s => 
              String(s.campaignId?._id || s.campaignId) === String(promoId)
            );
            return (
              <ApplicationCard
                item={item}
                mySubmission={mySubmission}
                onPress={() => {
                  if (promoId) navigation.navigate('PromotionDetail', { id: promoId });
                }}
                onChat={handleStartChat}
                onAgreement={() => navigation.navigate('Agreements')}
                onSubmitWork={() => {
                  if (promoId) {
                    navigation.navigate('SubmitWorkScreen', {
                      campaignId: promoId,
                      applicationId: item._id,
                      title: item.promotion?.title || 'Campaign',
                      existingSubmission: mySubmission
                    });
                  }
                }}
                onViewSubmission={() => {
                  if (mySubmission) {
                    navigation.navigate('ReviewSubmissionScreen', { submission: mySubmission, readOnly: true });
                  }
                }}
              />
            );
          }}
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
                <Ionicons name="briefcase-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>
                No {activeTab !== 'All' ? activeTab.toLowerCase() + ' ' : ''}applications
              </Text>
              <Text style={styles.emptySubtitle}>
                {activeTab === 'All'
                  ? 'Start browsing campaigns to apply'
                  : `You have no ${activeTab.toLowerCase()} applications yet`}
              </Text>
              {activeTab === 'All' && (
                <TouchableOpacity
                  style={styles.emptyAction}
                  onPress={() => navigation.navigate('Promotions')}
                >
                  <Text style={styles.emptyActionText}>Browse Campaigns</Text>
                </TouchableOpacity>
              )}
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

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  headerSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },

  tabBar: {
    flexDirection: 'row', backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.primary },
  tabText: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '500' },
  tabTextActive: { color: COLORS.primary, fontWeight: '700' },
  tabBadge: {
    backgroundColor: COLORS.border, borderRadius: 10,
    minWidth: 18, height: 18, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: COLORS.primaryLight },
  tabBadgeText: { fontSize: 10, color: COLORS.textSecondary, fontWeight: '700' },
  tabBadgeTextActive: { color: COLORS.primary },

  list: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },

  card: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderLight,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.text, lineHeight: 20 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
  },
  statusBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  brandName: { fontSize: 12, color: COLORS.textSecondary },

  cardMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaBudget: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  metaGray: { fontSize: 12, color: COLORS.textSecondary },

  cardActionsContainer: {
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight, gap: 10
  },
  cardActionsRow: {
    flexDirection: 'row', gap: 8,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radius,
    paddingVertical: 10, borderWidth: 1, borderColor: COLORS.primary,
  },
  actionBtnChat: {
    flex: 1.2,
  },
  actionBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  submitWorkBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    paddingVertical: 12,
  },
  submitWorkBtnText: { fontSize: 14, color: COLORS.white, fontWeight: '700' },
  actionBtnChat: {
    flex: 1.2,
  },
  actionBtnText: { fontSize: 12, color: COLORS.primary, fontWeight: '600' },

  brandOwnerSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  brandOwnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  brandOwnerTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  brandOwnerInfo: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radius,
    padding: 10,
  },
  brandOwnerName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  brandOwnerContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
  },
  brandOwnerEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },

  agreementLink: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  agreementLinkText: { flex: 1, fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  empty: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyAction: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    paddingHorizontal: 24, paddingVertical: 12,
  },
  emptyActionText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
});

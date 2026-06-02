import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Alert, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { promotionAPI, applicationAPI } from '../../services/api';
import Button from '../../components/common/Button';

const PromotionDetailScreen = ({ navigation, route }) => {
  const { id } = route.params;
  const [promotion, setPromotion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [proposal, setProposal] = useState('');
  const [bidAmount, setBidAmount] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await promotionAPI.getById(id);
        setPromotion(res.data);
      } catch (e) {
        Alert.alert('Error', 'Failed to load campaign details');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const handleApply = async () => {
    setApplying(true);
    try {
      await applicationAPI.apply({
        campaignId: id,
        proposal,
        bidAmount: bidAmount ? Number(bidAmount) : undefined,
      });
      setShowApplyModal(false);
      Alert.alert('Applied!', 'Your application has been submitted successfully.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to apply');
    } finally {
      setApplying(false);
    }
  };

  if (loading || !promotion) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Campaign Details</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Title section */}
        <View style={styles.titleSection}>
          <View style={styles.brandRow}>
            <View style={styles.brandAvatar}>
              <Ionicons name="business-outline" size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.brandName}>Brand Campaign</Text>
              <Text style={styles.postedDate}>
                Posted {new Date(promotion.createdAt).toLocaleDateString()}
              </Text>
            </View>
          </View>
          <Text style={styles.title}>{promotion.title}</Text>

          <View style={styles.budgetRow}>
            <Text style={styles.budget}>₹{promotion.budget?.toLocaleString()}</Text>
            <Text style={styles.budgetType}> / {promotion.budgetType}</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, promotion.applicationStatus === 'open' ? styles.badgeOpen : styles.badgeClosed]}>
              <View style={[styles.dot, promotion.applicationStatus === 'open' ? styles.dotOpen : styles.dotClosed]} />
              <Text style={[styles.statusText, promotion.applicationStatus === 'open' ? styles.textOpen : styles.textClosed]}>
                {promotion.applicationStatus === 'open' ? 'Accepting Applications' : 'Closed'}
              </Text>
            </View>
          </View>
        </View>

        {/* Key details */}
        <View style={styles.detailsGrid}>
          {[
            { icon: 'time-outline', label: 'Duration', value: promotion.duration },
            { icon: 'people-outline', label: 'Openings', value: `${promotion.openings} positions` },
            { icon: 'star-outline', label: 'Sticks Required', value: `${promotion.requiredSticks} sticks` },
            { icon: 'location-outline', label: 'Location', value: promotion.locations?.[0] || 'Remote' },
          ].map((detail, i) => (
            <View key={i} style={styles.detailItem}>
              <Ionicons name={detail.icon} size={18} color={COLORS.primary} />
              <View>
                <Text style={styles.detailLabel}>{detail.label}</Text>
                <Text style={styles.detailValue}>{detail.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Description */}
        {promotion.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About this Campaign</Text>
            <Text style={styles.sectionText}>{promotion.description}</Text>
          </View>
        )}

        {/* About brand */}
        {promotion.about && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About the Brand</Text>
            <Text style={styles.sectionText}>{promotion.about}</Text>
          </View>
        )}

        {/* Categories */}
        {promotion.categories?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Categories</Text>
            <View style={styles.chipRow}>
              {promotion.categories.map((cat, i) => (
                <View key={i} style={styles.chip}>
                  <Text style={styles.chipText}>{cat}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Skills */}
        {promotion.skills?.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Required Skills</Text>
            <View style={styles.chipRow}>
              {promotion.skills.map((skill, i) => (
                <View key={i} style={[styles.chip, styles.skillChip]}>
                  <Text style={[styles.chipText, styles.skillChipText]}>{skill}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Deadlines */}
        {(promotion.applicationDeadline || promotion.startDate) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {promotion.applicationDeadline && (
              <View style={styles.timelineItem}>
                <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.timelineText}>
                  Apply by: {new Date(promotion.applicationDeadline).toLocaleDateString()}
                </Text>
              </View>
            )}
            {promotion.startDate && (
              <View style={styles.timelineItem}>
                <Ionicons name="play-circle-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.timelineText}>
                  Starts: {new Date(promotion.startDate).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Apply button */}
      {promotion.applicationStatus === 'open' && (
        <View style={styles.footer}>
          <View style={styles.footerInfo}>
            <Text style={styles.footerSticks}>
              <Ionicons name="star" size={14} color={COLORS.warning} /> {promotion.requiredSticks} sticks to apply
            </Text>
          </View>
          <Button
            title="Apply Now"
            onPress={() => setShowApplyModal(true)}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      )}

      {/* Apply Modal */}
      <Modal visible={showApplyModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply for Campaign</Text>
              <TouchableOpacity onPress={() => setShowApplyModal(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Your Proposal</Text>
            <TextInput
              style={styles.proposalInput}
              placeholder="Tell the brand why you're the perfect fit..."
              placeholderTextColor={COLORS.textLight}
              value={proposal}
              onChangeText={setProposal}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <Text style={styles.modalLabel}>Your Bid Amount (₹)</Text>
            <TextInput
              style={styles.bidInput}
              placeholder={`Suggested: ₹${promotion.budget?.toLocaleString()}`}
              placeholderTextColor={COLORS.textLight}
              value={bidAmount}
              onChangeText={setBidAmount}
              keyboardType="numeric"
            />

            <View style={styles.sticksWarning}>
              <Ionicons name="information-circle-outline" size={16} color={COLORS.warning} />
              <Text style={styles.sticksWarningText}>
                {promotion.requiredSticks} sticks will be deducted from your balance
              </Text>
            </View>

            <Button
              title="Submit Application"
              onPress={handleApply}
              loading={applying}
              size="lg"
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: COLORS.textSecondary },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text },
  scroll: { paddingBottom: 20 },
  titleSection: { padding: SPACING.xl, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md, marginBottom: SPACING.lg },
  brandAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.text },
  postedDate: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.text, lineHeight: 32, marginBottom: SPACING.md },
  budgetRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: SPACING.md },
  budget: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.primary },
  budgetType: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
  statusRow: { flexDirection: 'row' },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  badgeOpen: { backgroundColor: '#dcfce7' },
  badgeClosed: { backgroundColor: COLORS.gray100 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  dotOpen: { backgroundColor: COLORS.primary },
  dotClosed: { backgroundColor: COLORS.gray400 },
  statusText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },
  textOpen: { color: COLORS.primary },
  textClosed: { color: COLORS.textSecondary },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: SPACING.xl,
    gap: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    width: '45%',
  },
  detailLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  detailValue: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.text },
  section: {
    padding: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sectionTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  sectionText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, lineHeight: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    backgroundColor: COLORS.gray100,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
  },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  skillChip: { backgroundColor: COLORS.primaryLight },
  skillChipText: { color: COLORS.primary },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.sm },
  timelineText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.lg,
  },
  footerInfo: { flex: 0 },
  footerSticks: { fontSize: FONTS.sizes.sm, color: COLORS.warning, fontWeight: '600' },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.xl,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  modalTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  modalLabel: { fontSize: FONTS.sizes.sm, fontWeight: '500', color: COLORS.text, marginBottom: SPACING.sm },
  proposalInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    minHeight: 120,
    marginBottom: SPACING.lg,
  },
  bidInput: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    marginBottom: SPACING.lg,
  },
  sticksWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: '#fffbeb',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
  },
  sticksWarningText: { fontSize: FONTS.sizes.sm, color: COLORS.warning, flex: 1 },
});

export default PromotionDetailScreen;

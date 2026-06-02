import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { signAgreement } from '../../api/applications';

// Default Agreement Template
const getAgreementTemplate = (agreement, role) => {
  const brandName = agreement.brandName || 'Brand Name';
  const influencerName = agreement.influencerName || 'Influencer Name';
  const campaignTitle = agreement.campaignTitle || agreement.promotion?.title || 'Campaign';
  const budget = agreement.budget || agreement.promotion?.budget || 0;
  const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  return {
    title: 'Influencer Marketing Agreement',
    sections: [
      {
        title: 'PARTIES',
        content: `This Influencer Marketing Agreement ("Agreement") is entered into on ${date}, between:\n\n1. ${brandName} ("Brand")\n2. ${influencerName} ("Influencer")\n\nCollectively referred to as "Parties".`
      },
      {
        title: 'CAMPAIGN DETAILS',
        content: `Campaign Name: ${campaignTitle}\n\nThe Influencer agrees to promote the Brand's products/services through their social media platforms as per the campaign requirements.`
      },
      {
        title: 'COMPENSATION',
        content: `The Brand agrees to pay the Influencer a total compensation of ₹${budget.toLocaleString()} for the successful completion of the campaign deliverables.\n\nPayment will be processed within 7-14 business days after content approval and campaign completion.`
      },
      {
        title: 'DELIVERABLES',
        content: `The Influencer agrees to create and publish content as specified in the campaign brief, including but not limited to:\n\n• Social media posts (Instagram/Facebook/Twitter)\n• Stories and reels as required\n• Product reviews or demonstrations\n• Engagement with audience comments\n\nAll content must be submitted for Brand approval before publishing.`
      },
      {
        title: 'CONTENT RIGHTS',
        content: `The Influencer grants the Brand a non-exclusive, worldwide license to use, reproduce, and distribute the created content for marketing purposes.\n\nThe Influencer retains ownership of their original content but allows the Brand to repurpose it for promotional activities.`
      },
      {
        title: 'DISCLOSURE REQUIREMENTS',
        content: `The Influencer must clearly disclose the sponsored nature of the content in compliance with advertising guidelines and FTC regulations.\n\nAll posts must include appropriate hashtags such as #ad, #sponsored, or #partnership.`
      },
      {
        title: 'CONFIDENTIALITY',
        content: `Both parties agree to keep confidential any proprietary information shared during the campaign, including but not limited to:\n\n• Campaign strategies\n• Compensation details\n• Unreleased products or services\n• Business information`
      },
      {
        title: 'TERMINATION',
        content: `Either party may terminate this Agreement with written notice if:\n\n• The other party breaches any terms\n• Content violates platform guidelines\n• Campaign objectives cannot be met\n\nIn case of termination, compensation will be prorated based on completed deliverables.`
      },
      {
        title: 'LIMITATION OF LIABILITY',
        content: `Neither party shall be liable for indirect, incidental, or consequential damages arising from this Agreement.\n\nThe Brand is not responsible for the Influencer's platform performance or audience engagement metrics.`
      },
      {
        title: 'GOVERNING LAW',
        content: `This Agreement shall be governed by and construed in accordance with the laws of India.\n\nAny disputes arising from this Agreement shall be resolved through mutual discussion or legal arbitration.`
      },
      {
        title: 'ACCEPTANCE',
        content: `By proceeding with the campaign, both parties acknowledge that they have read, understood, and agree to be bound by the terms and conditions of this Agreement.`
      }
    ]
  };
};

export default function AgreementDetailScreen({ route, navigation }) {
  const { agreement, role } = route.params || {};
  const template = getAgreementTemplate(agreement || {}, role);
  const [signing, setSigning] = useState(false);

  const handleSign = async () => {
    Alert.alert(
      'Sign Agreement',
      'Do you agree to the terms and conditions of this agreement?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Agree',
          onPress: async () => {
            setSigning(true);
            try {
              if (agreement?._id) {
                await signAgreement(agreement._id);
              }
              Alert.alert('Success', 'Agreement signed successfully!', [
                {
                  text: 'OK',
                  onPress: () => navigation.goBack()
                }
              ]);
            } catch (error) {
              console.error('Sign agreement error:', error);
              Alert.alert('Error', error.response?.data?.message || 'Failed to sign agreement. Please try again.');
            } finally {
              setSigning(false);
            }
          }
        }
      ]
    );
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Agreement download feature will be available soon.');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#0A2010', '#0D3015', '#0A1628']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Agreement</Text>
          <TouchableOpacity
            style={styles.downloadBtn}
            onPress={handleDownload}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.docIcon}>
            <Ionicons name="document-text" size={28} color={COLORS.primary} />
          </View>
          <Text style={styles.docTitle}>{template.title}</Text>
          <Text style={styles.docSubtitle}>
            {agreement?.campaignTitle || 'Campaign Agreement'}
          </Text>
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        {template.sections.map((section, index) => (
          <View key={index} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionNumber}>
                <Text style={styles.sectionNumberText}>{index + 1}</Text>
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <Text style={styles.sectionContent}>{section.content}</Text>
          </View>
        ))}

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <Ionicons name="create-outline" size={24} color={COLORS.primary} />
            <Text style={styles.signatureLabel}>Digital Signature Required</Text>
            <Text style={styles.signatureSubtext}>
              By signing, you agree to all terms and conditions
            </Text>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.signBtn, (signing || agreement?.influencerSigned) && styles.signBtnDisabled]}
          onPress={handleSign}
          disabled={signing || agreement?.influencerSigned}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={agreement?.influencerSigned ? ['#9E9E9E', '#757575'] : ['#0A2010', '#0D3015', '#0A1628']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.signBtnGradient}
          >
            {signing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons 
                  name={agreement?.influencerSigned ? "checkmark-done-circle" : "checkmark-circle"} 
                  size={20} 
                  color="#fff" 
                />
                <Text style={styles.signBtnText}>
                  {agreement?.influencerSigned ? 'Already Signed' : 'Sign Agreement'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // Header
  header: {
    paddingTop: 52,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    alignItems: 'center',
  },
  docIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  docTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4,
  },
  docSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // Content
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Section
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  sectionNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionContent: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    paddingLeft: 44,
  },

  // Signature
  signatureSection: {
    marginTop: 12,
    marginBottom: 24,
  },
  signatureBox: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusLg,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    padding: 24,
    alignItems: 'center',
  },
  signatureLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 12,
    marginBottom: 4,
  },
  signatureSubtext: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  // Footer
  footer: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 28,
  },
  signBtn: {
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  signBtnDisabled: {
    opacity: 0.6,
  },
  signBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  signBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';

const getSteps = (role) => {
  if (role === 'Brand Owner') {
    return [
      {
        icon: 'briefcase-outline',
        title: 'Brand Information',
        desc: 'Add your brand name and description',
      },
      {
        icon: 'business-outline',
        title: 'Industry & Locations',
        desc: 'Select your industry and operating locations',
      },
      {
        icon: 'link-outline',
        title: 'Social Media Links',
        desc: 'Add your Instagram and Facebook pages',
      },
    ];
  }
  return [
    {
      icon: 'person-outline',
      title: 'Basic Information',
      desc: 'Add your name, bio, and contact details',
    },
    {
      icon: 'pricetag-outline',
      title: 'Categories & Locations',
      desc: 'Select your niche and where you operate',
    },
    {
      icon: 'link-outline',
      title: 'Social Media Links',
      desc: 'Connect your Instagram, YouTube, and more',
    },
  ];
};

export default function ProfileSetupIntroScreen({ route, navigation }) {
  const { role } = route.params || {};
  const isInfluencer = role === 'Influencer';
  const steps = getSteps(role);

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header icon */}
        <View style={styles.headerSection}>
          <View style={styles.iconCircle}>
            <Ionicons
              name={isInfluencer ? 'person-outline' : 'briefcase-outline'}
              size={40}
              color={COLORS.primary}
            />
          </View>
          <Text style={styles.title}>
            Ready for your{'\n'}next big opportunity?
          </Text>
        </View>

        {/* Steps card */}
        <View style={styles.stepsCard}>
          {steps.map((step, i) => (
            <View
              key={step.title}
              style={[styles.stepRow, i < steps.length - 1 && styles.stepBorder]}
            >
              <View style={styles.stepIconWrap}>
                <Ionicons name={step.icon} size={20} color={COLORS.primary} />
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </View>
          ))}
        </View>

        {/* Time note */}
        <View style={styles.noteRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textLight} />
          <Text style={styles.noteText}>Takes 5-10 minutes · You can edit anytime</Text>
        </View>
      </ScrollView>

      {/* Footer button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.btn}
          onPress={() =>
            navigation.navigate(isInfluencer ? 'CreateInfluencerProfile' : 'CreateBrandProfile')
          }
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },

  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 24,
  },

  headerSection: { alignItems: 'center', marginBottom: 40 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26, fontWeight: '700', color: COLORS.dark,
    textAlign: 'center', lineHeight: 34,
  },

  stepsCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLg,
    overflow: 'hidden',
    marginBottom: 24,
  },
  stepRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16, gap: 14,
  },
  stepBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  stepIconWrap: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4,
  },
  stepContent: { flex: 1 },
  stepTitle: { fontSize: 14, fontWeight: '700', color: COLORS.dark, marginBottom: 2 },
  stepDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },

  noteRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
  },
  noteText: { fontSize: 13, color: COLORS.textLight },

  footer: {
    paddingHorizontal: 24,
    paddingBottom: 48,
    paddingTop: 16,
    backgroundColor: COLORS.white,
  },
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius,
    height: 52,
    alignItems: 'center', justifyContent: 'center',
    elevation: 4,
    shadowColor: COLORS.primary, shadowOpacity: 0.3, shadowRadius: 8,
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

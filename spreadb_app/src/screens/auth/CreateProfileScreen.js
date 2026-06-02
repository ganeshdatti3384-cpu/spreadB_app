import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import Button from '../../components/common/Button';

const STEPS = [
  {
    icon: 'person-outline',
    text: 'Answer a few questions and start building your profile',
  },
  {
    icon: 'briefcase-outline',
    text: 'Apply for open campaigns or list services for brands to buy',
  },
  {
    icon: 'shield-checkmark-outline',
    text: 'Get paid safely and know we\'re there to help',
  },
];

const CreateProfileScreen = ({ navigation, route }) => {
  const { role } = route.params || {};
  const isInfluencer = role !== 'Brand Owner';

  const handleGetStarted = () => {
    if (isInfluencer) {
      navigation.replace('InfluencerProfileForm');
    } else {
      navigation.replace('BrandProfileForm');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person-outline" size={24} color={COLORS.gray400} />
        </View>
        <Text style={styles.headerTitle}>Create profile</Text>
        <TouchableOpacity>
          <Ionicons name="ellipsis-vertical" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.greeting}>
          Hey {isInfluencer ? 'Influencer' : 'Brand'}. Ready for your next big opportunity?
        </Text>

        <View style={styles.steps}>
          {STEPS.map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepIcon}>
                <Ionicons name={step.icon} size={22} color={COLORS.text} />
              </View>
              <Text style={styles.stepText}>{step.text}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.note}>
          It only takes 5-10 minutes and you can edit it later.{'\n'}We'll save as you go.
        </Text>
      </View>

      {/* CTA */}
      <View style={styles.footer}>
        <Button title="Get started" onPress={handleGetStarted} size="lg" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.sizes.xl,
    fontWeight: '600',
    color: COLORS.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
  },
  greeting: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 34,
    marginBottom: SPACING.xxxl,
  },
  steps: { gap: 0 },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: SPACING.xl,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.lg,
  },
  stepIcon: { marginTop: 2 },
  stepText: {
    flex: 1,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
    lineHeight: 22,
  },
  note: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: SPACING.xxxl,
  },
  footer: {
    paddingHorizontal: SPACING.xl,
  },
});

export default CreateProfileScreen;

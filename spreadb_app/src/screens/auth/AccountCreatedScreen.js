import React from 'react';
import { View, Text, StyleSheet, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING } from '../../constants/theme';
import Button from '../../components/common/Button';

const AccountCreatedScreen = ({ navigation, route }) => {
  const { role } = route.params || {};

  const handleGetStarted = () => {
    // Navigate to profile creation
    if (role === 'Brand Owner') {
      navigation.replace('CreateBrandProfile');
    } else {
      navigation.replace('CreateInfluencerProfile');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Profile card illustration */}
      <View style={styles.illustrationContainer}>
        <View style={styles.card}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person" size={36} color={COLORS.primary} />
          </View>
          <View style={styles.cardLines}>
            <View style={styles.line} />
            <View style={[styles.line, styles.lineShort]} />
          </View>
        </View>
      </View>

      <Text style={styles.heading}>
        Congratulations, your account has been created. Let's get you started!
      </Text>

      <View style={styles.footer}>
        <Button
          title="Get started"
          onPress={handleGetStarted}
          size="lg"
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: 48,
  },
  illustrationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 120,
    height: 150,
    backgroundColor: '#e8f8ee',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 12,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  cardLines: { width: '100%', gap: 8 },
  line: {
    height: 8,
    backgroundColor: 'rgba(20,164,77,0.3)',
    borderRadius: 4,
  },
  lineShort: { width: '60%', alignSelf: 'center' },
  heading: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
    lineHeight: 30,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xxxl,
  },
  footer: {},
});

export default AccountCreatedScreen;

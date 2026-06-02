import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';

const Card = ({ children, style, shadow = 'sm', padding = true }) => {
  return (
    <View style={[styles.card, SHADOWS[shadow], padding && styles.padding, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  padding: {
    padding: SPACING.lg,
  },
});

export default Card;

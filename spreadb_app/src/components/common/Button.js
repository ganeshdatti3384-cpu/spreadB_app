import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const Button = ({
  title,
  onPress,
  variant = 'primary', // 'primary' | 'outline' | 'ghost' | 'danger'
  size = 'md',         // 'sm' | 'md' | 'lg'
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = true,
}) => {
  const isDisabled = disabled || loading;

  const containerStyle = [
    styles.base,
    styles[variant],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
    style,
  ];

  const labelStyle = [
    styles.label,
    styles[`label_${variant}`],
    styles[`labelSize_${size}`],
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' ? COLORS.white : COLORS.primary}
          size="small"
        />
      ) : (
        <View style={styles.row}>
          {icon && iconPosition === 'left' && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={labelStyle}>{title}</Text>
          {icon && iconPosition === 'right' && <View style={styles.iconRight}>{icon}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconLeft: { marginRight: 8 },
  iconRight: { marginLeft: 8 },

  // Variants
  primary: {
    backgroundColor: COLORS.primary,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  danger: {
    backgroundColor: COLORS.error,
  },
  disabled: {
    opacity: 0.5,
  },

  // Sizes
  size_sm: { paddingVertical: 8, paddingHorizontal: 16, minHeight: 36 },
  size_md: { paddingVertical: 14, paddingHorizontal: 20, minHeight: 50 },
  size_lg: { paddingVertical: 18, paddingHorizontal: 24, minHeight: 58 },

  // Labels
  label: { fontWeight: '600', textAlign: 'center' },
  label_primary: { color: COLORS.white },
  label_outline: { color: COLORS.primary },
  label_ghost: { color: COLORS.primary },
  label_danger: { color: COLORS.white },

  labelSize_sm: { fontSize: FONTS.sizes.sm },
  labelSize_md: { fontSize: FONTS.sizes.md },
  labelSize_lg: { fontSize: FONTS.sizes.lg },
});

export default Button;

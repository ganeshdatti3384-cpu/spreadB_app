import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';

const Input = ({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error,
  leftIcon,
  rightIcon,
  multiline,
  numberOfLines,
  editable = true,
  style,
  inputStyle,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);

  const isPassword = secureTextEntry;

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          focused && styles.focused,
          error && styles.errorBorder,
          !editable && styles.disabled,
        ]}
      >
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          style={[
            styles.input,
            leftIcon && styles.inputWithLeft,
            (rightIcon || isPassword) && styles.inputWithRight,
            multiline && styles.multiline,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textLight}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={isPassword && !showPassword}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          multiline={multiline}
          numberOfLines={numberOfLines}
          editable={editable}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.rightIcon}
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={COLORS.gray400}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && <View style={styles.rightIcon}>{rightIcon}</View>}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: SPACING.lg },
  label: {
    fontSize: FONTS.sizes.sm,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.white,
    minHeight: 50,
  },
  focused: { borderColor: COLORS.primary },
  errorBorder: { borderColor: COLORS.error },
  disabled: { backgroundColor: COLORS.gray100 },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.sizes.md,
    color: COLORS.text,
  },
  inputWithLeft: { paddingLeft: 8 },
  inputWithRight: { paddingRight: 8 },
  multiline: { textAlignVertical: 'top', paddingTop: SPACING.md },
  leftIcon: { paddingLeft: SPACING.md },
  rightIcon: { paddingRight: SPACING.md },
  errorText: {
    fontSize: FONTS.sizes.xs,
    color: COLORS.error,
    marginTop: 4,
  },
});

export default Input;

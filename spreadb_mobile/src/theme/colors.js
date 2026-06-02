// Modern Premium Theme for Influencer App
export const COLORS = {
  // Primary Brand - Vibrant Emerald Green
  primary:      '#10B981',   // Emerald - modern & fresh
  primaryDark:  '#059669',   // Deep emerald
  primaryLight: '#D1FAE5',   // Soft mint
  primaryGlow:  'rgba(16, 185, 129, 0.15)',
  
  // Hero gradient colors (for HomeScreen)
  heroTop:      '#14A800',   // Bright green
  heroMid:      '#12A000',   // Mid green
  
  // Secondary - Purple (TikTok-inspired)
  secondary:    '#8B5CF6',   // Vibrant purple
  secondaryLight: '#EDE9FE',
  secondaryDark: '#7C3AED',
  
  // Accent - Blue (Professional)
  accent:       '#3B82F6',   // Bright blue
  accentLight:  '#DBEAFE',
  accentDark:   '#2563EB',
  
  // Neutrals - Clean & Modern
  white:        '#FFFFFF',
  black:        '#000000',
  dark:         '#111827',   // Almost black
  text:         '#1F2937',   // Dark gray
  textSecondary:'#6B7280',   // Medium gray
  textLight:    '#9CA3AF',   // Light gray
  
  // Backgrounds
  background:   '#F9FAFB',   // Off-white
  backgroundDark: '#F3F4F6', // Slightly darker
  card:         '#FFFFFF',
  cardHover:    '#FAFAFA',
  
  // Borders
  border:       '#E5E7EB',
  borderLight:  '#F3F4F6',
  
  // Status Colors
  success:      '#10B981',
  successLight: '#D1FAE5',
  error:        '#EF4444',
  errorLight:   '#FEE2E2',
  warning:      '#F59E0B',
  warningLight: '#FEF3C7',
  info:         '#3B82F6',
  infoLight:    '#DBEAFE',
  
  // Gradients (array format for LinearGradient)
  gradient1:    ['#10B981', '#059669'],      // Primary green
  gradient2:    ['#8B5CF6', '#7C3AED'],      // Purple
  gradient3:    ['#3B82F6', '#2563EB'],      // Blue
  gradientDark: ['#1F2937', '#111827'],      // Dark
  gradientSunset: ['#F59E0B', '#EF4444'],    // Orange to red
  gradientOcean: ['#06B6D4', '#3B82F6'],     // Cyan to blue
  
  // Overlays
  overlay:      'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark:  'rgba(0, 0, 0, 0.7)',
  
  // Shadows
  shadow:       'rgba(0, 0, 0, 0.1)',
  shadowMedium: 'rgba(0, 0, 0, 0.15)',
  shadowDark:   'rgba(0, 0, 0, 0.25)',
  
  // Input
  inputBg:      '#FFFFFF',
  inputBorder:  '#E5E7EB',
  inputFocus:   '#10B981',
  placeholder:  '#9CA3AF',
  
  // Tab Bar
  tabBar:       '#FFFFFF',
  tabBarBorder: '#F3F4F6',
};

export const SIZES = {
  // Font Sizes
  xs:         10,
  sm:         12,
  base:       14,
  md:         15,
  lg:         16,
  xl:         18,
  xxl:        20,
  xxxl:       24,
  huge:       32,
  
  // Spacing
  space1:     4,
  space2:     8,
  space3:     12,
  space4:     16,
  space5:     20,
  space6:     24,
  space8:     32,
  
  // Border Radius
  radiusSm:   6,
  radius:     12,
  radiusMd:   16,
  radiusLg:   20,
  radiusXl:   24,
  radiusFull: 999,
  
  // Shadows (React Native style)
  shadow: {
    sm: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 3,
    },
    lg: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
      elevation: 5,
    },
  },
};

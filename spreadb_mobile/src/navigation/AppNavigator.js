import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useAuth } from '../context/AuthContext';
import { COLORS, SIZES } from '../theme/colors';

import SplashScreen from '../screens/SplashScreen';

// Auth
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import LoginPasswordScreen from '../screens/auth/LoginPasswordScreen';
import SignupScreen from '../screens/auth/SignupScreen';
import OtpVerifyScreen from '../screens/auth/OtpVerifyScreen';
import AccountCreatedScreen from '../screens/auth/AccountCreatedScreen';
import ProfileSetupIntroScreen from '../screens/auth/ProfileSetupIntroScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Profile setup
import CreateInfluencerProfileScreen from '../screens/profile/CreateInfluencerProfileScreen';
import CreateBrandProfileScreen from '../screens/profile/CreateBrandProfileScreen';

// Main
import HomeScreen from '../screens/home/HomeScreen';
import PromotionsScreen from '../screens/promotions/PromotionsScreen';
import PromotionDetailScreen from '../screens/promotions/PromotionDetailScreen';
import CreatePromotionScreen from '../screens/promotions/CreatePromotionScreen';
import SubmitWorkScreen from '../screens/promotions/SubmitWorkScreen';
import ReviewSubmissionScreen from '../screens/promotions/ReviewSubmissionScreen';
import MessagesScreen from '../screens/messages/MessagesScreen';
import ChatScreen from '../screens/messages/ChatScreen';
import NotificationsScreen from '../screens/notifications/NotificationsScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import MyApplicationsScreen from '../screens/applications/MyApplicationsScreen';
import ProposalsScreen from '../screens/applications/ProposalsScreen';
import WalletScreen from '../screens/wallet/WalletScreen';
import BankDetailsScreen from '../screens/wallet/BankDetailsScreen';
import SticksPricingScreen from '../screens/wallet/SticksPricingScreen';
import SecureCheckoutScreen from '../screens/wallet/SecureCheckoutScreen';
import AgreementsScreen from '../screens/agreements/AgreementsScreen';
import AgreementDetailScreen from '../screens/agreements/AgreementDetailScreen';
import ChangePasswordScreen from '../screens/profile/ChangePasswordScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { user } = useAuth();
  const isInfluencer = user?.role === 'Influencer';
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            height: 52 + insets.bottom,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 6,
          }
        ],
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textLight,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ focused, color, size }) => {
          const icons = {
            Home: focused ? 'home' : 'home-outline',
            Promotions: focused ? 'megaphone' : 'megaphone-outline',
            Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
            Profile: focused ? 'person' : 'person-outline',
          };
          return <Ionicons name={icons[route.name] || 'ellipse'} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen
        name="Promotions"
        component={PromotionsScreen}
        options={{ tabBarLabel: isInfluencer ? 'Campaigns' : 'Campaigns' }}
      />
      <Tab.Screen name="Messages" component={MessagesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="LoginPassword" component={LoginPasswordScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="OtpVerify" component={OtpVerifyScreen} />
      <Stack.Screen name="AccountCreated" component={AccountCreatedScreen} />
      <Stack.Screen name="ProfileSetupIntro" component={ProfileSetupIntroScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="CreateInfluencerProfile" component={CreateInfluencerProfileScreen} />
      <Stack.Screen name="CreateBrandProfile" component={CreateBrandProfileScreen} />
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MainApp" component={MainTabs} />
      <Stack.Screen name="PromotionDetail" component={PromotionDetailScreen} />
      <Stack.Screen name="CreatePromotion" component={CreatePromotionScreen} />
      <Stack.Screen name="SubmitWorkScreen" component={SubmitWorkScreen} />
      <Stack.Screen name="ReviewSubmissionScreen" component={ReviewSubmissionScreen} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="MyApplications" component={MyApplicationsScreen} />
      <Stack.Screen name="Proposals" component={ProposalsScreen} />
      <Stack.Screen name="Wallet" component={WalletScreen} />
      <Stack.Screen name="BankDetails" component={BankDetailsScreen} />
      <Stack.Screen name="SticksPricing" component={SticksPricingScreen} />
      <Stack.Screen name="SecureCheckout" component={SecureCheckoutScreen} />
      <Stack.Screen name="Agreements" component={AgreementsScreen} />
      <Stack.Screen name="AgreementDetail" component={AgreementDetailScreen} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      <Stack.Screen name="CreateInfluencerProfile" component={CreateInfluencerProfileScreen} />
      <Stack.Screen name="CreateBrandProfile" component={CreateBrandProfileScreen} />
      <Stack.Screen name="UserProfile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { token, loading } = useAuth();
  const [splashDone, setSplashDone] = useState(false);

  // Show splash first
  if (!splashDone) {
    return <SplashScreen onFinish={() => setSplashDone(true)} />;
  }

  // Auth loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1, backgroundColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBar: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 4,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
});

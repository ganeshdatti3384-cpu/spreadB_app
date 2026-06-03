import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { getSticksPricing } from '../../api/wallet';

export default function SticksPricingScreen({ navigation }) {
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPricing() {
      try {
        const res = await getSticksPricing();
        if (res.data?.pricingPlans) {
          setPlans(res.data.pricingPlans);
        }
      } catch (err) {
        console.error('Failed to load sticks pricing:', err);
        Alert.alert('Error', 'Unable to fetch sticks pricing plans. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    loadPricing();
  }, []);

  const handleSelectPlan = (plan) => {
    // Navigate to secure checkout screen with selected plan details
    navigation.navigate('SecureCheckout', {
      amount: plan.price,
      sticksAmount: plan.sticks,
      paymentType: 'sticks_purchase',
      title: `Buy ${plan.sticks} Sticks`,
      subtitle: plan.description
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Gradient */}
        <LinearGradient
          colors={['#0A2010', '#0D3015', '#0A1628']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Sticks Pricing</Text>
            <View style={{ width: 36 }} />
          </View>
          
          <View style={styles.heroSection}>
            <Ionicons name="flash-sharp" size={40} color={COLORS.primary} />
            <Text style={styles.heroTitle}>Refill Your Sticks</Text>
            <Text style={styles.heroSubtitle}>
              Sticks allow you to apply for high-value promotions, connect with top brand owners, and increase your profile visibility.
            </Text>
          </View>
        </LinearGradient>

        {/* Plans List */}
        <View style={styles.plansSection}>
          <Text style={styles.sectionTitle}>Select a Package</Text>
          
          {plans.map((plan) => {
            const hasDiscount = plan.discount > 0;
            return (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  plan.popular && styles.popularPlanCard
                ]}
                onPress={() => handleSelectPlan(plan)}
                activeOpacity={0.9}
              >
                {plan.popular && (
                  <View style={styles.popularBadge}>
                    <Text style={styles.popularText}>MOST POPULAR</Text>
                  </View>
                )}

                <View style={styles.planCardHeader}>
                  <View style={styles.planSticksWrap}>
                    <Ionicons 
                      name="radio-button-on" 
                      size={20} 
                      color={plan.popular ? COLORS.primary : COLORS.primary} 
                    />
                    <Text style={styles.planSticksText}>{plan.sticks} Sticks</Text>
                  </View>
                  <Text style={styles.planDesc}>{plan.description}</Text>
                </View>

                <View style={styles.planCardBody}>
                  <View>
                    <Text style={styles.priceText}>₹{plan.price}</Text>
                    {hasDiscount && (
                      <Text style={styles.discountText}>Save {plan.discount}% today</Text>
                    )}
                  </View>
                  <View style={styles.buyButton}>
                    <Text style={styles.buyButtonText}>Buy</Text>
                    <Ionicons name="chevron-forward" size={16} color="#fff" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Security / Quality guarantee section */}
        <View style={styles.securityGuar}>
          <View style={styles.secIconWrap}>
            <Ionicons name="shield-checkmark-sharp" size={24} color={COLORS.primary} />
          </View>
          <View style={styles.secTextWrap}>
            <Text style={styles.secTitle}>Secure Payment Guarantee</Text>
            <Text style={styles.secDesc}>
              All transactions are cryptographically signed and encrypted to protect against interception and unauthorized changes.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  
  headerGradient: { paddingTop: 40, paddingBottom: 28, paddingHorizontal: 20 },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  
  heroSection: { alignItems: 'center', marginTop: 12, paddingHorizontal: 16 },
  heroTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 12, marginBottom: 8 },
  heroSubtitle: { 
    fontSize: 13, color: 'rgba(255,255,255,0.7)', textAlign: 'center', 
    lineHeight: 18, paddingHorizontal: 8 
  },
  
  plansSection: { paddingHorizontal: 20, paddingTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  
  planCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.radiusLg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2
  },
  popularPlanCard: {
    borderColor: COLORS.primary,
    borderWidth: 2,
    backgroundColor: '#F7FCF8'
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusFull
  },
  popularText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
  
  planCardHeader: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: COLORS.border, paddingBottom: 12, marginBottom: 12 
  },
  planSticksWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  planSticksText: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  planDesc: { fontSize: 12, color: COLORS.textSecondary },
  
  planCardBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  priceText: { fontSize: 24, fontWeight: '800', color: COLORS.text },
  discountText: { fontSize: 11, fontWeight: '600', color: COLORS.primary, marginTop: 2 },
  
  buyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: SIZES.radius
  },
  buyButtonText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  securityGuar: {
    flexDirection: 'row', gap: 14, marginHorizontal: 20,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 16, borderWidth: 1, borderColor: COLORS.border, marginTop: 10
  },
  secIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center'
  },
  secTextWrap: { flex: 1 },
  secTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  secDesc: { fontSize: 11, color: COLORS.textSecondary, marginTop: 4, lineHeight: 15 }
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { COLORS, SIZES } from '../../theme/colors';
import { createWalletOrder, verifyWalletPayment, createSticksOrder, verifySticksPayment } from '../../api/wallet';

export default function SecureCheckoutScreen({ route, navigation }) {
  const { amount, sticksAmount, paymentType, title, subtitle } = route.params;

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [paymentToken, setPaymentToken] = useState('');
  const [razorpayKey, setRazorpayKey] = useState('');
  const [showWebView, setShowWebView] = useState(false);

  // 1. Create secure order on mount
  useEffect(() => {
    async function initOrder() {
      try {
        setLoading(true);
        let res;
        if (paymentType === 'sticks_purchase') {
          res = await createSticksOrder({ sticksAmount, price: amount });
          setOrderId(res.data.orderId || res.data.order?.id);
          setPaymentToken(res.data.paymentToken);
          setRazorpayKey(res.data.keyId || 'rzp_live_RxnkyiQvKxZrb1');
        } else {
          res = await createWalletOrder({ amount });
          setOrderId(res.data.order?.id || res.data.orderId);
          setPaymentToken(res.data.paymentToken);
          setRazorpayKey(res.data.key_id || res.data.order?.key_id || 'rzp_live_RxnkyiQvKxZrb1');
        }
      } catch (err) {
        console.error('Failed to create secure payment order:', err);
        Alert.alert('Initialization Failed', err.response?.data?.message || 'Could not initiate secure transaction.');
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    }
    initOrder();
  }, [amount, sticksAmount, paymentType]);

  const handlePay = () => {
    // Launch WebView checkout directly
    setShowWebView(true);
  };

  const verifyPaymentResponse = async (payload) => {
    try {
      setProcessing(true);
      let res;
      if (paymentType === 'sticks_purchase') {
        res = await verifySticksPayment(payload);
      } else {
        res = await verifyWalletPayment(payload);
      }

      setProcessing(false);
      Alert.alert(
        'Payment Successful',
        res.data.message || 'Transaction processed successfully.',
        [
          { 
            text: 'OK', 
            onPress: () => {
              navigation.navigate('Wallet');
            } 
          }
        ]
      );
    } catch (err) {
      setProcessing(false);
      console.error('Payment verification failed:', err);
      Alert.alert(
        'Security Alert / Error', 
        err.response?.data?.message || 'Payment verification failed. Tampering detected.'
      );
    }
  };

  const handleWebViewMessage = async (event) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      setShowWebView(false);

      if (response.status === 'success') {
        const payload = {
          razorpay_order_id: response.data.razorpay_order_id,
          razorpay_payment_id: response.data.razorpay_payment_id,
          razorpay_signature: response.data.razorpay_signature,
          paymentToken
        };
        await verifyPaymentResponse(payload);
      } else if (response.status === 'cancelled') {
        Alert.alert('Payment Cancelled', 'You cancelled the transaction.');
      } else {
        Alert.alert('Payment Failed', response.data?.description || 'Transaction failed. Please try again.');
      }
    } catch (err) {
      console.error('Error handling WebView message:', err);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Establishing SSL Connection...</Text>
      </View>
    );
  }

  if (showWebView) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            height: 100vh;
            background-color: #0A1628;
            color: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 20px;
            box-sizing: border-box;
            text-align: center;
          }
          .loader {
            border: 4px solid rgba(255,255,255,0.1);
            border-left-color: #00E676;
            border-radius: 50%;
            width: 50px;
            height: 50px;
            animation: spin 1s linear infinite;
            margin-bottom: 20px;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          .subtitle {
            font-size: 14px;
            opacity: 0.7;
          }
        </style>
      </head>
      <body>
        <div class="loader"></div>
        <div class="title">Connecting to Razorpay...</div>
        <div class="subtitle">Please do not close this window or press back.</div>
        <script>
          setTimeout(function() {
            var options = {
              key: "${razorpayKey}",
              amount: ${amount * 100},
              currency: "INR",
              name: "SpreadB",
              description: "${title || 'Secure Checkout'}",
              order_id: "${orderId}",
              handler: function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'success',
                  data: response
                }));
              },
              theme: {
                color: "#00E676"
              },
              modal: {
                ondismiss: function () {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    status: 'cancelled'
                  }));
                }
              }
            };
            var rzp = new Razorpay(options);
            rzp.on('payment.failed', function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'failed',
                data: response.error
              }));
            });
            rzp.open();
          }, 500);
        </script>
      </body>
      </html>
    `;

    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0A1628' }}>
        <View style={[styles.header, { borderBottomColor: '#1E293B', paddingHorizontal: 16 }]}>
          <TouchableOpacity onPress={() => setShowWebView(false)} style={styles.backButton}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: '#fff' }]}>Secure Payment</Text>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleWebViewMessage}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          originWhitelist={['*']}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header navigation bar */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Secure Checkout</Text>
          <Ionicons name="shield-checkmark" size={24} color={COLORS.primary} />
        </View>

        {/* Transaction Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transaction Total</Text>
          <Text style={styles.summaryAmount}>₹{amount.toLocaleString('en-IN')}</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryDetailTitle}>{title}</Text>
            <Text style={styles.summaryDetailValue}>{subtitle || 'SpreadB Wallet Refill'}</Text>
          </View>
        </View>

        {/* Secure Cryptographic Token Shield */}
        <View style={styles.encryptionCard}>
          <View style={styles.shieldHeader}>
            <Ionicons name="lock-closed" size={16} color={COLORS.primary} />
            <Text style={styles.shieldTitle}>Anti-Tampering Encryption Active</Text>
          </View>
          <Text style={styles.shieldDesc}>
            Your checkout details are cryptographically encrypted. The verification server will only accept this exact payload.
          </Text>
          {paymentToken ? (
            <View style={styles.tokenBox}>
              <Text numberOfLines={1} style={styles.tokenText}>{paymentToken}</Text>
            </View>
          ) : null}
        </View>

        {/* Real Razorpay Mode Prompt */}
        <View style={styles.cardForm}>
          <Text style={[styles.formTitle, { marginBottom: 8 }]}>Secure Razorpay Checkout</Text>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
            Clicking the button below will open the official Razorpay Checkout page where you can pay using **UPI (Google Pay, PhonePe, Bhim), Cards, Wallets, or Netbanking**.
          </Text>
        </View>

        {/* PCI Compliance & Security Marks */}
        <View style={styles.pciWrapper}>
          <Ionicons name="checkmark-circle-sharp" size={16} color={COLORS.primary} />
          <Text style={styles.pciText}>SSL 256-bit encryption. Safe, secure & tamper-proof.</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[styles.payButton, processing && styles.disabledButton]}
          onPress={handlePay}
          disabled={processing}
          activeOpacity={0.8}
        >
          {processing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="lock-closed" size={16} color="#fff" />
              <Text style={styles.payButtonText}>
                Pay via Razorpay ₹{amount.toLocaleString('en-IN')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scrollContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },
  loadingText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 14, fontWeight: '600' },
  
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border,
    marginBottom: 20
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },
  
  summaryCard: {
    backgroundColor: '#0F2C18',
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16
  },
  summaryLabel: { fontSize: 12, color: 'rgba(255, 255, 255, 0.6)', textTransform: 'uppercase', letterSpacing: 0.5 },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4, marginBottom: 16 },
  summaryRow: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.15)' 
  },
  summaryDetailTitle: { fontSize: 13, color: '#fff', fontWeight: '700' },
  summaryDetailValue: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  
  encryptionCard: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 20
  },
  shieldHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  shieldTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  shieldDesc: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 16 },
  tokenBox: {
    backgroundColor: COLORS.background,
    padding: 10,
    borderRadius: SIZES.radius,
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  tokenText: { fontSize: 10, color: COLORS.textLight, fontFamily: 'monospace' },
  
  cardForm: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 20
  },
  formTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 },
  inputLabel: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6, textTransform: 'uppercase' },
  textInput: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius,
    paddingHorizontal: 12, height: 48, fontSize: 14, color: COLORS.text,
    backgroundColor: COLORS.background, marginBottom: 14
  },
  inputWithIcon: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.radius,
    height: 48, backgroundColor: COLORS.background, marginBottom: 14
  },
  inputIcon: { marginLeft: 12, marginRight: 8 },
  iconedTextInput: { flex: 1, fontSize: 14, color: COLORS.text, height: '100%' },
  rowInputs: { flexDirection: 'row', gap: 14 },
  flexHalf: { flex: 1 },
  
  pciWrapper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 24 },
  pciText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '500' },
  
  payButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusLg, height: 52
  },
  payButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  disabledButton: { opacity: 0.6 }
});

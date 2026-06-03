import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, TextInput, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getWalletBalance, getTransactions, addMoney, withdrawMoney } from '../../api/wallet';

// ─── Transaction type config ────────────────────────────────────────────────
const TX_CONFIG = {
  credit:     { icon: 'arrow-down-circle', color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
  debit:      { icon: 'arrow-up-circle',   color: COLORS.error,   sign: '-', bg: '#FEE2E2' },
  withdrawal: { icon: 'arrow-up-circle',   color: COLORS.error,   sign: '-', bg: '#FEE2E2' },
  deposit:    { icon: 'arrow-down-circle', color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
  refund:     { icon: 'refresh-circle',    color: COLORS.accent,  sign: '+', bg: COLORS.accentLight },
  payment:    { icon: 'card',              color: COLORS.error,   sign: '-', bg: '#FEE2E2' },
  earning:    { icon: 'cash',              color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
  added:      { icon: 'arrow-down-circle', color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
  held:       { icon: 'time',              color: COLORS.warning, sign: '-', bg: '#FEF3C7' },
  released:   { icon: 'arrow-up-circle',   color: COLORS.error,   sign: '-', bg: '#FEE2E2' },
  spent:      { icon: 'arrow-up-circle',   color: COLORS.error,   sign: '-', bg: '#FEE2E2' },
  purchased:  { icon: 'arrow-down-circle', color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
  earned:     { icon: 'arrow-down-circle', color: COLORS.primary, sign: '+', bg: COLORS.primaryLight },
};

function getTxConfig(type) {
  return TX_CONFIG[type?.toLowerCase()] || {
    icon: 'swap-horizontal', color: COLORS.textSecondary, sign: '', bg: COLORS.background,
  };
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

// ─── Amount Modal ────────────────────────────────────────────────────────────
function AmountModal({ visible, title, subtitle, onClose, onSubmit, loading }) {
  const [amount, setAmount] = useState('');

  const handleSubmit = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount greater than 0');
      return;
    }
    onSubmit({ amount: val });
    setAmount('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{title}</Text>
              {subtitle && <Text style={styles.modalSubtitle}>{subtitle}</Text>}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          <Text style={styles.modalLabel}>Amount</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor={COLORS.placeholder}
              keyboardType="numeric"
              autoFocus
            />
          </View>

          <View style={styles.quickAmounts}>
            {['500', '1000', '2000', '5000'].map(a => (
              <TouchableOpacity
                key={a}
                style={styles.quickAmountBtn}
                onPress={() => setAmount(a)}
                activeOpacity={0.8}
              >
                <Text style={styles.quickAmountText}>₹{a}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.modalSubmitBtn, loading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator size="small" color="#fff" />
              : <Text style={styles.modalSubmitText}>{title}</Text>
            }
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Transaction Item ────────────────────────────────────────────────────────
function TxItem({ tx, index }) {
  const cfg = getTxConfig(tx.type);
  const isCredit = cfg.sign === '+';
  return (
    <View style={styles.txItem}>
      <View style={[styles.txIconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txDesc} numberOfLines={1}>
          {tx.description || tx.note || tx.type || 'Transaction'}
        </Text>
        <Text style={styles.txDate}>{formatDate(tx.createdAt || tx.date)}</Text>
      </View>
      <Text style={[styles.txAmount, { color: isCredit ? COLORS.primary : COLORS.text }]}>
        {cfg.sign}{tx.isSticks ? '' : '₹'}{tx.amount?.toLocaleString?.() ?? tx.amount}{tx.isSticks ? ' Sticks' : ''}
      </Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function WalletScreen({ navigation }) {
  const { user } = useAuth();
  const isBrand = user?.role === 'Brand Owner';

  const [balance, setBalance]           = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [addModal, setAddModal]         = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    try {
      const [balRes, txRes] = await Promise.allSettled([getWalletBalance(), getTransactions()]);
      if (balRes.status === 'fulfilled')
        setBalance(balRes.value.data?.wallet || balRes.value.data?.balance || balRes.value.data);
      if (txRes.status === 'fulfilled')
        setTransactions(txRes.value.data?.transactions || []);
    } catch (e) {
      console.log('Wallet load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = navigation.addListener('focus', () => {
      load();
    });
    return unsubscribe;
  }, [navigation, load]);

  const handleAddMoney = ({ amount }) => {
    setAddModal(false);
    navigation.navigate('SecureCheckout', {
      amount,
      paymentType: 'wallet_recharge',
      title: 'Add Money to Wallet',
      subtitle: 'SpreadB Wallet Deposit'
    });
  };

  const handleWithdraw = async ({ amount }) => {
    setActionLoading(true);
    try {
      await withdrawMoney({ amount });
      setWithdrawModal(false);
      await load();
      Alert.alert('Success', `Withdrawal of ₹${amount.toLocaleString()} initiated`);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to withdraw');
    } finally {
      setActionLoading(false);
    }
  };

  const availableBalance = balance?.availableBalance ?? balance?.balance ?? 0;
  const totalEarned      = balance?.totalEarned      ?? balance?.earned  ?? 0;
  const withdrawn        = balance?.withdrawn        ?? balance?.totalWithdrawn ?? 0;
  const onHold           = balance?.onHold           ?? balance?.hold    ?? 0;
  // Influencer-specific
  const sticksTotal      = balance?.sticks           ?? balance?.sticksBalance ?? 0;
  const sticksFree       = balance?.sticksFree       ?? 0;
  const sticksPurchased  = balance?.sticksPurchased  ?? 0;
  const sticksSpent      = balance?.sticksSpent      ?? 0;
  const bankDetailsVerified = balance?.bankDetailsVerified ?? false;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* ── HEADER GRADIENT ── */}
        <LinearGradient
          colors={['#0A2010', '#0D3015', '#0A1628']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          {/* Back + Title */}
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Wallet</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* ── INFLUENCER LAYOUT ── */}
          {!isBrand && (
            <>
              {/* Two-column balance cards */}
              <View style={styles.balanceGrid}>
                {/* Sticks */}
                <View style={styles.balanceCard}>
                  <View style={styles.balanceCardRow}>
                    <Ionicons name="radio-button-on-outline" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.balanceCardLabel}>Sticks</Text>
                  </View>
                  <Text style={styles.balanceCardValue}>{sticksTotal}</Text>
                </View>
                {/* Earnings */}
                <View style={styles.balanceCard}>
                  <View style={styles.balanceCardRow}>
                    <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.balanceCardLabel}>Earnings</Text>
                  </View>
                  <Text style={styles.balanceCardValue}>
                    ₹{availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                  </Text>
                </View>
              </View>

              {/* Sticks Breakdown */}
              <View style={styles.sticksBreakdown}>
                <Text style={styles.sticksBreakdownTitle}>Sticks Breakdown</Text>
                <View style={styles.sticksRow}>
                  <View style={styles.sticksStat}>
                    <Text style={[styles.sticksStatValue, { color: COLORS.primary }]}>{sticksFree}</Text>
                    <Text style={styles.sticksStatLabel}>Free</Text>
                  </View>
                  <View style={styles.sticksStatDivider} />
                  <View style={styles.sticksStat}>
                    <Text style={styles.sticksStatValue}>{sticksPurchased}</Text>
                    <Text style={styles.sticksStatLabel}>Purchased</Text>
                  </View>
                  <View style={styles.sticksStatDivider} />
                  <View style={styles.sticksStat}>
                    <Text style={[styles.sticksStatValue, { color: 'rgba(255,255,255,0.5)' }]}>{sticksSpent}</Text>
                    <Text style={styles.sticksStatLabel}>Spent</Text>
                  </View>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity 
                  style={styles.actionBtnPrimary} 
                  onPress={() => navigation.navigate('SticksPricing')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={18} color="#fff" />
                  <Text style={styles.actionBtnPrimaryText}>Buy Sticks</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnOutline}
                  onPress={() => setWithdrawModal(true)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-up" size={18} color="#fff" />
                  <Text style={styles.actionBtnOutlineText}>Withdraw</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── BRAND LAYOUT ── */}
          {isBrand && (
            <>
              {/* Balance card */}
              <View style={styles.brandBalanceCard}>
                <View style={styles.balanceCardRow}>
                  <Ionicons name="cash-outline" size={14} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.balanceCardLabel}>Available Balance</Text>
                </View>
                <Text style={styles.brandBalanceAmount}>
                  ₹{availableBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </Text>
              </View>

              {/* Add Money */}
              <TouchableOpacity
                style={styles.addMoneyBtn}
                onPress={() => setAddModal(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.addMoneyBtnText}>Add Money</Text>
              </TouchableOpacity>
            </>
          )}
        </LinearGradient>

        {/* ── BANK DETAILS (influencer only) ── */}
        {!isBrand && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.bankCard}
              onPress={() => navigation.navigate('BankDetails')}
              activeOpacity={0.8}
            >
              <View style={styles.bankIconWrap}>
                <Ionicons name="card" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.bankInfo}>
                <Text style={styles.bankTitle}>Bank Details</Text>
                <Text style={styles.bankSubtitle}>Manage your withdrawal account</Text>
              </View>
              <View style={bankDetailsVerified ? styles.verifiedBadge : styles.unverifiedBadge}>
                <Text style={bankDetailsVerified ? styles.verifiedText : styles.unverifiedText}>
                  {bankDetailsVerified ? 'Verified' : 'Unverified'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          </View>
        )}

        {/* ── TRANSACTION HISTORY ── */}
        <View style={styles.section}>
          <View style={styles.txHeader}>
            <Text style={styles.txTitle}>Transaction History</Text>
            <Text style={styles.txCount}>{transactions.length} transactions</Text>
          </View>

          {transactions.length === 0 ? (
            <View style={styles.emptyTx}>
              <View style={styles.emptyTxIconWrap}>
                <Ionicons name="receipt-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTxTitle}>No transactions yet</Text>
              <Text style={styles.emptyTxSubtitle}>Your transaction history will appear here</Text>
            </View>
          ) : (
            transactions.map((tx, index) => <TxItem key={tx._id || index} tx={tx} index={index} />)
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── MODALS ── */}
      <AmountModal
        visible={addModal}
        title="Add Money"
        subtitle="Add funds to your SpreadB wallet"
        onClose={() => setAddModal(false)}
        onSubmit={handleAddMoney}
        loading={actionLoading}
      />
      <AmountModal
        visible={withdrawModal}
        title="Withdraw"
        subtitle={`Available: ₹${availableBalance?.toLocaleString()}`}
        onClose={() => setWithdrawModal(false)}
        onSubmit={handleWithdraw}
        loading={actionLoading}
      />
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: COLORS.background },
  center:     { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  // Header
  headerGradient: { paddingTop: 52, paddingBottom: 28, paddingHorizontal: 20 },
  headerTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },

  // Balance grid (influencer)
  balanceGrid:    { flexDirection: 'row', gap: 12, marginBottom: 12 },
  balanceCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: SIZES.radiusLg,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  balanceCardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  balanceCardLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)' },
  balanceCardValue: { fontSize: 24, fontWeight: '700', color: '#fff' },

  // Sticks breakdown
  sticksBreakdown: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  sticksBreakdownTitle: { fontSize: 13, fontWeight: '600', color: '#fff', marginBottom: 12 },
  sticksRow:   { flexDirection: 'row', alignItems: 'center' },
  sticksStat:  { flex: 1, alignItems: 'center' },
  sticksStatValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  sticksStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 2 },
  sticksStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Action buttons (influencer)
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionBtnPrimary: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusLg, height: 44,
  },
  actionBtnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  actionBtnOutline: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: SIZES.radiusLg, height: 44,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },
  actionBtnOutlineText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Brand balance card
  brandBalanceCard: {
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: SIZES.radiusLg,
    padding: 20, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  brandBalanceAmount: { fontSize: 32, fontWeight: '700', color: '#fff', marginTop: 4 },

  // Add money button (brand)
  addMoneyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radiusLg, height: 44,
  },
  addMoneyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  // Section wrapper
  section: { paddingHorizontal: 16, paddingTop: 16 },

  // Bank card
  bankCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 14, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: 4,
  },
  bankIconWrap: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, alignItems: 'center', justifyContent: 'center',
  },
  bankInfo:    { flex: 1 },
  bankTitle:   { fontSize: 14, fontWeight: '600', color: COLORS.text },
  bankSubtitle: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  verifiedBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  verifiedText: { fontSize: 10, fontWeight: '600', color: COLORS.primary },
  unverifiedBadge: {
    backgroundColor: '#FEE2E2', borderRadius: SIZES.radiusFull,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  unverifiedText: { fontSize: 10, fontWeight: '600', color: COLORS.error },

  // Transactions
  txHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10,
  },
  txTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  txCount: { fontSize: 12, color: COLORS.textSecondary },
  txItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 12, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  txIconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  txInfo:     { flex: 1 },
  txDesc:     { fontSize: 13, fontWeight: '600', color: COLORS.text },
  txDate:     { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  txAmount:   { fontSize: 14, fontWeight: '700' },

  // Empty state
  emptyTx: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg,
    padding: 40, alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  emptyTxIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTxTitle:    { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptyTxSubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center' },

  // Modal
  modalOverlay:  { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalSheet: {
    backgroundColor: COLORS.white, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 44,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.border, alignSelf: 'center', marginBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24,
  },
  modalTitle:    { fontSize: 20, fontWeight: '700', color: COLORS.text },
  modalSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 3 },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  modalLabel: {
    fontSize: 13, fontWeight: '600', color: COLORS.textSecondary,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: SIZES.radiusLg,
    paddingHorizontal: 16, height: 64, marginBottom: 16,
    backgroundColor: COLORS.primaryLight,
  },
  currencySymbol: { fontSize: 24, fontWeight: '700', color: COLORS.primary, marginRight: 8 },
  amountInput:    { flex: 1, fontSize: 28, fontWeight: '700', color: COLORS.primary },
  quickAmounts:   { flexDirection: 'row', gap: 8, marginBottom: 24 },
  quickAmountBtn: {
    flex: 1, paddingVertical: 10, borderRadius: SIZES.radius,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center',
  },
  quickAmountText:  { fontSize: 13, fontWeight: '600', color: COLORS.text },
  modalSubmitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  btnDisabled:      { opacity: 0.6 },
  modalSubmitText:  { color: '#fff', fontWeight: '700', fontSize: 16 },
});

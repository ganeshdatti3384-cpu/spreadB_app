import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { createPromotion, updatePromotion } from '../../api/promotions';

const CATEGORIES = ['Fashion', 'Beauty', 'Tech', 'Food', 'Travel', 'Fitness', 'Lifestyle', 'Gaming', 'Music', 'Education'];
const LOCATIONS = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Surat'];
const TOTAL_STEPS = 4;

// ─── Date Picker ────────────────────────────────────────────────────────────
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function DatePickerModal({ visible, value, onConfirm, onCancel }) {
  const today = new Date();
  const initial = value ? new Date(value) : new Date(today.getFullYear(), today.getMonth(), today.getDate() + 7);

  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth()); // 0-indexed
  const [day, setDay] = useState(initial.getDate());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const safeDay = Math.min(day, daysInMonth);

  const changeMonth = (dir) => {
    let m = month + dir;
    let y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m);
    setYear(y);
    setDay(d => Math.min(d, new Date(y, m + 1, 0).getDate()));
  };

  const handleConfirm = () => {
    const d = Math.min(day, daysInMonth);
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    onConfirm(`${year}-${mm}-${dd}`);
  };

  const renderDays = () => {
    const cells = [];
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells.push(<View key={`e${i}`} style={dpStyles.dayCell} />);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = d === safeDay;
      const isPast = new Date(year, month, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      cells.push(
        <TouchableOpacity
          key={d}
          style={[dpStyles.dayCell, isSelected && dpStyles.dayCellSelected, isPast && dpStyles.dayCellPast]}
          onPress={() => !isPast && setDay(d)}
          activeOpacity={isPast ? 1 : 0.7}
        >
          <Text style={[dpStyles.dayText, isSelected && dpStyles.dayTextSelected, isPast && dpStyles.dayTextPast]}>{d}</Text>
        </TouchableOpacity>
      );
    }
    return cells;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={dpStyles.overlay}>
        <View style={dpStyles.container}>
          {/* Month/Year nav */}
          <View style={dpStyles.header}>
            <TouchableOpacity onPress={() => changeMonth(-1)} style={dpStyles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={COLORS.text} />
            </TouchableOpacity>
            <Text style={dpStyles.monthYear}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={() => changeMonth(1)} style={dpStyles.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Day-of-week labels */}
          <View style={dpStyles.weekRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
              <Text key={d} style={dpStyles.weekLabel}>{d}</Text>
            ))}
          </View>

          {/* Days grid */}
          <View style={dpStyles.daysGrid}>{renderDays()}</View>

          {/* Actions */}
          <View style={dpStyles.actions}>
            <TouchableOpacity style={dpStyles.cancelBtn} onPress={onCancel}>
              <Text style={dpStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={dpStyles.confirmBtn} onPress={handleConfirm}>
              <Text style={dpStyles.confirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const dpStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  container: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, width: 320, elevation: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  monthYear: { fontSize: 16, fontWeight: '700', color: COLORS.text },
  weekRow: { flexDirection: 'row', marginBottom: 8 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCellSelected: { backgroundColor: COLORS.primary, borderRadius: 999 },
  dayCellPast: { opacity: 0.3 },
  dayText: { fontSize: 13, color: COLORS.text, fontWeight: '500' },
  dayTextSelected: { color: COLORS.white, fontWeight: '700' },
  dayTextPast: { color: COLORS.textLight },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, height: 44, borderRadius: SIZES.radius, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center' },
  cancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  confirmBtn: { flex: 1, height: 44, borderRadius: SIZES.radius, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  confirmText: { fontSize: 14, fontWeight: '700', color: COLORS.white },
});
// ────────────────────────────────────────────────────────────────────────────

function StepIndicator({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <View style={styles.stepIndicator}>
      <View style={styles.stepIndicatorRow}>
        <Text style={styles.stepText}>Step {current} of {total}</Text>
        <Text style={styles.stepPct}>{pct}%</Text>
      </View>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${pct}%` }]} />
      </View>
    </View>
  );
}

function ChipSelector({ options, selected, onToggle, multi = true }) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const isSelected = multi ? selected.includes(opt) : selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.8}
          >
            {isSelected && <Ionicons name="checkmark" size={12} color={COLORS.white} style={{ marginRight: 4 }} />}
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function FormInput({ label, value, onChangeText, placeholder, multiline, keyboardType, prefix }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused, multiline && styles.inputWrapMulti]}>
        {prefix && <Text style={styles.inputPrefix}>{prefix}</Text>}
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          keyboardType={keyboardType || 'default'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function CreatePromotionScreen({ route, navigation }) {
  const { editId, editData } = route.params || {};
  const isEdit = !!editId;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [form, setForm] = useState({
    title: editData?.title || '',
    description: editData?.description || '',
    categories: editData?.categories || [],
    locations: editData?.locations || [],
    budget: editData?.budget?.toString() || '',
    openings: editData?.openings?.toString() || '',
    requiredSticks: editData?.requiredSticks?.toString() || '',
    duration: editData?.duration || '',
    applicationDeadline: editData?.applicationDeadline
      ? new Date(editData.applicationDeadline).toISOString().split('T')[0]
      : '',
  });

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleCategory = (cat) => {
    update('categories', form.categories.includes(cat)
      ? form.categories.filter(c => c !== cat)
      : [...form.categories, cat]);
  };

  const toggleLocation = (loc) => {
    update('locations', form.locations.includes(loc)
      ? form.locations.filter(l => l !== loc)
      : [...form.locations, loc]);
  };

  const validateStep = () => {
    if (step === 1) {
      if (!form.title.trim()) { Alert.alert('Required', 'Please enter a campaign title'); return false; }
      if (!form.description.trim()) { Alert.alert('Required', 'Please enter a description'); return false; }
    }
    if (step === 2) {
      if (form.categories.length === 0) { Alert.alert('Required', 'Select at least one category'); return false; }
      if (form.locations.length === 0) { Alert.alert('Required', 'Select at least one location'); return false; }
    }
    if (step === 3) {
      if (!form.budget.trim()) { Alert.alert('Required', 'Please enter a budget'); return false; }
      if (!form.openings.trim()) { Alert.alert('Required', 'Please enter number of openings'); return false; }
    }
    if (step === 4) {
      if (!form.applicationDeadline) { Alert.alert('Required', 'Please select an application deadline'); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step < TOTAL_STEPS) setStep(s => s + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
    else navigation.goBack();
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        categories: form.categories,
        locations: form.locations,
        budget: parseFloat(form.budget),
        openings: parseInt(form.openings, 10),
        requiredSticks: parseInt(form.requiredSticks || '0', 10),
        duration: form.duration.trim(),
        applicationDeadline: form.applicationDeadline.trim(),
      };

      if (isEdit) {
        await updatePromotion(editId, payload);
        Alert.alert('Success', 'Campaign updated successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        await createPromotion(payload);
        Alert.alert('Success', 'Campaign posted successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (e) {
      const msg = e.response?.data?.message
        || e.response?.data?.error
        || (typeof e.response?.data === 'string' ? e.response.data : null)
        || 'Failed to save campaign. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepHeading}>Basic Information</Text>
      <Text style={styles.stepSubheading}>Tell influencers about your campaign</Text>
      <FormInput
        label="Campaign Title *"
        value={form.title}
        onChangeText={(v) => update('title', v)}
        placeholder="e.g. Summer Fashion Collection 2024"
      />
      <FormInput
        label="Description *"
        value={form.description}
        onChangeText={(v) => update('description', v)}
        placeholder="Describe your campaign goals, deliverables, and what you're looking for..."
        multiline
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepHeading}>Categories & Locations</Text>
      <Text style={styles.stepSubheading}>Help influencers find your campaign</Text>

      <Text style={styles.inputLabel}>Categories * <Text style={styles.selectedCount}>({form.categories.length} selected)</Text></Text>
      <ChipSelector options={CATEGORIES} selected={form.categories} onToggle={toggleCategory} />

      <Text style={[styles.inputLabel, { marginTop: 20 }]}>Locations * <Text style={styles.selectedCount}>({form.locations.length} selected)</Text></Text>
      <ChipSelector options={LOCATIONS} selected={form.locations} onToggle={toggleLocation} />
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepHeading}>Budget & Requirements</Text>
      <Text style={styles.stepSubheading}>Set your campaign parameters</Text>
      <FormInput
        label="Budget (₹) *"
        value={form.budget}
        onChangeText={(v) => update('budget', v)}
        placeholder="e.g. 50000"
        keyboardType="numeric"
        prefix="₹"
      />
      <FormInput
        label="Number of Openings *"
        value={form.openings}
        onChangeText={(v) => update('openings', v)}
        placeholder="e.g. 5"
        keyboardType="numeric"
      />
      <FormInput
        label="Required Sticks"
        value={form.requiredSticks}
        onChangeText={(v) => update('requiredSticks', v)}
        placeholder="e.g. 100"
        keyboardType="numeric"
      />
      <FormInput
        label="Campaign Duration"
        value={form.duration}
        onChangeText={(v) => update('duration', v)}
        placeholder="e.g. 30 days, 2 weeks"
      />
    </View>
  );

  const renderStep4 = () => (
    <View>
      <Text style={styles.stepHeading}>Deadline & Review</Text>
      <Text style={styles.stepSubheading}>Set deadline and review your campaign</Text>

      {/* Date Picker trigger */}
      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Application Deadline *</Text>
        <TouchableOpacity
          style={styles.datePickerBtn}
          onPress={() => setShowDatePicker(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="calendar-outline" size={18} color={form.applicationDeadline ? COLORS.primary : COLORS.textLight} />
          <Text style={[styles.datePickerText, !form.applicationDeadline && styles.datePickerPlaceholder]}>
            {form.applicationDeadline
              ? (() => {
                  const [y, m, d] = form.applicationDeadline.split('-');
                  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
                })()
              : 'Select deadline date'}
          </Text>
          <Ionicons name="chevron-down" size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      </View>

      {/* Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Campaign Summary</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Title</Text>
          <Text style={styles.summaryValue} numberOfLines={2}>{form.title || '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Categories</Text>
          <Text style={styles.summaryValue}>{form.categories.join(', ') || '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Locations</Text>
          <Text style={styles.summaryValue}>{form.locations.join(', ') || '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Budget</Text>
          <Text style={styles.summaryValue}>₹{form.budget || '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Openings</Text>
          <Text style={styles.summaryValue}>{form.openings || '—'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Req. Sticks</Text>
          <Text style={styles.summaryValue}>{form.requiredSticks || '0'}</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Deadline</Text>
          <Text style={styles.summaryValue}>
            {form.applicationDeadline
              ? (() => {
                  const [y, m, d] = form.applicationDeadline.split('-');
                  return `${d} ${MONTHS[parseInt(m, 10) - 1]} ${y}`;
                })()
              : '—'}
          </Text>
        </View>
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Date Picker Modal */}
      <DatePickerModal
        visible={showDatePicker}
        value={form.applicationDeadline}
        onConfirm={(date) => { update('applicationDeadline', date); setShowDatePicker(false); }}
        onCancel={() => setShowDatePicker(false)}
      />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Campaign' : 'Post Campaign'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <StepIndicator current={step} total={TOTAL_STEPS} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Navigation buttons */}
      <View style={styles.navButtons}>
        {step > 1 && (
          <TouchableOpacity style={styles.backNavBtn} onPress={handleBack} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={18} color={COLORS.textSecondary} />
            <Text style={styles.backNavBtnText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextBtn, step === 1 && { flex: 1 }]}
          onPress={step === TOTAL_STEPS ? handleSubmit : handleNext}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.nextBtnText}>
                {step === TOTAL_STEPS ? (isEdit ? 'Update Campaign' : 'Post Campaign') : 'Next'}
              </Text>
              {step < TOTAL_STEPS && <Ionicons name="arrow-forward" size={18} color={COLORS.white} />}
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  stepIndicator: { backgroundColor: COLORS.white, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
  stepIndicatorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stepText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  stepPct: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  progressBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3 },
  progressBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  stepHeading: { fontSize: 20, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  stepSubheading: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24, lineHeight: 20 },

  inputGroup: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  selectedCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '400' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.white, paddingHorizontal: 14, height: 46,
  },
  inputWrapFocused: { borderColor: COLORS.primary },
  inputWrapMulti: { height: 110, alignItems: 'flex-start', paddingTop: 12 },
  inputPrefix: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, marginRight: 6 },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  inputMulti: { height: 86 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.white, fontWeight: '600' },

  summaryCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: 16, marginTop: 20,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  summaryTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 14 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 8 },
  summaryLabel: { fontSize: 13, color: COLORS.textSecondary, flex: 1 },
  summaryValue: { fontSize: 13, fontWeight: '600', color: COLORS.text, flex: 2, textAlign: 'right' },
  summaryDivider: { height: 1, backgroundColor: COLORS.borderLight },

  navButtons: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: 28,
  },
  backNavBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    height: 46, paddingHorizontal: 18,
  },
  backNavBtnText: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' },
  nextBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius, height: 46,
  },
  nextBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },

  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.white, paddingHorizontal: 14, height: 46,
  },
  datePickerText: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  datePickerPlaceholder: { color: COLORS.placeholder, fontWeight: '400' },
});

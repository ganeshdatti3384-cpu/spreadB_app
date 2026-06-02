import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../theme/colors';
import { createBrandProfile, getBrandProfile, updateBrandProfile } from '../../api/profile';
import { useAuth } from '../../context/AuthContext';
import { BASE_URL } from '../../api/config';

const INDUSTRIES = [
  'Fashion', 'Beauty', 'Technology', 'Food & Beverage', 'Travel',
  'Health', 'Entertainment', 'Education', 'Finance', 'Retail',
];
const LOCATIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

function FormInput({ label, value, onChangeText, placeholder, multiline, keyboardType, autoCapitalize, icon }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        multiline && styles.inputWrapMulti,
      ]}>
        {icon && <Ionicons name={icon} size={16} color={COLORS.textSecondary} style={styles.inputIcon} />}
        <TextInput
          style={[styles.input, multiline && styles.inputMulti]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.placeholder}
          multiline={multiline}
          numberOfLines={multiline ? 4 : 1}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

export default function CreateBrandProfileScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [logo, setLogo] = useState(null);
  const [existingLogoUrl, setExistingLogoUrl] = useState(null);
  const [isEdit, setIsEdit] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [form, setForm] = useState({
    brandName: '',
    industry: '',
    description: '',
    website: '',
    locations: [],
    instagramUrl: '',
    facebookUrl: '',
  });

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  useEffect(() => {
    const loadExisting = async () => {
      try {
        const res = await getBrandProfile();
        const profile = res.data?.profile || res.data;
        if (profile) {
          setIsEdit(true);
          setForm({
            brandName: profile.brandName || '',
            industry: profile.industry || '',
            description: profile.description || '',
            website: profile.website || '',
            locations: profile.locations || [],
            instagramUrl: profile.socialMedia?.instagram || '',
            facebookUrl: profile.socialMedia?.facebook || '',
          });
          if (profile.brandLogo) {
            setExistingLogoUrl(`${BASE_URL}/${profile.brandLogo}`);
          }
        }
      } catch (e) {
        setIsEdit(false);
      } finally {
        setLoadingProfile(false);
      }
    };
    loadExisting();
  }, []);

  const toggleLocation = (loc) => {
    update('locations', form.locations.includes(loc)
      ? form.locations.filter((l) => l !== loc)
      : [...form.locations, loc]);
  };

  const pickLogo = async () => {
    try {
      // Request both media library and camera permissions
      const [mediaStatus, cameraStatus] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync()
      ]);
      
      if (mediaStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'SpreadB needs access to your photo library to upload a brand logo. Please enable photo library access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      // Show option to choose between camera and gallery
      Alert.alert(
        'Upload Logo',
        'Choose a logo from:',
        [
          {
            text: 'Camera',
            onPress: async () => {
              if (cameraStatus.status !== 'granted') {
                Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
                return;
              }
              const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets?.[0]) {
                setLogo(result.assets[0]);
              }
            }
          },
          {
            text: 'Gallery',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets?.[0]) {
                setLogo(result.assets[0]);
              }
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.log('Image picker error:', error);
      Alert.alert('Error', 'Failed to access photos. Please try again.');
    }
  };

  const handleSubmit = async () => {
    if (!form.brandName.trim()) { Alert.alert('Required', 'Please enter your brand name'); return; }
    if (!form.industry) { Alert.alert('Required', 'Please select an industry'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('brandName', form.brandName.trim());
      formData.append('industry', form.industry);
      formData.append('description', form.description.trim());
      formData.append('website', form.website.trim());
      formData.append('locations', JSON.stringify(form.locations));
      formData.append('socialMedia', JSON.stringify({
        instagram: form.instagramUrl,
        twitter: '',
        youtube: '',
      }));

      if (logo) {
        const filename = logo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('brandLogo', { uri: logo.uri, name: filename, type });
      }

      if (isEdit) {
        await updateBrandProfile(formData);
      } else {
        await createBrandProfile(formData);
      }
      await refreshUser();
      Alert.alert(
        'Success',
        isEdit ? 'Brand profile updated successfully!' : 'Brand profile created successfully!',
        [{ text: 'OK', onPress: () => navigation.goBack() }],
      );
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to save profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingProfile) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEdit ? 'Edit Brand Profile' : 'Create Brand Profile'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo picker */}
        <View style={styles.logoSection}>
          <TouchableOpacity style={styles.logoPicker} onPress={pickLogo} activeOpacity={0.8}>
            {logo ? (
              <Image source={{ uri: logo.uri }} style={styles.logoImage} />
            ) : existingLogoUrl ? (
              <Image source={{ uri: existingLogoUrl }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.logoHint}>Upload brand logo (1:1 ratio)</Text>
        </View>

        {/* Brand Information */}
        <Text style={styles.sectionTitle}>BRAND INFORMATION</Text>
        <FormInput
          label="Brand Name"
          value={form.brandName}
          onChangeText={(v) => update('brandName', v)}
          placeholder="Your Brand Name"
        />
        <FormInput
          label="Description"
          value={form.description}
          onChangeText={(v) => update('description', v)}
          placeholder="Tell influencers about your brand..."
          multiline
        />
        <FormInput
          label="Website"
          value={form.website}
          onChangeText={(v) => update('website', v)}
          placeholder="https://yourbrand.com"
          autoCapitalize="none"
          keyboardType="url"
          icon="globe-outline"
        />

        {/* Industry */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          INDUSTRY{' '}
          <Text style={styles.selectedCount}>
            ({form.industry ? '1' : '0'} selected)
          </Text>
        </Text>
        <View style={styles.chipGrid}>
          {INDUSTRIES.map((ind) => {
            const isSelected = form.industry === ind;
            return (
              <TouchableOpacity
                key={ind}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => update('industry', isSelected ? '' : ind)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{ind}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Locations */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          OPERATING LOCATIONS{' '}
          <Text style={styles.selectedCount}>({form.locations.length} selected)</Text>
        </Text>
        <View style={styles.chipGrid}>
          {LOCATIONS.map((loc) => {
            const isSelected = form.locations.includes(loc);
            return (
              <TouchableOpacity
                key={loc}
                style={[styles.chip, isSelected && styles.chipSelected]}
                onPress={() => toggleLocation(loc)}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{loc}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Social Media */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>SOCIAL MEDIA</Text>

        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <Ionicons name="logo-instagram" size={20} color="#E1306C" />
            <Text style={styles.socialLabel}>Instagram</Text>
          </View>
          <FormInput
            label="Profile URL"
            value={form.instagramUrl}
            onChangeText={(v) => update('instagramUrl', v)}
            placeholder="instagram.com/yourbrand"
            autoCapitalize="none"
          />
        </View>

        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <Ionicons name="logo-facebook" size={20} color="#1877F2" />
            <Text style={styles.socialLabel}>Facebook</Text>
          </View>
          <FormInput
            label="Page URL"
            value={form.facebookUrl}
            onChangeText={(v) => update('facebookUrl', v)}
            placeholder="facebook.com/yourbrand"
            autoCapitalize="none"
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>
              {isEdit ? 'Update Brand Profile' : 'Create Brand Profile'}
            </Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  logoSection: { alignItems: 'center', marginBottom: 24 },
  logoPicker: { position: 'relative' },
  logoImage: { width: 96, height: 96, borderRadius: 16 },
  logoPlaceholder: {
    width: 96, height: 96, borderRadius: 16,
    backgroundColor: COLORS.background, borderWidth: 2,
    borderStyle: 'dashed', borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraOverlay: {
    position: 'absolute', bottom: -4, right: -4,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  logoHint: { fontSize: 12, color: COLORS.textSecondary, marginTop: 10 },

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.text,
    letterSpacing: 0.8, marginBottom: 14,
  },
  selectedCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '400' },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.white, paddingHorizontal: 14, height: 44,
  },
  inputWrapFocused: { borderColor: COLORS.primary },
  inputWrapMulti: { height: 96, alignItems: 'flex-start', paddingTop: 10 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 14, color: COLORS.text },
  inputMulti: { height: 76 },

  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: {
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: COLORS.background, borderWidth: 1.5, borderColor: COLORS.border,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: 13, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextSelected: { color: COLORS.white, fontWeight: '600' },

  socialCard: {
    backgroundColor: COLORS.white, borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: COLORS.border,
    padding: 16, marginBottom: 12,
  },
  socialHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  socialLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.radius,
    height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 24,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 15 },
});

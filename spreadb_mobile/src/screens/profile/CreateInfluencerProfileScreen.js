import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../theme/colors';
import { createInfluencerProfile } from '../../api/profile';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  'Fashion', 'Beauty', 'Tech', 'Food', 'Travel',
  'Fitness', 'Lifestyle', 'Gaming', 'Music', 'Education',
];
const LOCATIONS = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai',
  'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow',
];

function FormInput({ label, value, onChangeText, placeholder, multiline, keyboardType, prefix, autoCapitalize }) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[
        styles.inputWrap,
        focused && styles.inputWrapFocused,
        multiline && styles.inputWrapMulti,
      ]}>
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
          autoCapitalize={autoCapitalize || 'sentences'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          textAlignVertical={multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );
}

function ChipSelector({ options, selected, onToggle }) {
  return (
    <View style={styles.chipGrid}>
      {options.map((opt) => {
        const isSelected = selected.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, isSelected && styles.chipSelected]}
            onPress={() => onToggle(opt)}
            activeOpacity={0.8}
          >
            <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function CreateInfluencerProfileScreen({ navigation }) {
  const { refreshUser } = useAuth();
  const [submitting, setSubmitting] = useState(false);
  const [photo, setPhoto] = useState(null);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    phone: '',
    about: '',
    category: [],
    locations: [],
    instagramUrl: '',
    instagramFollowers: '',
    youtubeUrl: '',
    youtubeSubscribers: '',
    twitterUrl: '',
    twitterFollowers: '',
  });

  const update = (key, val) => setForm((prev) => ({ ...prev, [key]: val }));

  const toggleCategory = (cat) => {
    update('category', form.category.includes(cat)
      ? form.category.filter((c) => c !== cat)
      : [...form.category, cat]);
  };

  const toggleLocation = (loc) => {
    update('locations', form.locations.includes(loc)
      ? form.locations.filter((l) => l !== loc)
      : [...form.locations, loc]);
  };

  const pickPhoto = async () => {
    try {
      // Request both media library and camera permissions
      const [mediaStatus, cameraStatus] = await Promise.all([
        ImagePicker.requestMediaLibraryPermissionsAsync(),
        ImagePicker.requestCameraPermissionsAsync()
      ]);
      
      if (mediaStatus.status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'SpreadB needs access to your photo library to upload a profile picture. Please enable photo library access in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }
      
      // Show option to choose between camera and gallery
      Alert.alert(
        'Upload Photo',
        'Choose a photo from:',
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
                setPhoto(result.assets[0]);
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
                setPhoto(result.assets[0]);
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
    if (!form.firstName.trim()) { Alert.alert('Required', 'Please enter your first name'); return; }
    if (!form.userName.trim()) { Alert.alert('Required', 'Please enter a username'); return; }
    if (form.category.length === 0) { Alert.alert('Required', 'Select at least one category'); return; }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('firstName', form.firstName.trim());
      formData.append('lastName', form.lastName.trim());
      formData.append('userName', form.userName.trim().replace('@', ''));
      formData.append('phone', form.phone.trim());
      formData.append('about', form.about.trim());
      form.category.forEach((c) => formData.append('category[]', c));
      form.locations.forEach((l) => formData.append('locations[]', l));
      formData.append('socialMedia', JSON.stringify({
        instagram: { url: form.instagramUrl, followers: parseInt(form.instagramFollowers || '0', 10) },
        youtube: { url: form.youtubeUrl, subscribers: parseInt(form.youtubeSubscribers || '0', 10) },
        twitter: { url: form.twitterUrl, followers: parseInt(form.twitterFollowers || '0', 10) },
      }));

      if (photo) {
        const filename = photo.uri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';
        formData.append('profilePhoto', { uri: photo.uri, name: filename, type });
      }

      await createInfluencerProfile(formData);
      await refreshUser();
      Alert.alert('Success', 'Profile created successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create profile. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

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
        <Text style={styles.headerTitle}>Create Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Photo picker */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoPicker} onPress={pickPhoto} activeOpacity={0.8}>
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={32} color={COLORS.textLight} />
              </View>
            )}
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Basic Information */}
        <Text style={styles.sectionTitle}>BASIC INFORMATION</Text>
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <FormInput
              label="First Name"
              value={form.firstName}
              onChangeText={(v) => update('firstName', v)}
              placeholder="John"
            />
          </View>
          <View style={{ flex: 1 }}>
            <FormInput
              label="Last Name"
              value={form.lastName}
              onChangeText={(v) => update('lastName', v)}
              placeholder="Doe"
            />
          </View>
        </View>
        <FormInput
          label="Username"
          value={form.userName}
          onChangeText={(v) => update('userName', v)}
          placeholder="johndoe"
          prefix="@"
          autoCapitalize="none"
        />
        <FormInput
          label="Phone Number"
          value={form.phone}
          onChangeText={(v) => update('phone', v)}
          placeholder="+91 98765 43210"
          keyboardType="phone-pad"
        />
        <FormInput
          label="About / Bio"
          value={form.about}
          onChangeText={(v) => update('about', v)}
          placeholder="Tell brands about yourself..."
          multiline
        />

        {/* Categories */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          CATEGORIES{' '}
          <Text style={styles.selectedCount}>({form.category.length} selected)</Text>
        </Text>
        <ChipSelector options={CATEGORIES} selected={form.category} onToggle={toggleCategory} />

        {/* Locations */}
        <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
          LOCATIONS{' '}
          <Text style={styles.selectedCount}>({form.locations.length} selected)</Text>
        </Text>
        <ChipSelector options={LOCATIONS} selected={form.locations} onToggle={toggleLocation} />

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
            placeholder="instagram.com/username"
            autoCapitalize="none"
          />
          <FormInput
            label="Followers count"
            value={form.instagramFollowers}
            onChangeText={(v) => update('instagramFollowers', v)}
            placeholder="e.g. 10000"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <Ionicons name="logo-youtube" size={20} color="#FF0000" />
            <Text style={styles.socialLabel}>YouTube</Text>
          </View>
          <FormInput
            label="Channel URL"
            value={form.youtubeUrl}
            onChangeText={(v) => update('youtubeUrl', v)}
            placeholder="youtube.com/@channel"
            autoCapitalize="none"
          />
          <FormInput
            label="Subscribers count"
            value={form.youtubeSubscribers}
            onChangeText={(v) => update('youtubeSubscribers', v)}
            placeholder="e.g. 5000"
            keyboardType="numeric"
          />
        </View>

        <View style={styles.socialCard}>
          <View style={styles.socialHeader}>
            <Ionicons name="logo-twitter" size={20} color="#1DA1F2" />
            <Text style={styles.socialLabel}>Twitter / X</Text>
          </View>
          <FormInput
            label="Profile URL"
            value={form.twitterUrl}
            onChangeText={(v) => update('twitterUrl', v)}
            placeholder="twitter.com/username"
            autoCapitalize="none"
          />
          <FormInput
            label="Followers count"
            value={form.twitterFollowers}
            onChangeText={(v) => update('twitterFollowers', v)}
            placeholder="e.g. 2000"
            keyboardType="numeric"
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
            <Text style={styles.submitBtnText}>Create Profile</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
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
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text },

  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  photoSection: { alignItems: 'center', marginBottom: 24 },
  photoPicker: { position: 'relative' },
  photoImage: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: {
    width: 96, height: 96, borderRadius: 48,
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

  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: COLORS.text,
    letterSpacing: 0.8, marginBottom: 14,
  },
  selectedCount: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '400' },

  row: { flexDirection: 'row', gap: 12 },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: COLORS.border, borderRadius: SIZES.radius,
    backgroundColor: COLORS.white, paddingHorizontal: 14, height: 44,
  },
  inputWrapFocused: { borderColor: COLORS.primary },
  inputWrapMulti: { height: 96, alignItems: 'flex-start', paddingTop: 10 },
  inputPrefix: { fontSize: 14, color: COLORS.textSecondary, marginRight: 4 },
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

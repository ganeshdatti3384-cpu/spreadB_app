import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, StatusBar, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import { profileAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const CATEGORIES = [
  'Fashion', 'Beauty', 'Tech', 'Food', 'Travel', 'Fitness',
  'Gaming', 'Lifestyle', 'Education', 'Entertainment', 'Business', 'Sports',
];

const InfluencerProfileForm = ({ navigation }) => {
  const { setProfileCreated } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    userName: '',
    phoneNumber: '',
    about: '',
    category: [],
    locations: [],
    portfolioLinks: [],
    socialMedia: {
      instagram: { link: '', followers: '', views: '' },
      youtube: { link: '', followers: '', views: '' },
      twitter: { link: '', followers: '', views: '' },
    },
  });
  const [errors, setErrors] = useState({});
  const [locationInput, setLocationInput] = useState('');
  const [portfolioInput, setPortfolioInput] = useState('');

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const updateSocial = (platform, key, val) =>
    setForm((f) => ({
      ...f,
      socialMedia: {
        ...f.socialMedia,
        [platform]: { ...f.socialMedia[platform], [key]: val },
      },
    }));

  const toggleCategory = (cat) => {
    const cats = form.category.includes(cat)
      ? form.category.filter((c) => c !== cat)
      : [...form.category, cat];
    update('category', cats);
  };

  const addLocation = () => {
    if (locationInput.trim()) {
      update('locations', [...form.locations, locationInput.trim()]);
      setLocationInput('');
    }
  };

  const addPortfolio = () => {
    if (portfolioInput.trim()) {
      update('portfolioLinks', [...form.portfolioLinks, portfolioInput.trim()]);
      setPortfolioInput('');
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setProfilePhoto(result.assets[0]);
    }
  };

  const validateStep1 = () => {
    const e = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.userName.trim()) e.userName = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && !validateStep1()) return;
    setStep((s) => s + 1);
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('firstName', form.firstName);
      formData.append('lastName', form.lastName);
      formData.append('userName', form.userName);
      formData.append('phoneNumber', form.phoneNumber);
      formData.append('about', form.about);
      formData.append('category', JSON.stringify(form.category));
      formData.append('locations', JSON.stringify(form.locations));
      formData.append('portfolioLinks', JSON.stringify(form.portfolioLinks));
      formData.append('socialMedia', JSON.stringify(form.socialMedia));

      if (profilePhoto) {
        formData.append('profilePhoto', {
          uri: profilePhoto.uri,
          type: 'image/jpeg',
          name: 'profile.jpg',
        });
      }

      await profileAPI.createInfluencer(formData);
      await setProfileCreated();
      navigation.replace('Main');
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View>
      <Text style={styles.stepTitle}>Basic Information</Text>

      {/* Profile photo */}
      <TouchableOpacity style={styles.photoPicker} onPress={pickImage}>
        {profilePhoto ? (
          <Image source={{ uri: profilePhoto.uri }} style={styles.photoPreview} />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Ionicons name="camera-outline" size={28} color={COLORS.gray400} />
            <Text style={styles.photoText}>Add photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.row}>
        <View style={{ flex: 1, marginRight: SPACING.sm }}>
          <Input
            label="First Name *"
            placeholder="First name"
            value={form.firstName}
            onChangeText={(v) => update('firstName', v)}
            autoCapitalize="words"
            error={errors.firstName}
          />
        </View>
        <View style={{ flex: 1, marginLeft: SPACING.sm }}>
          <Input
            label="Last Name"
            placeholder="Last name"
            value={form.lastName}
            onChangeText={(v) => update('lastName', v)}
            autoCapitalize="words"
          />
        </View>
      </View>

      <Input
        label="Username *"
        placeholder="@username"
        value={form.userName}
        onChangeText={(v) => update('userName', v)}
        error={errors.userName}
      />

      <Input
        label="Phone Number"
        placeholder="+91 XXXXX XXXXX"
        value={form.phoneNumber}
        onChangeText={(v) => update('phoneNumber', v)}
        keyboardType="phone-pad"
      />

      <Input
        label="About"
        placeholder="Tell brands about yourself..."
        value={form.about}
        onChangeText={(v) => update('about', v)}
        multiline
        numberOfLines={4}
      />
    </View>
  );

  const renderStep2 = () => (
    <View>
      <Text style={styles.stepTitle}>Your Niche</Text>
      <Text style={styles.stepSubtitle}>Select categories that describe your content</Text>

      <View style={styles.chipGrid}>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            style={[styles.chip, form.category.includes(cat) && styles.chipActive]}
            onPress={() => toggleCategory(cat)}
          >
            <Text style={[styles.chipText, form.category.includes(cat) && styles.chipTextActive]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.stepTitle, { marginTop: SPACING.xl }]}>Locations</Text>
      <View style={styles.addRow}>
        <Input
          placeholder="Add a city or region"
          value={locationInput}
          onChangeText={setLocationInput}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addLocation}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.tagRow}>
        {form.locations.map((loc, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText}>{loc}</Text>
            <TouchableOpacity
              onPress={() => update('locations', form.locations.filter((_, idx) => idx !== i))}
            >
              <Ionicons name="close" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View>
      <Text style={styles.stepTitle}>Social Media</Text>
      <Text style={styles.stepSubtitle}>Connect your social accounts</Text>

      {['instagram', 'youtube', 'twitter'].map((platform) => (
        <View key={platform} style={styles.socialSection}>
          <Text style={styles.platformLabel}>
            {platform.charAt(0).toUpperCase() + platform.slice(1)}
          </Text>
          <Input
            placeholder={`${platform} profile URL`}
            value={form.socialMedia[platform].link}
            onChangeText={(v) => updateSocial(platform, 'link', v)}
          />
          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: SPACING.sm }}>
              <Input
                placeholder="Followers"
                value={form.socialMedia[platform].followers}
                onChangeText={(v) => updateSocial(platform, 'followers', v)}
                keyboardType="numeric"
              />
            </View>
            <View style={{ flex: 1, marginLeft: SPACING.sm }}>
              <Input
                placeholder="Avg. Views"
                value={form.socialMedia[platform].views}
                onChangeText={(v) => updateSocial(platform, 'views', v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      ))}

      <Text style={[styles.stepTitle, { marginTop: SPACING.md }]}>Portfolio Links</Text>
      <View style={styles.addRow}>
        <Input
          placeholder="Add portfolio URL"
          value={portfolioInput}
          onChangeText={setPortfolioInput}
          style={{ flex: 1, marginBottom: 0 }}
        />
        <TouchableOpacity style={styles.addBtn} onPress={addPortfolio}>
          <Ionicons name="add" size={22} color={COLORS.white} />
        </TouchableOpacity>
      </View>
      <View style={styles.tagRow}>
        {form.portfolioLinks.map((link, i) => (
          <View key={i} style={styles.tag}>
            <Text style={styles.tagText} numberOfLines={1}>{link}</Text>
            <TouchableOpacity
              onPress={() => update('portfolioLinks', form.portfolioLinks.filter((_, idx) => idx !== i))}
            >
              <Ionicons name="close" size={14} color={COLORS.primary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(s => s - 1) : navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Profile</Text>
        <Text style={styles.stepIndicator}>{step}/3</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </ScrollView>

      <View style={styles.footer}>
        {step < 3 ? (
          <Button title="Next" onPress={handleNext} size="lg" />
        ) : (
          <Button title="Create Profile" onPress={handleSubmit} loading={loading} size="lg" />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 60,
    paddingBottom: SPACING.lg,
    gap: SPACING.md,
  },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.lg, fontWeight: '600', color: COLORS.text },
  stepIndicator: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  progressBar: {
    height: 3,
    backgroundColor: COLORS.gray200,
    marginHorizontal: SPACING.xl,
    borderRadius: 2,
    marginBottom: SPACING.lg,
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  scroll: { paddingHorizontal: SPACING.xl, paddingBottom: 100 },
  stepTitle: {
    fontSize: FONTS.sizes.xl,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: SPACING.sm,
  },
  stepSubtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xl,
  },
  photoPicker: { alignSelf: 'center', marginBottom: SPACING.xl },
  photoPreview: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.gray100,
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  row: { flexDirection: 'row' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.xl },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.primary, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  addBtn: {
    width: 48,
    height: 50,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.lg },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    gap: 6,
  },
  tagText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, maxWidth: 150 },
  socialSection: { marginBottom: SPACING.lg },
  platformLabel: {
    fontSize: FONTS.sizes.md,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: SPACING.sm,
    textTransform: 'capitalize',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
});

export default InfluencerProfileForm;

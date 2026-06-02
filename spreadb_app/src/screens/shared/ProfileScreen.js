import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  StatusBar, Image, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { profileAPI, BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';

const ProfileScreen = ({ navigation }) => {
  const { user, role, logout, isInfluencer } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = isInfluencer
          ? await profileAPI.getInfluencer()
          : await profileAPI.getBrandOwner();
        setProfile(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [isInfluencer]);

  const getPhotoUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `${BASE_URL}/${path}`;
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const photoUrl = isInfluencer
    ? getPhotoUrl(profile?.profilePhoto)
    : getPhotoUrl(profile?.brandLogo);

  const displayName = isInfluencer
    ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
    : profile?.brandName || '';

  const menuItems = [
    { icon: 'person-outline', label: 'Edit Profile', onPress: () => navigation.navigate('EditProfile') },
    { icon: 'notifications-outline', label: 'Notifications', onPress: () => navigation.navigate('Notifications') },
    { icon: 'wallet-outline', label: 'Wallet', onPress: () => navigation.navigate('Wallet') },
    ...(isInfluencer ? [
      { icon: 'star-outline', label: 'My Sticks', onPress: () => navigation.navigate('BuySticks') },
      { icon: 'document-text-outline', label: 'My Applications', onPress: () => navigation.navigate('MyApplications') },
    ] : [
      { icon: 'megaphone-outline', label: 'My Campaigns', onPress: () => navigation.navigate('MyPromotions') },
      { icon: 'people-outline', label: 'Find Influencers', onPress: () => navigation.navigate('FindInfluencers') },
    ]),
    { icon: 'chatbubble-outline', label: 'Messages', onPress: () => navigation.navigate('Messages') },
    { icon: 'help-circle-outline', label: 'Help & Support', onPress: () => {} },
    { icon: 'log-out-outline', label: 'Log Out', onPress: handleLogout, danger: true },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
          <Ionicons name="settings-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={COLORS.gray400} />
              </View>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={() => navigation.navigate('EditProfile')}>
              <Ionicons name="camera" size={14} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          <Text style={styles.displayName}>{displayName || 'Complete your profile'}</Text>
          <Text style={styles.roleLabel}>{role}</Text>
          {profile?.about && (
            <Text style={styles.about} numberOfLines={2}>{profile.about}</Text>
          )}

          {/* Stats */}
          {isInfluencer && profile && (
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{profile.sticks?.total || 0}</Text>
                <Text style={styles.statLabel}>Sticks</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {profile.reports?.promotionsApplied?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Applied</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>
                  {profile.reports?.promotionsAccepted?.length || 0}
                </Text>
                <Text style={styles.statLabel}>Accepted</Text>
              </View>
            </View>
          )}

          {/* Social media */}
          {isInfluencer && profile?.socialMedia && (
            <View style={styles.socialRow}>
              {Object.entries(profile.socialMedia).map(([platform, data]) =>
                data?.link ? (
                  <View key={platform} style={styles.socialItem}>
                    <Ionicons
                      name={platform === 'instagram' ? 'logo-instagram' : platform === 'youtube' ? 'logo-youtube' : 'logo-twitter'}
                      size={18}
                      color={COLORS.textSecondary}
                    />
                    <Text style={styles.socialFollowers}>
                      {Number(data.followers || 0).toLocaleString()}
                    </Text>
                  </View>
                ) : null
              )}
            </View>
          )}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={item.onPress}
              activeOpacity={0.7}
            >
              <View style={[styles.menuIcon, item.danger && styles.menuIconDanger]}>
                <Ionicons
                  name={item.icon}
                  size={20}
                  color={item.danger ? COLORS.error : COLORS.primary}
                />
              </View>
              <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                {item.label}
              </Text>
              {!item.danger && (
                <Ionicons name="chevron-forward" size={18} color={COLORS.gray300} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  profileCard: {
    backgroundColor: COLORS.white,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  avatarContainer: { position: 'relative', marginBottom: SPACING.md },
  avatar: { width: 90, height: 90, borderRadius: 45 },
  avatarPlaceholder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  displayName: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  roleLabel: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.primary,
    fontWeight: '600',
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  about: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: SPACING.lg,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.lg,
    width: '100%',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONTS.sizes.xl, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, height: 30, backgroundColor: COLORS.borderLight },
  socialRow: {
    flexDirection: 'row',
    gap: SPACING.xl,
    justifyContent: 'center',
  },
  socialItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  socialFollowers: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '500' },
  menu: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.xl,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  menuIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIconDanger: { backgroundColor: '#fef2f2' },
  menuLabel: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.text, fontWeight: '500' },
  menuLabelDanger: { color: COLORS.error },
});

export default ProfileScreen;

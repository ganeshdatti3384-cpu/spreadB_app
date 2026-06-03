import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, Alert, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getInfluencerProfile, getBrandProfile, updateInfluencerProfile, updateBrandProfile } from '../../api/profile';
import { BASE_URL } from '../../api/config';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ icon, color, value, label, onPress }) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress} activeOpacity={onPress ? 0.8 : 1}>
      <LinearGradient
        colors={[color, color + 'CC']}
        style={styles.statIconGradient}
      >
        <Ionicons name={icon} size={20} color={COLORS.white} />
      </LinearGradient>
      <Text style={styles.statValue}>{value ?? '0'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function MenuItem({ icon, label, onPress, accent, value }) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.75}>
      <LinearGradient
        colors={[(accent || COLORS.primary) + '20', (accent || COLORS.primary) + '10']}
        style={styles.menuIconGradient}
      >
        <Ionicons name={icon} size={18} color={accent || COLORS.primary} />
      </LinearGradient>
      <Text style={styles.menuLabel}>{label}</Text>
      {value != null && <Text style={styles.menuValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function ProfileScreen({ navigation }) {
  const { user, logout } = useAuth();
  const isInfluencer = user?.role === 'Influencer';

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = isInfluencer ? await getInfluencerProfile() : await getBrandProfile();
      setProfile(res.data?.profile || res.data);
    } catch (e) {
      console.log('Profile load error:', e?.response?.status, e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isInfluencer]);

  useEffect(() => { load(); }, [load]);

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout },
    ]);
  };

  const handleChangePhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    setUploadingPhoto(true);
    try {
      const asset = result.assets[0];
      const filename = asset.uri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';
      const formData = new FormData();
      formData.append(isInfluencer ? 'profilePhoto' : 'brandLogo', { uri: asset.uri, name: filename, type });
      if (isInfluencer) await updateInfluencerProfile(formData);
      else await updateBrandProfile(formData);
      await load();
      Alert.alert('Success', 'Profile photo updated!');
    } catch {
      Alert.alert('Error', 'Failed to update photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const photoPath = profile?.profilePhoto || profile?.brandLogo;
  const photoUrl = photoPath ? `${BASE_URL}/${photoPath}` : null;

  const displayName = isInfluencer
    ? `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || user?.email?.split('@')[0]
    : profile?.brandName || user?.email?.split('@')[0];

  const initials = displayName
    ? displayName.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  const sticks = profile?.sticks?.total ?? profile?.sticks?.free ?? 0;

  return (
    <View style={styles.container}>
      {/* ── GRADIENT HEADER (30%) ── */}
      <LinearGradient
        colors={['#0A2010', '#0D3015', '#0A1628']}
        start={{ x: 0, y: 0 }} 
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Edit button */}
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate(isInfluencer ? 'CreateInfluencerProfile' : 'CreateBrandProfile')}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={14} color={COLORS.white} />
          <Text style={styles.editBtnText}>Edit Profile</Text>
        </TouchableOpacity>

        {/* Avatar & Name */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handleChangePhoto} activeOpacity={0.85}>
            {uploadingPhoto ? (
              <View style={[styles.avatarPlaceholder, !isInfluencer && styles.avatarBrand]}>
                <ActivityIndicator color={COLORS.primary} />
              </View>
            ) : photoUrl ? (
              <Image source={{ uri: photoUrl }} style={[styles.avatar, !isInfluencer && styles.avatarBrand]} />
            ) : (
              <View style={[styles.avatarPlaceholder, !isInfluencer && styles.avatarBrand]}>
                {isInfluencer
                  ? <Text style={styles.avatarInitials}>{initials}</Text>
                  : <Ionicons name="briefcase" size={32} color={COLORS.primary} />
                }
              </View>
            )}
            <View style={styles.cameraBtn}>
              <Ionicons name="camera" size={12} color={COLORS.white} />
            </View>
          </TouchableOpacity>

          <Text style={styles.displayName}>{displayName || 'User'}</Text>
          {isInfluencer && profile?.userName && (
            <Text style={styles.username}>@{profile.userName}</Text>
          )}

          {/* Role badge */}
          <View style={styles.roleBadge}>
            <Ionicons 
              name={isInfluencer ? 'star' : 'briefcase'} 
              size={12} 
              color={COLORS.white} 
              style={{ marginRight: 4 }}
            />
            <Text style={styles.roleText}>{isInfluencer ? 'Influencer' : 'Brand Owner'}</Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── WHITE CONTENT CARD (70%) ── */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
            tintColor={COLORS.primary}
          />
        }
      >
        {/* Stats Row */}
        <View style={styles.statsRow}>
          {isInfluencer ? (
            <>
              <StatCard 
                icon="send" 
                color={COLORS.primary} 
                value={profile?.applicationsCount || 0} 
                label="Applied" 
                onPress={() => navigation.navigate('MyApplications')} 
              />
              <StatCard 
                icon="cash" 
                color={COLORS.accent} 
                value={`₹${profile?.earnings || 0}`} 
                label="Earnings" 
                onPress={() => navigation.navigate('Wallet')} 
              />
              <StatCard 
                icon="radio-button-on" 
                color={COLORS.warning} 
                value={sticks} 
                label="Sticks" 
                onPress={() => navigation.navigate('Wallet')} 
              />
            </>
          ) : (
            <>
              <StatCard 
                icon="megaphone" 
                color={COLORS.primary} 
                value={profile?.promotionsPosted || 0} 
                label="Campaigns" 
                onPress={() => navigation.navigate('Promotions')} 
              />
              <StatCard 
                icon="people" 
                color={COLORS.accent} 
                value={profile?.activeCollaborations || 0} 
                label="Collabs" 
              />
              <StatCard 
                icon="star" 
                color={COLORS.warning} 
                value={profile?.rating || '—'} 
                label="Rating" 
              />
            </>
          )}
        </View>

        {/* Bio */}
        {(profile?.about || profile?.description) && (
          <View style={styles.bioCard}>
            <View style={styles.bioHeader}>
              <Ionicons name="information-circle" size={16} color={COLORS.primary} />
              <Text style={styles.bioTitle}>About</Text>
            </View>
            <Text style={styles.bioText} numberOfLines={4}>
              {profile.about || profile.description}
            </Text>
          </View>
        )}

        {/* Menu Section */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.menuCard}>
          <MenuItem 
            icon="notifications" 
            label="Notifications" 
            accent={COLORS.secondary} 
            onPress={() => navigation.navigate('Notifications')} 
          />
          <MenuItem 
            icon="wallet" 
            label="Wallet" 
            accent={COLORS.warning} 
            onPress={() => navigation.navigate('Wallet')}
            value={isInfluencer ? `${sticks} sticks` : undefined} 
          />
          {isInfluencer && (
            <MenuItem 
              icon="briefcase" 
              label="My Applications" 
              accent={COLORS.accent} 
              onPress={() => navigation.navigate('MyApplications')} 
            />
          )}
          {!isInfluencer && (
            <MenuItem 
              icon="document-text" 
              label="Proposals" 
              accent={COLORS.accent} 
              onPress={() => navigation.navigate('Proposals')} 
            />
          )}
          <MenuItem 
            icon="document" 
            label="Agreements" 
            accent={COLORS.primary} 
            onPress={() => navigation.navigate('Agreements')} 
          />
          <MenuItem 
            icon="key-outline" 
            label="Change Password" 
            accent="#8B5CF6" 
            onPress={() => navigation.navigate('ChangePassword')} 
          />
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color={COLORS.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background },

  // Header (30%)
  header: { 
    paddingTop: 50, 
    paddingBottom: 32, 
    paddingHorizontal: 20,
  },
  editBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6,
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 12, 
    paddingVertical: 6,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: 16,
  },
  editBtnText: { 
    fontSize: SIZES.sm, 
    color: COLORS.white, 
    fontWeight: '600' 
  },

  avatarSection: { alignItems: 'center' },
  avatarWrap: { position: 'relative', marginBottom: 12 },
  avatar: {
    width: 88, 
    height: 88, 
    borderRadius: 44,
    borderWidth: 4, 
    borderColor: COLORS.white,
    ...SIZES.shadow.lg,
  },
  avatarPlaceholder: {
    width: 88, 
    height: 88, 
    borderRadius: 44,
    backgroundColor: COLORS.white,
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 4, 
    borderColor: COLORS.white,
    ...SIZES.shadow.lg,
  },
  avatarBrand: { borderRadius: 20 },
  avatarInitials: { 
    fontSize: 32, 
    fontWeight: '800', 
    color: COLORS.primary 
  },
  cameraBtn: {
    position: 'absolute', 
    bottom: 0, 
    right: 0,
    width: 28, 
    height: 28, 
    borderRadius: 14,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center', 
    justifyContent: 'center',
    borderWidth: 3, 
    borderColor: COLORS.white,
    ...SIZES.shadow.md,
  },

  displayName: { 
    fontSize: SIZES.xxl, 
    fontWeight: '700', 
    color: COLORS.white, 
    marginBottom: 4,
    textAlign: 'center',
  },
  username: { 
    fontSize: SIZES.md, 
    color: 'rgba(255,255,255,0.9)', 
    marginBottom: 10,
    fontWeight: '500',
  },

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: SIZES.radiusFull,
    paddingHorizontal: 14, 
    paddingVertical: 6,
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.4)',
  },
  roleText: { 
    fontSize: SIZES.sm, 
    color: COLORS.white, 
    fontWeight: '600' 
  },

  // Content (70%)
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -20,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16, 
    paddingTop: 24, 
    paddingBottom: 16, 
    gap: 12,
  },
  statCard: {
    flex: 1, 
    backgroundColor: COLORS.card,
    borderRadius: SIZES.radiusMd, 
    padding: 14, 
    alignItems: 'center',
    borderWidth: 1, 
    borderColor: COLORS.borderLight,
    ...SIZES.shadow.md,
  },
  statIconGradient: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8,
  },
  statValue: { 
    fontSize: SIZES.lg, 
    fontWeight: '700', 
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: { 
    fontSize: SIZES.xs, 
    color: COLORS.textSecondary, 
    fontWeight: '600',
    textAlign: 'center',
  },

  // Bio
  bioCard: {
    backgroundColor: COLORS.backgroundDark,
    marginHorizontal: 16, 
    marginBottom: 16,
    borderRadius: SIZES.radiusMd, 
    padding: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  bioHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  bioTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
  },
  bioText: { 
    fontSize: SIZES.sm + 1, 
    color: COLORS.textSecondary, 
    lineHeight: 20,
  },

  // Section
  sectionTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
    color: COLORS.text,
    marginHorizontal: 16,
    marginBottom: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // Menu
  menuCard: {
    backgroundColor: COLORS.card,
    marginHorizontal: 16, 
    marginBottom: 16,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1, 
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SIZES.shadow.sm,
  },
  menuItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12,
    paddingHorizontal: 16, 
    paddingVertical: 14,
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.borderLight,
  },
  menuIconGradient: { 
    width: 40, 
    height: 40, 
    borderRadius: 12, 
    alignItems: 'center', 
    justifyContent: 'center',
  },
  menuLabel: { 
    flex: 1, 
    fontSize: SIZES.md, 
    color: COLORS.text, 
    fontWeight: '600' 
  },
  menuValue: { 
    fontSize: SIZES.sm, 
    color: COLORS.textSecondary, 
    fontWeight: '500', 
    marginRight: 4 
  },

  // Logout
  logoutBtn: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8,
    marginHorizontal: 16, 
    marginBottom: 16,
    borderRadius: SIZES.radiusMd,
    borderWidth: 1.5, 
    borderColor: COLORS.errorLight,
    paddingVertical: 14,
    backgroundColor: COLORS.card,
    ...SIZES.shadow.sm,
  },
  logoutText: { 
    color: COLORS.error, 
    fontWeight: '600', 
    fontSize: SIZES.md 
  },
});

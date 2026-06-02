import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { notificationAPI } from '../../services/api';

const NOTIF_ICONS = {
  application: { icon: 'document-text-outline', color: '#3b82f6', bg: '#eff6ff' },
  promotion: { icon: 'megaphone-outline', color: COLORS.primary, bg: COLORS.primaryLight },
  agreement: { icon: 'document-outline', color: '#8b5cf6', bg: '#f5f3ff' },
  status: { icon: 'checkmark-circle-outline', color: COLORS.primary, bg: COLORS.primaryLight },
  submission: { icon: 'cloud-upload-outline', color: '#f59e0b', bg: '#fffbeb' },
  feedback: { icon: 'star-outline', color: '#f59e0b', bg: '#fffbeb' },
  system: { icon: 'information-circle-outline', color: COLORS.textSecondary, bg: COLORS.gray100 },
};

const NotificationsScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await notificationAPI.getAll();
      setNotifications(res.data?.notifications || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationAPI.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (e) {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (e) {}
  };

  const formatTime = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }) => {
    const config = NOTIF_ICONS[item.type] || NOTIF_ICONS.system;
    return (
      <TouchableOpacity
        style={[styles.notifItem, !item.read && styles.notifUnread]}
        onPress={() => handleMarkRead(item._id)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        <View style={styles.notifContent}>
          {item.title && <Text style={styles.notifTitle}>{item.title}</Text>}
          <Text style={styles.notifMessage}>{item.message}</Text>
          <Text style={styles.notifTime}>{formatTime(item.createdAt)}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAll}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={56} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtext}>You're all caught up!</Text>
            </View>
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    gap: SPACING.md,
  },
  headerTitle: { flex: 1, fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  markAll: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  notifUnread: { backgroundColor: '#f0fdf4' },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  notifMessage: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, lineHeight: 20 },
  notifTime: { fontSize: FONTS.sizes.xs, color: COLORS.textLight, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginTop: 6,
  },
  separator: { height: 1, backgroundColor: COLORS.borderLight },
  empty: { alignItems: 'center', paddingVertical: 80, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary },
});

export default NotificationsScreen;

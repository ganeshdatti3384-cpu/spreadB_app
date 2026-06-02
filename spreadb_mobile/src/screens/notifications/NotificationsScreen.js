import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { getNotifications, markAllRead, markAsRead } from '../../api/notifications';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const TYPE_CONFIG = {
  promotion:   { icon: 'briefcase',          color: '#3B82F6', bg: '#EFF6FF' },
  campaign:    { icon: 'briefcase',          color: '#3B82F6', bg: '#EFF6FF' },
  application: { icon: 'checkmark-circle',   color: COLORS.primary, bg: COLORS.primaryLight },
  agreement:   { icon: 'document-text',      color: '#F59E0B', bg: '#FFFBEB' },
  message:     { icon: 'chatbubble',         color: '#8B5CF6', bg: '#F5F3FF' },
  system:      { icon: 'notifications',      color: COLORS.textSecondary, bg: COLORS.background },
  payment:     { icon: 'wallet',             color: '#059669', bg: '#D1FAE5' },
};

function getTypeConfig(type) {
  return TYPE_CONFIG[type?.toLowerCase()] || TYPE_CONFIG.system;
}

function NotificationItem({ item, onPress }) {
  const cfg = getTypeConfig(item.type);
  const isUnread = !item.isRead && !item.read;

  return (
    <TouchableOpacity
      style={[styles.notifItem, isUnread && styles.notifItemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={0.85}
    >
      {/* Icon */}
      <View style={[styles.notifIconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>

      {/* Content */}
      <View style={styles.notifContent}>
        <View style={styles.notifTop}>
          <Text
            style={[styles.notifTitle, isUnread && styles.notifTitleBold]}
            numberOfLines={1}
          >
            {item.title || 'Notification'}
          </Text>
          {isUnread && <View style={styles.unreadDot} />}
        </View>
        <Text style={styles.notifMessage} numberOfLines={2}>
          {item.message || item.body || ''}
        </Text>
        <Text style={styles.notifTime}>{timeAgo(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen({ navigation }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications();
      setNotifications(res.data?.notifications || []);
    } catch (e) {
      console.log('Notifications load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, read: true })));
    } catch (e) {
      Alert.alert('Error', 'Failed to mark all as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const handlePress = async (item) => {
    if (!item.isRead && !item.read) {
      try {
        await markAsRead(item._id);
        setNotifications(prev =>
          prev.map(n => n._id === item._id ? { ...n, isRead: true, read: true } : n)
        );
      } catch (e) { console.log('Mark read error:', e); }
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead && !n.read).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          <Text style={styles.headerSubtitle}>{unreadCount} unread</Text>
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} activeOpacity={0.7}>
            {markingAll
              ? <ActivityIndicator size="small" color={COLORS.primary} />
              : <Text style={styles.markAllText}>Mark all read</Text>
            }
          </TouchableOpacity>
        ) : (
          <View style={{ width: 80 }} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={COLORS.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="notifications-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>You're all caught up!</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1, paddingHorizontal: 12 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: COLORS.dark },
  headerSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  markAllText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  list: { paddingBottom: 40 },
  separator: { height: 1, backgroundColor: COLORS.borderLight },

  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
  },
  notifItemUnread: { backgroundColor: COLORS.primaryLight + '33' },
  notifIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  notifContent: { flex: 1 },
  notifTop: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4,
  },
  notifTitle: { fontSize: 14, fontWeight: '500', color: COLORS.text, flex: 1 },
  notifTitleBold: { fontWeight: '700', color: COLORS.dark },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: COLORS.primary, flexShrink: 0,
  },
  notifMessage: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 19, marginBottom: 4 },
  notifTime: { fontSize: 11, color: COLORS.textLight },

  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.background,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 15, color: COLORS.textSecondary, textAlign: 'center' },
});

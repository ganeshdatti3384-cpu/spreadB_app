import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  StatusBar, Image, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../../constants/theme';
import { messageAPI, BASE_URL } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const MessagesScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchConversations = async () => {
    try {
      const res = await messageAPI.getConversations();
      setConversations(res.data?.conversations || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchConversations(); }, []);

  const getOtherParticipant = (conv) => {
    return conv.participants?.find((p) => p.userId?._id !== user?.userId) || conv.participants?.[0];
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now - date;
    if (diff < 86400000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderItem = ({ item }) => {
    const other = getOtherParticipant(item);
    const unread = item.metadata?.unreadCount || 0;

    return (
      <TouchableOpacity
        style={styles.convItem}
        onPress={() => navigation.navigate('ChatDetail', { conversationId: item._id, other })}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={22} color={COLORS.gray400} />
          </View>
          {item.isActive && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.convInfo}>
          <View style={styles.convTop}>
            <Text style={[styles.convName, unread > 0 && styles.convNameUnread]}>
              {other?.userId?.firstName || 'User'} {other?.userId?.lastName || ''}
            </Text>
            <Text style={styles.convTime}>{formatTime(item.lastMessageAt)}</Text>
          </View>
          <View style={styles.convBottom}>
            <Text
              style={[styles.lastMessage, unread > 0 && styles.lastMessageUnread]}
              numberOfLines={1}
            >
              {item.lastMessage?.content || 'No messages yet'}
            </Text>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 9 ? '9+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
        <TouchableOpacity onPress={() => navigation.navigate('NewMessage')}>
          <Ionicons name="create-outline" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchConversations(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={56} color={COLORS.gray300} />
              <Text style={styles.emptyTitle}>No messages yet</Text>
              <Text style={styles.emptySubtext}>
                Start a conversation with a brand or influencer
              </Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingTop: 56,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  headerTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  convItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    gap: SPACING.md,
  },
  avatarContainer: { position: 'relative' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  convName: { fontSize: FONTS.sizes.md, fontWeight: '500', color: COLORS.text },
  convNameUnread: { fontWeight: '700' },
  convTime: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary },
  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1 },
  lastMessageUnread: { color: COLORS.text, fontWeight: '500' },
  unreadBadge: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  unreadText: { fontSize: 11, color: COLORS.white, fontWeight: '700' },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 84 },
  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: SPACING.xl, gap: SPACING.md },
  emptyTitle: { fontSize: FONTS.sizes.xl, fontWeight: '700', color: COLORS.text },
  emptySubtext: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, textAlign: 'center' },
});

export default MessagesScreen;

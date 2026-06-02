import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getConversations } from '../../api/messages';
import { getParticipantNameFromConversation, getOtherParticipant } from '../../utils/nameExtractor';
import { deriveSharedKey, decryptMessage } from '../../utils/e2ee';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function Avatar({ name, size = 48 }) {
  const initials = name ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() : 'U';
  const colors = [
    ['#14A800', '#0D7A00'],
    ['#1F57C3', '#1A3A8F'],
    ['#7C3AED', '#5B21B6'],
    ['#F59E0B', '#D97706'],
    ['#EF4444', '#DC2626'],
  ];
  const colorPair = colors[initials.charCodeAt(0) % colors.length];
  return (
    <LinearGradient
      colors={colorPair}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
    </LinearGradient>
  );
}

function ConversationItem({ item, onPress, currentUserId }) {
  // Use utility function to extract participant name
  const otherName = getParticipantNameFromConversation(item, currentUserId);
  const otherParticipant = getOtherParticipant(item, currentUserId);
  const otherId = otherParticipant?.userId?._id || otherParticipant?.userId;
  
  let lastMsg = item.lastMessage?.content || '';
  if (item.lastMessage?.messageType === 'text' && lastMsg && otherId && currentUserId) {
    const key = deriveSharedKey(currentUserId, otherId);
    lastMsg = decryptMessage(lastMsg, key);
  } else if (item.lastMessage?.messageType === 'image') {
    lastMsg = '📷 Photo';
  }
  
  const time = timeAgo(item.lastMessage?.createdAt || item.updatedAt);
  const unread = item.unreadCount || 0;

  return (
    <TouchableOpacity
      style={styles.convItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <Avatar name={otherName} />
        {unread > 0 && <View style={styles.onlineDot} />}
      </View>

      {/* Content */}
      <View style={styles.convInfo}>
        <View style={styles.convTop}>
          <Text style={[styles.convName, unread > 0 && styles.convNameBold]} numberOfLines={1}>
            {otherName}
          </Text>
          <Text style={[styles.convTime, unread > 0 && styles.convTimePrimary]}>{time}</Text>
        </View>
        <View style={styles.convBottom}>
          <Text style={[styles.convPreview, unread > 0 && styles.convPreviewBold]} numberOfLines={1}>
            {lastMsg || 'Start the conversation'}
          </Text>
          {unread > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>{unread > 9 ? '9+' : unread}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function MessagesScreen({ navigation }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await getConversations();
      setConversations(res.data?.conversations || []);
    } catch (e) {
      console.log('Conversations load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = search.trim()
    ? conversations.filter(c => {
        const name = getParticipantNameFromConversation(c, user?._id);
        return name.toLowerCase().includes(search.toLowerCase()) ||
          c.campaignTitle?.toLowerCase().includes(search.toLowerCase());
      })
    : conversations;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>

        {/* Search */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={COLORS.textLight} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search conversations..."
            placeholderTextColor={COLORS.placeholder}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={COLORS.textLight} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <ConversationItem
              item={item}
              currentUserId={user?._id}
              onPress={() => {
                const participantName = getParticipantNameFromConversation(item, user?._id);
                
                navigation.navigate('Chat', {
                  conversationId: item._id,
                  participantName,
                  campaignName: item.campaignTitle || '',
                });
              }}
            />
          )}
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
                <Ionicons name="chatbubbles-outline" size={32} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? 'No results for your search'
                  : 'Messages appear here once a campaign application is accepted'}
              </Text>
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
    backgroundColor: COLORS.white,
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.dark, marginBottom: 16 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.background, borderRadius: SIZES.radius,
    paddingHorizontal: 14, height: 44,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  searchInput: { flex: 1, fontSize: 14, color: COLORS.text },

  list: { paddingBottom: 40 },
  separator: { height: 1, backgroundColor: COLORS.borderLight, marginLeft: 76 },

  convItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  avatarWrap: { position: 'relative' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontWeight: '700', color: '#fff' },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 11, height: 11, borderRadius: 6,
    backgroundColor: COLORS.primary, borderWidth: 2, borderColor: COLORS.white,
  },
  convInfo: { flex: 1 },
  convTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  convName: { fontSize: 14, fontWeight: '600', color: COLORS.text, flex: 1, marginRight: 8 },
  convNameBold: { fontWeight: '700', color: COLORS.dark },
  convTime: { fontSize: 11, color: COLORS.textLight, flexShrink: 0 },
  convTimePrimary: { color: COLORS.primary, fontWeight: '600' },
  convBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  convPreview: { fontSize: 13, color: COLORS.textSecondary, flex: 1, marginRight: 8 },
  convPreviewBold: { color: COLORS.text, fontWeight: '500' },
  unreadBadge: {
    backgroundColor: COLORS.primary, borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  empty: { alignItems: 'center', paddingVertical: 80, paddingHorizontal: 32 },
  emptyIconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 6 },
  emptySubtitle: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
});

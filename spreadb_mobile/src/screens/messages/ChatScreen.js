import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMessages, sendMessage } from '../../api/messages';

function formatTime(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function groupMessagesByDate(messages) {
  const groups = [];
  let currentDate = null;
  messages.forEach((msg) => {
    const msgDate = msg.createdAt ? new Date(msg.createdAt).toDateString() : null;
    if (msgDate !== currentDate) {
      groups.push({ type: 'date', id: `date-${msgDate}`, label: formatDate(msg.createdAt) });
      currentDate = msgDate;
    }
    groups.push({ type: 'message', ...msg });
  });
  return groups;
}

export default function ChatScreen({ route, navigation }) {
  const { conversationId, participantName, campaignName } = route.params || {};
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(async (silent = false) => {
    try {
      const res = await getMessages(conversationId);
      const msgs = res.data?.messages || [];
      setMessages(msgs);
      if (!silent) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (e) {
      console.log('Messages load error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleSend = async () => {
    const text = inputText.trim();
    
    // Validation
    if (!text || sending) return;
    
    if (text.length < 1) {
      Alert.alert('Error', 'Message cannot be empty');
      return;
    }
    
    if (text.length > 1000) {
      Alert.alert('Error', 'Message is too long (max 1000 characters)');
      return;
    }
    
    // Basic XSS prevention - check for script tags
    const dangerousPatterns = /<script|<iframe|javascript:/gi;
    if (dangerousPatterns.test(text)) {
      Alert.alert('Error', 'Message contains invalid content');
      return;
    }

    const optimistic = {
      _id: `temp-${Date.now()}`,
      content: text,
      sender: user?._id,
      senderId: user?._id,
      createdAt: new Date().toISOString(),
      pending: true,
    };

    setMessages((prev) => [...prev, optimistic]);
    setInputText('');
    setSending(true);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      await sendMessage({ 
        conversationId, 
        content: text,
        messageType: 'text'
      });
      await load(true);
    } catch (e) {
      console.log('Send message error:', e.response?.data || e.message);
      setMessages((prev) => prev.filter((m) => m._id !== optimistic._id));
      setInputText(text);
      Alert.alert('Error', e.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const grouped = groupMessagesByDate(messages);

  const renderItem = ({ item, index }) => {
    if (item.type === 'date') {
      return (
        <View style={styles.dateSeparator}>
          <View style={styles.dateLine} />
          <View style={styles.dateChip}>
            <Text style={styles.dateLabel}>{item.label}</Text>
          </View>
          <View style={styles.dateLine} />
        </View>
      );
    }

    // FIX: Convert IDs to strings for proper comparison
    const currentUserId = String(user?._id || '');
    const messageSenderId = String(item.sender || item.senderId || '');
    const isMine = currentUserId && messageSenderId && currentUserId === messageSenderId;
    
    // Debug logging (remove in production)
    if (index === 0 || index === 1) {
      console.log('Message rendering:', {
        messageId: item._id,
        currentUserId,
        messageSenderId,
        isMine,
        content: item.content?.substring(0, 20)
      });
    }
    
    // Check if we should show name (for other person only, when sender changes)
    const prevItem = index > 0 ? grouped[index - 1] : null;
    const prevSenderId = String(prevItem?.sender || prevItem?.senderId || '');
    const prevIsMine = prevItem?.type === 'message' && prevSenderId === currentUserId;
    const showName = !isMine && (!prevItem || prevItem.type === 'date' || prevIsMine);
    
    const senderName = isMine 
      ? (user?.firstName || user?.email?.split('@')[0] || 'You')
      : participantName || 'User';

    return (
      <View style={styles.messageWrapper}>
        {/* Name row for other person */}
        {showName && (
          <View style={styles.nameRow}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>{senderName[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.nameTime}>{formatTime(item.createdAt)}</Text>
          </View>
        )}
        
        {/* Message bubble */}
        <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
          {/* Spacer for alignment when name not shown */}
          {!isMine && !showName && <View style={styles.avatarSpacer} />}
          
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            item.pending && styles.bubblePending,
          ]}>
            <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
              {item.content}
            </Text>
            {isMine && (
              <View style={styles.bubbleFooter}>
                <Text style={styles.bubbleTime}>{formatTime(item.createdAt)}</Text>
                <Ionicons
                  name={item.pending ? 'time-outline' : 'checkmark-done'}
                  size={14}
                  color="rgba(255,255,255,0.8)"
                  style={{ marginLeft: 4 }}
                />
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <View style={styles.headerAvatar}>
          <Text style={styles.headerAvatarText}>
            {(participantName || 'C')
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {participantName || 'Chat'}
          </Text>
          {campaignName ? (
            <Text style={styles.headerCampaign} numberOfLines={1}>{campaignName}</Text>
          ) : (
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          )}
        </View>

        <View style={{ width: 36 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={grouped}
          keyExtractor={(item) => item._id || item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Ionicons name="chatbubbles-outline" size={48} color={COLORS.border} />
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>Start the conversation below</Text>
            </View>
          }
        />
      )}

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => Alert.alert('Coming Soon', 'File attachments will be available soon.')}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor={COLORS.placeholder}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={handleSend}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!inputText.trim() || sending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!inputText.trim() || sending}
          activeOpacity={0.8}
        >
          {sending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Ionicons name="send" size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE5DD' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  headerCampaign: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  onlineText: { fontSize: 11, color: COLORS.textSecondary },

  messageList: { paddingHorizontal: 12, paddingVertical: 16, paddingBottom: 8 },

  dateSeparator: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.1)' },
  dateChip: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  dateLabel: { 
    fontSize: 12, 
    color: COLORS.textSecondary, 
    fontWeight: '600',
  },

  messageWrapper: {
    marginBottom: 8,
  },

  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    marginLeft: 4,
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  smallAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.secondary,
  },
  senderName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  nameTime: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 2,
  },
  bubbleRowMine: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },

  avatarSpacer: {
    width: 32,
  },

  bubble: {
    maxWidth: '75%',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 0,
    alignSelf: 'flex-start',
  },
  bubbleMine: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 0,
    alignSelf: 'flex-end',
  },
  bubblePending: { opacity: 0.7 },

  bubbleText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 20,
  },
  bubbleTextMine: {
    color: COLORS.text,
  },

  bubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  bubbleTime: {
    fontSize: 11,
    color: COLORS.textLight,
  },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyChatText: { fontSize: 15, fontWeight: '600', color: COLORS.textSecondary, marginTop: 12 },
  emptyChatSubtext: { fontSize: 13, color: COLORS.textLight, marginTop: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.border,
    paddingBottom: Platform.OS === 'ios' ? 28 : 10,
  },
  attachBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1, minHeight: 40, maxHeight: 100,
    backgroundColor: COLORS.white, borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },
});

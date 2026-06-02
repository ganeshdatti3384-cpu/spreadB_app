import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Image, Modal, ScrollView, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMessages, sendMessage, sendFileMessage, editMessage, deleteMessage } from '../../api/messages';
import { BASE_URL } from '../../api/config';
import { deriveSharedKey, encryptMessage, decryptMessage } from '../../utils/e2ee';

const { width, height } = Dimensions.get('window');

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

function formatLastSeen(lastSeenStr) {
  if (!lastSeenStr) return 'Offline';
  const date = new Date(lastSeenStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Online';
  
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  
  if (date.toDateString() === today.toDateString()) {
    return `last seen today at ${timeStr}`;
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return `last seen yesterday at ${timeStr}`;
  }
  return `last seen on ${date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} at ${timeStr}`;
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
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  
  // Custom states for WhatsApp features
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Selection states
  const [selectedMessages, setSelectedMessages] = useState([]);

  const flatListRef = useRef(null);
  const pollRef = useRef(null);
  const sharedKeyRef = useRef('');

  const getImageUrl = (fileUrl) => {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http://') || fileUrl.startsWith('https://') || fileUrl.startsWith('file://')) {
      return fileUrl;
    }
    return `${BASE_URL}${fileUrl}`;
  };

  const load = useCallback(async (silent = false) => {
    try {
      const res = await getMessages(conversationId);
      const msgs = res.data?.messages || [];
      const conv = res.data?.conversation || null;
      
      if (conv) {
        setConversation(conv);
      }

      // 🔒 E2EE: Derive key if not already set
      let key = sharedKeyRef.current;
      if (!key && conv && user?._id) {
        const otherParticipant = conv?.participants?.find(
          (p) => String(p.userId?._id || p.userId) !== String(user?._id)
        );
        const otherId = otherParticipant?.userId?._id || otherParticipant?.userId;
        if (otherId) {
          key = deriveSharedKey(user._id, otherId);
          sharedKeyRef.current = key;
        }
      }

      // 🔒 E2EE: Decrypt text messages
      const decryptedMsgs = msgs.map((m) => {
        if (m.messageType === 'text' && m.content) {
          return {
            ...m,
            content: decryptMessage(m.content, key),
          };
        }
        return m;
      });

      setMessages(decryptedMsgs);
      
      if (!silent) {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
      }
    } catch (e) {
      console.log('Messages load error:', e);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [conversationId, user]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(() => load(true), 5000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text || sending) return;
    
    if (text.length > 1000) {
      Alert.alert('Error', 'Message is too long (max 1000 characters)');
      return;
    }
    
    const dangerousPatterns = /<script|<iframe|javascript:/gi;
    if (dangerousPatterns.test(text)) {
      Alert.alert('Error', 'Message contains invalid content');
      return;
    }

    let key = sharedKeyRef.current;
    if (!key && conversation && user?._id) {
      const otherParticipant = conversation?.participants?.find(
        (p) => String(p.userId?._id || p.userId) !== String(user?._id)
      );
      const otherId = otherParticipant?.userId?._id || otherParticipant?.userId;
      if (otherId) {
        key = deriveSharedKey(user._id, otherId);
        sharedKeyRef.current = key;
      }
    }
    
    // 🔒 E2EE: Encrypt text content
    const encryptedText = encryptMessage(text, key);

    if (editingMessage) {
      setSending(true);
      const targetId = editingMessage._id;
      const originalText = editingMessage.content;
      
      // Optimistic edit update
      setMessages((prev) =>
        prev.map((m) => (m._id === targetId ? { ...m, content: text, isEdited: true, pending: true } : m))
      );
      setEditingMessage(null);
      setInputText('');

      try {
        await editMessage(targetId, { content: encryptedText });
        await load(true);
      } catch (e) {
        console.log('Edit message error:', e.response?.data || e.message);
        setMessages((prev) =>
          prev.map((m) => (m._id === targetId ? { ...m, content: originalText, isEdited: false, pending: false } : m))
        );
        Alert.alert('Error', 'Failed to edit message. Please try again.');
      } finally {
        setSending(false);
      }
      return;
    }

    const optimistic = {
      _id: `temp-${Date.now()}`,
      content: text,
      messageType: 'text',
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
        content: encryptedText, // Send encrypted content
        messageType: 'text',
        relatedPromotion: conversation?.relatedPromotion?._id
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

  const handleSendFile = async (imageAsset) => {
    setAttachModalVisible(false);
    setSending(true);
    
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      messageType: 'image',
      fileUrl: imageAsset.uri,
      sender: user?._id,
      senderId: user?._id,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'image');
      if (conversation?.relatedPromotion?._id) {
        formData.append('relatedPromotion', conversation.relatedPromotion._id);
      }
      
      const uri = imageAsset.uri;
      const uriParts = uri.split('.');
      const fileType = uriParts[uriParts.length - 1] || 'jpg';
      
      formData.append('file', {
        uri: uri,
        name: `photo-${Date.now()}.${fileType}`,
        type: `image/${fileType === 'png' ? 'png' : 'jpeg'}`,
      });
      
      await sendFileMessage(formData);
      await load(true);
    } catch (e) {
      console.log('Send file error:', e.response?.data || e.message);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert('Error', 'Failed to upload image. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSendFile(result.assets[0]);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your camera to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleSendFile(result.assets[0]);
    }
  };

  // Selection toggle logic
  const isSelected = (id) => selectedMessages.some((m) => m._id === id);

  const toggleSelectMessage = (item) => {
    if (isSelected(item._id)) {
      setSelectedMessages((prev) => prev.filter((m) => m._id !== item._id));
    } else {
      setSelectedMessages((prev) => [...prev, item]);
    }
  };

  const handlePressMessage = (item) => {
    if (selectedMessages.length > 0) {
      toggleSelectMessage(item);
    } else if (item.messageType === 'image') {
      setSelectedImageUri(getImageUrl(item.fileUrl));
    }
  };

  const handleLongPressMessage = (item) => {
    toggleSelectMessage(item);
  };

  const clearSelection = () => {
    setSelectedMessages([]);
  };

  // Header Actions
  const handleShowInfo = () => {
    if (selectedMessages.length === 1) {
      setSelectedMessage(selectedMessages[0]);
      setInfoModalVisible(true);
      clearSelection();
    }
  };

  const handleCopySelected = async () => {
    const textMsgs = selectedMessages.filter((m) => m.messageType === 'text');
    if (textMsgs.length === 0) return;
    const joinedText = textMsgs.map((m) => m.content).join('\n');
    await Clipboard.setStringAsync(joinedText);
    clearSelection();
    Alert.alert('Copied', `${textMsgs.length} message(s) copied.`);
  };

  const handleEditSelected = () => {
    if (selectedMessages.length === 1) {
      const msg = selectedMessages[0];
      setEditingMessage(msg);
      setInputText(msg.content);
      clearSelection();
    }
  };

  const handleDeleteSelected = () => {
    const count = selectedMessages.length;
    Alert.alert(
      'Delete Messages',
      `Are you sure you want to delete ${count} selected message(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const idsToDelete = selectedMessages.map((m) => m._id);
              setMessages((prev) => prev.filter((m) => !idsToDelete.includes(m._id)));
              clearSelection();

              await Promise.all(idsToDelete.map((id) => deleteMessage(id)));
              await load(true);
            } catch (e) {
              console.log('Delete selected error:', e);
              Alert.alert('Error', 'Failed to delete some messages.');
              await load();
            }
          }
        }
      ]
    );
  };

  const otherParticipant = conversation?.participants?.find(
    (p) => String(p.userId?._id || p.userId) !== String(user?._id)
  );
  
  const lastSeenText = formatLastSeen(otherParticipant?.userId?.lastSeen || otherParticipant?.lastSeen);
  const grouped = groupMessagesByDate(messages);
  const hasCampaign = !!conversation?.relatedPromotion;

  // Selection Action Visibility Helpers
  const canCopy = selectedMessages.some((m) => m.messageType === 'text');
  
  const canEdit = selectedMessages.length === 1 && 
                  selectedMessages[0].messageType === 'text' && 
                  String(selectedMessages[0].sender || selectedMessages[0].senderId) === String(user?._id) && 
                  !selectedMessages[0].pending;

  const canDelete = selectedMessages.length > 0 && 
                    selectedMessages.every((m) => String(m.sender || m.senderId) === String(user?._id) && !m.pending);

  // E2EE Lock Banner Renders at Top
  const renderListHeader = () => (
    <View style={styles.e2eeBanner}>
      <Ionicons name="lock-closed" size={11} color="#B45309" style={{ marginRight: 6 }} />
      <Text style={styles.e2eeText}>
        Messages are end-to-end encrypted. No one outside of this chat, not even SpreadB, can read them.
      </Text>
    </View>
  );

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

    const currentUserId = String(user?._id || '');
    const messageSenderId = String(item.sender || item.senderId || '');
    const isMine = currentUserId && messageSenderId && currentUserId === messageSenderId;
    const isMsgSelected = isSelected(item._id);
    
    // Check if we should show name
    const prevItem = index > 0 ? grouped[index - 1] : null;
    const prevSenderId = String(prevItem?.sender || prevItem?.senderId || '');
    const prevIsMine = prevItem?.type === 'message' && prevSenderId === currentUserId;
    const showName = !isMine && (!prevItem || prevItem.type === 'date' || prevIsMine);
    
    const senderName = isMine 
      ? (user?.firstName || user?.email?.split('@')[0] || 'You')
      : participantName || 'User';

    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => handlePressMessage(item)}
        onLongPress={() => handleLongPressMessage(item)}
        style={[
          styles.messageWrapper,
          isMsgSelected && styles.messageWrapperSelected
        ]}
      >
        {showName && (
          <View style={styles.nameRow}>
            <View style={styles.smallAvatar}>
              <Text style={styles.smallAvatarText}>{senderName[0].toUpperCase()}</Text>
            </View>
            <Text style={styles.senderName}>{senderName}</Text>
            <Text style={styles.nameTime}>{formatTime(item.createdAt)}</Text>
          </View>
        )}
        
        <View style={[styles.bubbleRow, isMine && styles.bubbleRowMine]}>
          {!isMine && !showName && <View style={styles.avatarSpacer} />}
          
          <View style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleOther,
            item.pending && styles.bubblePending,
            item.messageType === 'image' && styles.bubbleImage,
          ]}>
            {item.messageType === 'image' ? (
              <Image
                source={{ uri: getImageUrl(item.fileUrl) }}
                style={styles.messageImage}
                resizeMode="cover"
              />
            ) : (
              <Text style={[styles.bubbleText, isMine && styles.bubbleTextMine]}>
                {item.content}
              </Text>
            )}
            
            <View style={styles.bubbleFooter}>
              {item.isEdited && (
                <Text style={[styles.editedLabel, isMine && styles.editedLabelMine]}>
                  edited • 
                </Text>
              )}
              <Text style={[styles.bubbleTime, isMine && styles.bubbleTimeMine]}>
                {formatTime(item.createdAt)}
              </Text>
              {isMine && (
                <Ionicons
                  name={item.pending ? 'time-outline' : (item.isRead ? 'checkmark-done' : 'checkmark')}
                  size={14}
                  color={item.isRead ? '#3B82F6' : COLORS.textLight}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      {/* ── HEADER (SELECTION OR NORMAL) ── */}
      <LinearGradient
        colors={['#0A2010', '#0D3015', '#0A1628']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.headerContainer}
      >
        {selectedMessages.length > 0 ? (
          /* ── SELECTION HEADER ── */
          <View style={styles.header}>
            <TouchableOpacity onPress={clearSelection} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            
            <Text style={styles.selectionCount}>{selectedMessages.length} selected</Text>
            
            <View style={styles.selectionActions}>
              {selectedMessages.length === 1 && (
                <TouchableOpacity onPress={handleShowInfo} style={styles.actionIconButton}>
                  <Ionicons name="information-circle-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              
              {canCopy && (
                <TouchableOpacity onPress={handleCopySelected} style={styles.actionIconButton}>
                  <Ionicons name="copy-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              
              {canEdit && (
                <TouchableOpacity onPress={handleEditSelected} style={styles.actionIconButton}>
                  <Ionicons name="create-outline" size={22} color="#FFFFFF" />
                </TouchableOpacity>
              )}
              
              {canDelete && (
                <TouchableOpacity onPress={handleDeleteSelected} style={styles.actionIconButton}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          /* ── NORMAL HEADER ── */
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
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
              <View style={styles.onlineRow}>
                {lastSeenText === 'Online' && <View style={styles.onlineDot} />}
                <Text style={styles.onlineText}>{lastSeenText}</Text>
              </View>
            </View>

            {hasCampaign && (
              <TouchableOpacity
                style={[styles.toggleDetailsBtn, detailsExpanded && styles.toggleDetailsActive]}
                onPress={() => setDetailsExpanded(!detailsExpanded)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={detailsExpanded ? 'chevron-up-circle-outline' : 'chevron-down-circle-outline'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            )}
          </View>
        )}
      </LinearGradient>

      {/* ── COLLAPSIBLE CAMPAIGN DETAILS ── */}
      {hasCampaign && conversation.relatedPromotion && selectedMessages.length === 0 && (
        <View style={styles.detailsOuter}>
          {detailsExpanded ? (
            <View style={styles.detailsExpandedCard}>
              <Text style={styles.detailsTitle}>{conversation.relatedPromotion.title}</Text>
              
              <View style={styles.detailsMetaGrid}>
                <View style={styles.detailsMetaItem}>
                  <Ionicons name="wallet-outline" size={13} color={COLORS.primary} />
                  <Text style={styles.detailsMetaVal}>₹{conversation.relatedPromotion.budget?.toLocaleString()}</Text>
                </View>
                <View style={styles.detailsMetaItem}>
                  <Ionicons name="time-outline" size={13} color="#D97706" />
                  <Text style={styles.detailsMetaVal}>{conversation.relatedPromotion.duration || 'Flexible'}</Text>
                </View>
                {conversation.relatedPromotion.status && (
                  <View style={styles.detailsMetaItem}>
                    <Ionicons name="radio-button-on" size={13} color={COLORS.primary} />
                    <Text style={styles.detailsMetaVal}>{conversation.relatedPromotion.status}</Text>
                  </View>
                )}
              </View>

              {conversation.relatedPromotion.description && (
                <Text style={styles.detailsDesc} numberOfLines={3}>
                  {conversation.relatedPromotion.description}
                </Text>
              )}

              <View style={styles.detailsActions}>
                {isInfluencer ? (
                  <TouchableOpacity
                    style={styles.detailsActionBtn}
                    onPress={() => navigation.navigate('Agreements')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="document-text-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.detailsActionText}>View Agreements</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.detailsActionBtn}
                    onPress={() => navigation.navigate('Proposals')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="people-outline" size={14} color="#FFFFFF" />
                    <Text style={styles.detailsActionText}>Review Proposals</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.detailsMiniBanner}
              onPress={() => setDetailsExpanded(true)}
              activeOpacity={0.9}
            >
              <Ionicons name="megaphone-outline" size={14} color={COLORS.primary} />
              <Text style={styles.detailsMiniText} numberOfLines={1}>
                Campaign: {conversation.relatedPromotion.title} • ₹{conversation.relatedPromotion.budget?.toLocaleString()}
              </Text>
              <Ionicons name="chevron-down" size={12} color={COLORS.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── MESSAGES LIST ── */}
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
          ListHeaderComponent={renderListHeader}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyChatIconWrap}>
                <Ionicons name="chatbubbles-outline" size={36} color={COLORS.textLight} />
              </View>
              <Text style={styles.emptyChatText}>No messages yet</Text>
              <Text style={styles.emptyChatSubtext}>Start the conversation below</Text>
            </View>
          }
        />
      )}

      {/* ── EDITING PREVIEW BANNER ── */}
      {editingMessage && (
        <View style={styles.editingBanner}>
          <View style={styles.editingBannerContent}>
            <View style={styles.editingLeftBorder} />
            <View style={styles.editingTextCol}>
              <Text style={styles.editingBannerTitle}>Editing Message</Text>
              <Text style={styles.editingBannerText} numberOfLines={1}>
                {editingMessage.content}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editingCancelBtn}
            onPress={() => {
              setEditingMessage(null);
              setInputText('');
            }}
          >
            <Ionicons name="close-circle" size={22} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── INPUT BAR ── */}
      <View style={styles.inputBar}>
        <TouchableOpacity
          style={styles.attachBtn}
          onPress={() => setAttachModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={24} color={COLORS.textSecondary} />
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
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
            <Ionicons name={editingMessage ? "checkmark" : "send"} size={18} color={COLORS.white} />
          )}
        </TouchableOpacity>
      </View>

      {/* ── MESSAGE INFO MODAL ── */}
      <Modal
        visible={infoModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.infoModalOverlay}>
          <View style={styles.infoModalCard}>
            <View style={styles.infoModalHeader}>
              <Text style={styles.infoModalTitle}>Message Info</Text>
              <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.text} />
              </TouchableOpacity>
            </View>

            {selectedMessage && (
              <ScrollView showsVerticalScrollIndicator={false}>
                {/* Preview bubble */}
                <View style={styles.infoPreviewContainer}>
                  <View style={[
                    styles.bubble, 
                    selectedMessage.senderId === user?._id ? styles.bubbleMine : styles.bubbleOther,
                    selectedMessage.messageType === 'image' && styles.bubbleImage,
                    { maxWidth: '100%', width: '100%', marginBottom: 16 }
                  ]}>
                    {selectedMessage.messageType === 'image' ? (
                      <Image
                        source={{ uri: getImageUrl(selectedMessage.fileUrl) }}
                        style={[styles.messageImage, { width: '100%', height: 140 }]}
                        resizeMode="cover"
                      />
                    ) : (
                      <Text style={[styles.bubbleText, selectedMessage.senderId === user?._id && styles.bubbleTextMine]}>
                        {selectedMessage.content}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Details list */}
                <View style={styles.infoDetailList}>
                  <View style={styles.infoDetailRow}>
                    <Ionicons name="send" size={16} color={COLORS.textSecondary} />
                    <View style={styles.infoDetailText}>
                      <Text style={styles.infoDetailLabel}>Sent</Text>
                      <Text style={styles.infoDetailVal}>
                        {selectedMessage.createdAt ? new Date(selectedMessage.createdAt).toLocaleString('en-IN') : 'Unknown'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoDetailRow}>
                    <Ionicons name={selectedMessage.isRead ? "checkmark-done" : "checkmark"} size={16} color={selectedMessage.isRead ? '#3B82F6' : COLORS.textLight} />
                    <View style={styles.infoDetailText}>
                      <Text style={styles.infoDetailLabel}>Read Status</Text>
                      <Text style={styles.infoDetailVal}>
                        {selectedMessage.isRead 
                          ? `Read on ${selectedMessage.readAt ? new Date(selectedMessage.readAt).toLocaleString('en-IN') : 'recently'}`
                          : 'Delivered (Unread)'
                        }
                      </Text>
                    </View>
                  </View>

                  <View style={styles.infoDetailRow}>
                    <Ionicons name="document-text-outline" size={16} color={COLORS.textSecondary} />
                    <View style={styles.infoDetailText}>
                      <Text style={styles.infoDetailLabel}>Type</Text>
                      <Text style={[styles.infoDetailVal, { textTransform: 'capitalize' }]}>
                        {selectedMessage.messageType || 'Text'}
                      </Text>
                    </View>
                  </View>

                  {selectedMessage.messageType === 'text' && selectedMessage.content && (
                    <View style={styles.infoDetailRow}>
                      <Ionicons name="stats-chart-outline" size={16} color={COLORS.textSecondary} />
                      <View style={styles.infoDetailText}>
                        <Text style={styles.infoDetailLabel}>Length</Text>
                        <Text style={styles.infoDetailVal}>
                          {selectedMessage.content.length} characters
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={styles.infoModalCloseBtn}
              onPress={() => setInfoModalVisible(false)}
            >
              <Text style={styles.infoModalCloseTxt}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── ATTACHMENT MODAL SHEET ── */}
      <Modal
        visible={attachModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAttachModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBgOverlay}
          activeOpacity={1}
          onPress={() => setAttachModalVisible(false)}
        >
          <View style={styles.bottomSheet}>
            <View style={styles.bottomSheetHeader}>
              <View style={styles.bottomSheetHandle} />
              <Text style={styles.bottomSheetTitle}>Send Attachment</Text>
            </View>
            <View style={styles.bottomSheetRow}>
              <TouchableOpacity
                style={styles.bottomSheetBtn}
                onPress={handleTakePhoto}
                activeOpacity={0.8}
              >
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="camera" size={24} color={COLORS.secondary} />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Camera</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.bottomSheetBtn}
                onPress={handlePickImage}
                activeOpacity={0.8}
              >
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="image" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.bottomSheetCancel}
              onPress={() => setAttachModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.bottomSheetCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ── ZOOMED IMAGE MODAL ── */}
      <Modal
        visible={!!selectedImageUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedImageUri(null)}
      >
        <View style={styles.zoomModalBg}>
          <TouchableOpacity
            style={styles.zoomModalClose}
            onPress={() => setSelectedImageUri(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {selectedImageUri && (
            <Image
              source={{ uri: selectedImageUri }}
              style={styles.zoomImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Header
  headerContainer: { paddingTop: 10, paddingBottom: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, height: 50,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  headerAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  headerAvatarText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 15, fontWeight: '800', color: '#FFFFFF' },
  onlineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  onlineDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  onlineText: { fontSize: 10, color: 'rgba(255,255,255,0.65)' },
  toggleDetailsBtn: { padding: 4 },
  toggleDetailsActive: { opacity: 0.8 },

  // Selection Header items
  selectionCount: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', flex: 1, marginLeft: 6 },
  selectionActions: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  actionIconButton: { padding: 4 },

  // Collapsible Details
  detailsOuter: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderLight,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  detailsMiniBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 16, paddingVertical: 10,
  },
  detailsMiniText: { flex: 1, fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  detailsExpandedCard: {
    padding: 16, backgroundColor: COLORS.white,
  },
  detailsTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  detailsMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 10 },
  detailsMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.background, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  detailsMetaVal: { fontSize: 11, fontWeight: '700', color: COLORS.text },
  detailsDesc: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 17, marginBottom: 12 },
  detailsActions: { flexDirection: 'row', justifyContent: 'flex-start' },
  detailsActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  detailsActionText: { fontSize: 11, color: '#FFFFFF', fontWeight: '700' },

  // E2EE Banner
  e2eeBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF3C7', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, marginHorizontal: 14, marginTop: 8, marginBottom: 16,
    borderWidth: 1, borderColor: '#F59E0B',
  },
  e2eeText: { fontSize: 10, color: '#B45309', fontWeight: '600', flex: 1, textAlign: 'center', lineHeight: 14 },

  // Messages List
  messageList: { paddingHorizontal: 14, paddingVertical: 16, paddingBottom: 10 },

  dateSeparator: {
    flexDirection: 'row', alignItems: 'center', marginVertical: 16, gap: 10,
  },
  dateLine: { flex: 1, height: 1, backgroundColor: COLORS.borderLight },
  dateChip: {
    backgroundColor: COLORS.borderLight,
    paddingHorizontal: 12, paddingVertical: 4,
    borderRadius: SIZES.radiusFull,
  },
  dateLabel: { 
    fontSize: 11, color: COLORS.textSecondary, fontWeight: '700',
  },

  messageWrapper: { marginBottom: 10, paddingVertical: 4, paddingHorizontal: 6, borderRadius: 8 },
  messageWrapperSelected: { backgroundColor: 'rgba(59, 130, 246, 0.14)' },

  nameRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginBottom: 4, marginLeft: 2,
  },
  smallAvatar: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: COLORS.secondaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  smallAvatarText: { fontSize: 9, fontWeight: '700', color: COLORS.secondary },
  senderName: { fontSize: 12, fontWeight: '700', color: COLORS.text, flex: 1 },
  nameTime: { fontSize: 10, color: COLORS.textLight },

  bubbleRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 2 },
  bubbleRowMine: { flexDirection: 'row-reverse', justifyContent: 'flex-start' },
  avatarSpacer: { width: 26 },

  bubble: {
    maxWidth: '78%',
    borderRadius: SIZES.radius,
    paddingHorizontal: 12, paddingVertical: 8,
    elevation: 1.5, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  bubbleOther: {
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 3,
    alignSelf: 'flex-start',
  },
  bubbleMine: {
    backgroundColor: '#DCF8C6',
    borderBottomRightRadius: 3,
    alignSelf: 'flex-end',
  },
  bubblePending: { opacity: 0.6 },
  bubbleImage: { padding: 4, borderRadius: 12 },

  bubbleText: { fontSize: 14, color: COLORS.text, lineHeight: 19 },
  bubbleTextMine: { color: COLORS.text },

  messageImage: { width: 220, height: 160, borderRadius: 8 },

  bubbleFooter: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    marginTop: 4, gap: 4,
  },
  bubbleTime: { fontSize: 9, color: COLORS.textLight },
  bubbleTimeMine: { color: COLORS.textSecondary },
  editedLabel: { fontSize: 9, color: COLORS.textLight, fontStyle: 'italic' },
  editedLabelMine: { color: COLORS.textSecondary },

  emptyChat: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyChatIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: COLORS.white, alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  emptyChatText: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginTop: 4 },
  emptyChatSubtext: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },

  // Editing Preview Banner
  editingBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: '#F3F4F6', borderTopWidth: 1, borderTopColor: COLORS.borderLight,
  },
  editingBannerContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  editingLeftBorder: { width: 4, height: '100%', backgroundColor: COLORS.primary, borderRadius: 2 },
  editingTextCol: { flex: 1 },
  editingBannerTitle: { fontSize: 11, fontWeight: '700', color: COLORS.primary },
  editingBannerText: { fontSize: 12, color: COLORS.textSecondary },
  editingCancelBtn: { padding: 4 },

  // Input bar
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight,
    paddingBottom: 10,
  },
  attachBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  textInput: {
    flex: 1, minHeight: 38, maxHeight: 100,
    backgroundColor: COLORS.background, borderRadius: 19,
    paddingHorizontal: 16, paddingVertical: 8,
    fontSize: 14, color: COLORS.text,
    borderWidth: 1, borderColor: COLORS.borderLight,
  },
  sendBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: COLORS.border },

  // Bottom Sheet (Cancel Modal)
  modalBgOverlay: {
    flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.radiusLg, borderTopRightRadius: SIZES.radiusLg,
    paddingBottom: Platform.OS === 'ios' ? 36 : 20,
    paddingHorizontal: 20,
  },
  bottomSheetHeader: {
    alignItems: 'center', paddingVertical: 14,
  },
  bottomSheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, marginBottom: 8,
  },
  bottomSheetTitle: { fontSize: 14, fontWeight: '800', color: COLORS.text },
  bottomSheetRow: { flexDirection: 'row', gap: 20, marginVertical: 16 },
  bottomSheetBtn: { flex: 1, alignItems: 'center', gap: 6 },
  bottomSheetIconWrap: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  bottomSheetBtnTxt: { fontSize: 12, fontWeight: '700', color: COLORS.text },
  bottomSheetCancel: {
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingVertical: 12, alignItems: 'center', marginTop: 10,
  },
  bottomSheetCancelTxt: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary },

  // Zoom modal
  zoomModalBg: { flex: 1, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center' },
  zoomModalClose: {
    position: 'absolute', top: 50, right: 20,
    zIndex: 10, width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center',
  },
  zoomImage: { width: width, height: height * 0.8 },

  // Info Modal
  infoModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  infoModalCard: { width: '90%', backgroundColor: COLORS.white, borderRadius: SIZES.radiusLg, padding: 20, maxHeight: '80%' },
  infoModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: COLORS.borderLight, paddingBottom: 12, marginBottom: 16 },
  infoModalTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  infoPreviewContainer: { width: '100%', alignItems: 'center' },
  infoDetailList: { gap: 16, marginVertical: 10 },
  infoDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoDetailText: { flex: 1 },
  infoDetailLabel: { fontSize: 11, color: COLORS.textLight, fontWeight: '700', textTransform: 'uppercase' },
  infoDetailVal: { fontSize: 13, color: COLORS.text, fontWeight: '600', marginTop: 1 },
  infoModalCloseBtn: { backgroundColor: COLORS.primary, borderRadius: SIZES.radius, paddingVertical: 12, alignItems: 'center', marginTop: 20 },
  infoModalCloseTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
  Image, Modal, ScrollView, Dimensions, StatusBar, Keyboard, Linking, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Location from 'expo-location';
import { useAudioPlayer, useAudioPlayerStatus, useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import { useEventListener } from 'expo';
import { useVideoPlayer, VideoView } from 'expo-video';
import { COLORS, SIZES } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { getMessages, sendMessage, sendFileMessage, editMessage, deleteMessage } from '../../api/messages';
import { BASE_URL } from '../../api/config';
import { deriveSharedKey, encryptMessage, decryptMessage } from '../../utils/e2ee';
import { getParticipantNameFromConversation } from '../../utils/nameExtractor';

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
  const isInfluencer = user?.role === 'Influencer';
  const resolvedParticipantName = participantName || 
    (conversation ? getParticipantNameFromConversation(conversation, user?._id) : 'Chat');
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Custom states for WhatsApp features
  const [attachModalVisible, setAttachModalVisible] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  
  // Selection states
  const [selectedMessages, setSelectedMessages] = useState([]);

  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  // Video player modal
  const [videoPlayerUri, setVideoPlayerUri] = useState(null);
  
  // Audio playback state
  const [playingAudioId, setPlayingAudioId] = useState(null);
  const [audioProgress, setAudioProgress] = useState(0);

  const flatListRef = useRef(null);
  const pollRef = useRef(null);
  const sharedKeyRef = useRef('');
  const recordingRef = useRef(null);
  const recordingTimerRef = useRef(null);
  const soundRef = useRef(null);
  const recordingPulse = useRef(new Animated.Value(1)).current;

  // New audio/video player hooks
  const audioPlayer = useAudioPlayer({ uri: '' }, { updateInterval: 100 });
  const audioPlayerStatus = useAudioPlayerStatus(audioPlayer);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const videoPlayer = useVideoPlayer('');

  // Audio playback completion listener
  useEventListener(audioPlayer, 'playToEnd', () => {
    setPlayingAudioId(null);
  });

  // Video URL state synchronization
  useEffect(() => {
    if (videoPlayerUri) {
      videoPlayer.replace(videoPlayerUri);
      videoPlayer.play();
    } else {
      videoPlayer.pause();
    }
  }, [videoPlayerUri, videoPlayer]);

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

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

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

    // Convert spelled out words to digits for validation (e.g. "nine" -> "9")
    const convertWordsToDigits = (str) => {
      if (!str) return '';
      const wordMap = {
        'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
        'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
      };
      let processed = str.toLowerCase();
      Object.keys(wordMap).forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        processed = processed.replace(regex, wordMap[word]);
      });
      return processed;
    };

    const processedText = convertWordsToDigits(text);

    // Restrict email sharing
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/i;
    if (emailRegex.test(text) || emailRegex.test(processedText)) {
      Alert.alert('Sharing Restricted', 'Sharing email addresses in chat is not allowed for security reasons.');
      return;
    }

    // Restrict phone number sharing
    const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/;
    const cleanedDigits = text.replace(/[^0-9]/g, '');
    const hasTenConsecutiveDigits = /\d{10,}/.test(cleanedDigits);

    const processedCleanedDigits = processedText.replace(/[^0-9]/g, '');
    const hasProcessedTenConsecutiveDigits = /\d{10,}/.test(processedCleanedDigits);

    if (
      phoneRegex.test(text) || 
      hasTenConsecutiveDigits || 
      phoneRegex.test(processedText) || 
      hasProcessedTenConsecutiveDigits
    ) {
      Alert.alert('Sharing Restricted', 'Sharing phone numbers in chat is not allowed for security reasons.');
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
    setAttachModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'We need access to your photos to send media.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 120,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.type === 'video') {
        handleSendVideoFile(asset);
      } else {
        handleSendFile(asset);
      }
    }
  };

  const handleTakePhoto = async () => {
    setAttachModalVisible(false);
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

  // ── Send Video File ──
  const handleSendVideoFile = async (videoAsset) => {
    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      _id: tempId,
      messageType: 'video',
      fileUrl: videoAsset.uri,
      sender: user?._id,
      senderId: user?._id,
      createdAt: new Date().toISOString(),
      duration: videoAsset.duration ? Math.round(videoAsset.duration / 1000) : 0,
      pending: true,
    };
    setMessages((prev) => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'video');
      if (videoAsset.duration) formData.append('duration', String(Math.round(videoAsset.duration / 1000)));
      if (conversation?.relatedPromotion?._id) {
        formData.append('relatedPromotion', conversation.relatedPromotion._id);
      }
      const uri = videoAsset.uri;
      const uriParts = uri.split('.');
      const ext = uriParts[uriParts.length - 1] || 'mp4';
      formData.append('file', {
        uri, name: `video-${Date.now()}.${ext}`, type: `video/${ext === 'mov' ? 'quicktime' : 'mp4'}`,
      });
      await sendFileMessage(formData);
      await load(true);
    } catch (e) {
      console.log('Send video error:', e.response?.data || e.message);
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
      Alert.alert('Error', 'Failed to send video. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // ── Pick Document ──
  const handlePickDocument = async () => {
    setAttachModalVisible(false);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'text/plain', 'text/csv', 'application/zip'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const doc = result.assets[0];
      setSending(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId, messageType: 'document', fileName: doc.name,
        fileSize: doc.size, sender: user?._id, senderId: user?._id,
        createdAt: new Date().toISOString(), pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'document');
      if (conversation?.relatedPromotion?._id) {
        formData.append('relatedPromotion', conversation.relatedPromotion._id);
      }
      formData.append('file', {
        uri: doc.uri, name: doc.name, type: doc.mimeType || 'application/octet-stream',
      });

      await sendFileMessage(formData);
      await load(true);
    } catch (e) {
      console.log('Send document error:', e);
      Alert.alert('Error', 'Failed to send document.');
    } finally {
      setSending(false);
    }
  };

  // ── Voice Recording ──
  const startRecording = async () => {
    setAttachModalVisible(false);
    try {
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        Alert.alert('Permission Denied', 'We need microphone access to record voice notes.');
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      await recorder.record();
      setIsRecording(true);
      setRecordingDuration(0);

      // Start timer
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => {
          if (d >= 120) { // 2 min max
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);

      // Pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(recordingPulse, { toValue: 1.3, duration: 600, useNativeDriver: true }),
          Animated.timing(recordingPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } catch (e) {
      console.log('Start recording error:', e);
      Alert.alert('Error', 'Failed to start recording.');
    }
  };

  const cancelRecording = async () => {
    clearInterval(recordingTimerRef.current);
    recordingPulse.stopAnimation();
    recordingPulse.setValue(1);
    setIsRecording(false);
    setRecordingDuration(0);
    try {
      await recorder.stop();
    } catch (e) { console.log('Cancel recording:', e); }
  };

  const stopRecording = async () => {
    clearInterval(recordingTimerRef.current);
    recordingPulse.stopAnimation();
    recordingPulse.setValue(1);
    setIsRecording(false);

    try {
      let uri = await recorder.stop();
      if (!uri) {
        uri = recorder.uri;
      }
      const duration = recordingDuration;
      setRecordingDuration(0);

      if (!uri || duration < 1) {
        Alert.alert('Too Short', 'Recording must be at least 1 second.');
        return;
      }

      await setAudioModeAsync({ allowsRecording: false });

      setSending(true);
      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId, messageType: 'audio', fileUrl: uri,
        duration, sender: user?._id, senderId: user?._id,
        createdAt: new Date().toISOString(), pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      const formData = new FormData();
      formData.append('conversationId', conversationId);
      formData.append('messageType', 'audio');
      formData.append('duration', String(duration));
      if (conversation?.relatedPromotion?._id) {
        formData.append('relatedPromotion', conversation.relatedPromotion._id);
      }
      formData.append('file', {
        uri, name: `voice-${Date.now()}.m4a`, type: 'audio/m4a',
      });

      await sendFileMessage(formData);
      await load(true);
    } catch (e) {
      console.log('Send voice note error:', e);
      Alert.alert('Error', 'Failed to send voice note.');
    } finally {
      setSending(false);
    }
  };

  // ── Audio Playback ──
  const handlePlayAudio = async (item) => {
    try {
      const url = getImageUrl(item.fileUrl);

      // If same audio, toggle play/pause
      if (playingAudioId === item._id) {
        if (audioPlayerStatus.playing) {
          audioPlayer.pause();
        } else {
          audioPlayer.play();
        }
        return;
      }

      setPlayingAudioId(item._id);
      await audioPlayer.replace({ uri: url }, true);
    } catch (e) {
      console.log('Audio play error:', e);
    }
  };

  // ── Share Location ──
  const handleShareLocation = async () => {
    setAttachModalVisible(false);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'We need location access to share your location.');
        return;
      }

      setSending(true);
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      let address = '';
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
        if (geo) {
          address = [geo.name, geo.street, geo.city, geo.region].filter(Boolean).join(', ');
        }
      } catch (geoErr) {
        console.log('Geocode error:', geoErr);
      }

      const tempId = `temp-${Date.now()}`;
      const optimistic = {
        _id: tempId, messageType: 'location',
        location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude, address },
        sender: user?._id, senderId: user?._id,
        createdAt: new Date().toISOString(), pending: true,
      };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

      await sendMessage({
        conversationId,
        messageType: 'location',
        location: { latitude: loc.coords.latitude, longitude: loc.coords.longitude, address },
        relatedPromotion: conversation?.relatedPromotion?._id,
      });
      await load(true);
    } catch (e) {
      console.log('Location share error:', e);
      Alert.alert('Error', 'Failed to share location.');
    } finally {
      setSending(false);
    }
  };

  // ── File Download ──
  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      const url = getImageUrl(fileUrl);
      const downloadName = fileName || `file-${Date.now()}`;
      const fileUri = FileSystem.cacheDirectory + downloadName;

      Alert.alert('Downloading...', fileName || 'File', [{ text: 'OK' }]);
      const { uri } = await FileSystem.downloadAsync(url, fileUri);

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert('Downloaded', `File saved to ${uri}`);
      }
    } catch (e) {
      console.log('Download error:', e);
      Alert.alert('Error', 'Failed to download file.');
    }
  };

  // ── Helper: Format file size ──
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // ── Helper: Format recording time ──
  const formatRecordTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // ── Helper: Get document icon ──
  const getDocIcon = (name) => {
    if (!name) return 'document-outline';
    const ext = name.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'document-text';
    if (['doc', 'docx'].includes(ext)) return 'document-text-outline';
    if (['xls', 'xlsx', 'csv'].includes(ext)) return 'grid-outline';
    if (['ppt', 'pptx'].includes(ext)) return 'easel-outline';
    if (['zip', 'rar'].includes(ext)) return 'archive-outline';
    return 'document-outline';
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
    };
  }, []);

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
      : resolvedParticipantName || 'User';

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
            (item.messageType === 'image' || item.messageType === 'video') && styles.bubbleImage,
          ]}>
            {/* ── IMAGE ── */}
            {item.messageType === 'image' ? (
              <Image
                source={{ uri: getImageUrl(item.fileUrl) }}
                style={styles.messageImage}
                resizeMode="cover"
              />

            /* ── VIDEO ── */
            ) : item.messageType === 'video' ? (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setVideoPlayerUri(getImageUrl(item.fileUrl))}
                style={styles.videoBubbleWrap}
              >
                <View style={styles.videoThumbPlaceholder}>
                  <View style={styles.videoPlayBtn}>
                    <Ionicons name="play" size={28} color="#FFFFFF" />
                  </View>
                  {item.duration > 0 && (
                    <View style={styles.videoDurationBadge}>
                      <Text style={styles.videoDurationText}>{formatRecordTime(item.duration)}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.videoLabel}>Video</Text>
              </TouchableOpacity>

            /* ── DOCUMENT ── */
            ) : item.messageType === 'document' || item.messageType === 'file' ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleDownloadFile(item.fileUrl, item.fileName)}
                style={styles.docBubble}
              >
                <View style={styles.docIconWrap}>
                  <Ionicons name={getDocIcon(item.fileName)} size={22} color={COLORS.primary} />
                </View>
                <View style={styles.docInfo}>
                  <Text style={styles.docName} numberOfLines={2}>
                    {item.fileName || 'Document'}
                  </Text>
                  <Text style={styles.docSize}>
                    {formatFileSize(item.fileSize)} • Tap to download
                  </Text>
                </View>
                <Ionicons name="download-outline" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>

            /* ── AUDIO / VOICE NOTE ── */
            ) : item.messageType === 'audio' ? (
              <View style={styles.audioBubble}>
                <TouchableOpacity
                  onPress={() => handlePlayAudio(item)}
                  style={[styles.audioPlayBtn, { backgroundColor: isMine ? COLORS.primary : COLORS.secondary }]}
                >
                  <Ionicons
                    name={playingAudioId === item._id ? 'pause' : 'play'}
                    size={16} color="#FFFFFF"
                  />
                </TouchableOpacity>
                <View style={styles.audioWaveWrap}>
                  {[...Array(12)].map((_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.audioBar,
                        {
                          height: 6 + Math.random() * 14,
                          backgroundColor: playingAudioId === item._id && (i / 12) < (audioPlayerStatus.currentTime / (audioPlayerStatus.duration || 1))
                            ? (isMine ? COLORS.primary : COLORS.secondary)
                            : (isMine ? '#A3D9A5' : '#D1D5DB'),
                        },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.audioDuration, isMine && { color: COLORS.textSecondary }]}>
                  {formatRecordTime(item.duration || 0)}
                </Text>
              </View>

            /* ── LOCATION ── */
            ) : item.messageType === 'location' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                  const lat = item.location?.latitude;
                  const lng = item.location?.longitude;
                  if (lat && lng) {
                    const url = Platform.select({
                      ios: `maps:${lat},${lng}?q=${lat},${lng}`,
                      android: `geo:${lat},${lng}?q=${lat},${lng}`,
                    });
                    Linking.openURL(url).catch(() => {
                      Linking.openURL(`https://www.google.com/maps?q=${lat},${lng}`);
                    });
                  }
                }}
                style={styles.locationBubble}
              >
                <View style={styles.locationMapPlaceholder}>
                  <LinearGradient
                    colors={['#E8F5E9', '#C8E6C9', '#A5D6A7']}
                    style={styles.locationGradient}
                  >
                    <Ionicons name="location" size={32} color={COLORS.primary} />
                  </LinearGradient>
                </View>
                <View style={styles.locationInfo}>
                  <Text style={styles.locationTitle}>📍 Location</Text>
                  {item.location?.address ? (
                    <Text style={styles.locationAddr} numberOfLines={2}>{item.location.address}</Text>
                  ) : (
                    <Text style={styles.locationCoords}>
                      {item.location?.latitude?.toFixed(4)}, {item.location?.longitude?.toFixed(4)}
                    </Text>
                  )}
                  <Text style={styles.locationTap}>Tap to open in Maps</Text>
                </View>
              </TouchableOpacity>

            /* ── TEXT (default) ── */
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
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F9FAFB" translucent={false} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'padding'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
      {/* ── HEADER (SELECTION OR NORMAL) ── */}
      <LinearGradient
        colors={['#0A2010', '#0D3015', '#0A1628']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.headerContainer, { paddingTop: insets.top }]}
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
                {(resolvedParticipantName || 'C')
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>

            <View style={styles.headerInfo}>
              <Text style={styles.headerName} numberOfLines={1}>
                {resolvedParticipantName}
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
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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

      {/* ── INPUT BAR (or RECORDING BAR) ── */}
      {isRecording ? (
        <View style={[styles.recordingBar, { paddingBottom: (!keyboardVisible && insets.bottom > 0) ? insets.bottom : 8 }]}>
          <TouchableOpacity onPress={cancelRecording} style={styles.recordCancelBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
          </TouchableOpacity>
          <View style={styles.recordingIndicator}>
            <Animated.View style={[styles.recordDot, { transform: [{ scale: recordingPulse }] }]} />
            <Text style={styles.recordTimer}>{formatRecordTime(recordingDuration)}</Text>
          </View>
          <TouchableOpacity onPress={stopRecording} style={styles.recordSendBtn}>
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.inputBar, { paddingBottom: (!keyboardVisible && insets.bottom > 0) ? insets.bottom : 8 }]}>
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
          {inputText.trim() ? (
            <TouchableOpacity
              style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={sending}
              activeOpacity={0.8}
            >
              {sending ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Ionicons name={editingMessage ? "checkmark" : "send"} size={18} color={COLORS.white} />
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.micBtn}
              onPress={startRecording}
              activeOpacity={0.7}
            >
              <Ionicons name="mic" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      )}

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
              <Text style={styles.bottomSheetTitle}>Share</Text>
            </View>
            <View style={styles.bottomSheetRow}>
              <TouchableOpacity style={styles.bottomSheetBtn} onPress={handleTakePhoto} activeOpacity={0.8}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="camera" size={24} color="#7C3AED" />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bottomSheetBtn} onPress={handlePickImage} activeOpacity={0.8}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#D1FAE5' }]}>
                  <Ionicons name="images" size={24} color={COLORS.primary} />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Gallery</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bottomSheetBtn} onPress={handlePickDocument} activeOpacity={0.8}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="document-text" size={24} color="#2563EB" />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Document</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.bottomSheetRow, { marginTop: 0 }]}>
              <TouchableOpacity style={styles.bottomSheetBtn} onPress={startRecording} activeOpacity={0.8}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#FEE2E2' }]}>
                  <Ionicons name="mic" size={24} color="#DC2626" />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Voice Note</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.bottomSheetBtn} onPress={handleShareLocation} activeOpacity={0.8}>
                <View style={[styles.bottomSheetIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="location" size={24} color="#D97706" />
                </View>
                <Text style={styles.bottomSheetBtnTxt}>Location</Text>
              </TouchableOpacity>

              <View style={styles.bottomSheetBtn} />
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

      {/* ── VIDEO PLAYER MODAL ── */}
      <Modal
        visible={!!videoPlayerUri}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setVideoPlayerUri(null)}
      >
        <View style={styles.zoomModalBg}>
          <TouchableOpacity
            style={styles.zoomModalClose}
            onPress={() => setVideoPlayerUri(null)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {videoPlayerUri && (
            <VideoView
              player={videoPlayer}
              style={styles.videoPlayer}
              nativeControls
              allowsFullscreen
              allowsPictureInPicture
              contentFit="contain"
            />
          )}
        </View>
      </Modal>
      </KeyboardAvoidingView>
    </View>
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

  // Video bubble styles
  videoBubbleWrap: { width: 220, height: 160, borderRadius: 8, overflow: 'hidden', position: 'relative' },
  videoThumbPlaceholder: { flex: 1, backgroundColor: '#1F2937', alignItems: 'center', justifyContent: 'center' },
  videoPlayBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0, 0, 0, 0.6)', alignItems: 'center', justifyContent: 'center' },
  videoDurationBadge: { position: 'absolute', bottom: 8, right: 8, backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  videoDurationText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  videoLabel: { position: 'absolute', bottom: 8, left: 8, color: '#FFFFFF', fontSize: 11, fontWeight: '600' },
  videoPlayer: { width: width, height: height * 0.8 },

  // Document bubble styles
  docBubble: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 8, padding: 10, gap: 10, width: 220 },
  docIconWrap: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#EDE9FE', alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1 },
  docName: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  docSize: { fontSize: 11, color: COLORS.textSecondary },

  // Audio/Voice note styles
  audioBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 4, width: 220 },
  audioPlayBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  audioWaveWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 30 },
  audioBar: { width: 2.5, borderRadius: 1.25 },
  audioDuration: { fontSize: 10, color: COLORS.textSecondary, alignSelf: 'flex-end', marginBottom: 2 },

  // Location bubble styles
  locationBubble: { width: 220, borderRadius: 8, overflow: 'hidden', backgroundColor: COLORS.white },
  locationMapPlaceholder: { height: 100, width: '100%' },
  locationGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  locationInfo: { padding: 8 },
  locationTitle: { fontSize: 13, fontWeight: '700', color: COLORS.text, marginBottom: 2 },
  locationAddr: { fontSize: 11, color: COLORS.textSecondary, lineHeight: 15 },
  locationCoords: { fontSize: 10, color: COLORS.textSecondary },
  locationTap: { fontSize: 10, color: COLORS.primary, fontWeight: '700', marginTop: 4 },

  // Voice recording bar styles
  recordingBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: COLORS.white, borderTopWidth: 1, borderTopColor: COLORS.borderLight, height: 56 },
  recordCancelBtn: { padding: 8 },
  recordingIndicator: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  recordDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444' },
  recordTimer: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  recordSendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' },
  micBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
});

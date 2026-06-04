import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { COLORS, SIZES } from '../../theme/colors';
import { submitProof } from '../../api/submissions';

export default function SubmitWorkScreen({ route, navigation }) {
  const { campaignId, applicationId, title, existingSubmission } = route.params || {};

  const [description, setDescription] = useState(existingSubmission?.description || '');
  const [proofUrlInput, setProofUrlInput] = useState('');
  const [proofUrls, setProofUrls] = useState(existingSubmission?.proofUrls || []);
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleAddUrl = () => {
    if (proofUrlInput.trim()) {
      setProofUrls([...proofUrls, proofUrlInput.trim()]);
      setProofUrlInput('');
    }
  };

  const handleRemoveUrl = (index) => {
    setProofUrls(proofUrls.filter((_, i) => i !== index));
  };

  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  const processFiles = (assets, isDocument = false) => {
    const validFiles = assets.filter(file => {
      const size = isDocument ? file.size : file.fileSize;
      if (size && size > MAX_FILE_SIZE) {
        Alert.alert('File Too Large', `The file ${file.name || file.fileName} is larger than 50MB.`);
        return false;
      }
      return true;
    }).map(file => ({
      uri: file.uri,
      name: file.name || file.fileName || `file_${Date.now()}`,
      mimeType: file.mimeType || (isDocument ? 'application/octet-stream' : 'image/jpeg'),
      size: isDocument ? file.size : file.fileSize
    }));

    setMediaFiles(prev => [...prev, ...validFiles]);
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (!result.canceled) {
        processFiles(result.assets, false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
        multiple: true
      });

      if (!result.canceled) {
        processFiles(result.assets, true);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveFile = (index) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Description is required.');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('campaignId', campaignId);
      formData.append('applicationId', applicationId);
      formData.append('description', description);
      formData.append('proofUrls', JSON.stringify(proofUrls));

      mediaFiles.forEach((file, index) => {
        formData.append('mediaProofs', {
          uri: file.uri,
          name: file.name,
          type: file.mimeType,
        });
      });

      await submitProof(formData);
      Alert.alert('Success', 'Work submitted successfully!');
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit work.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {existingSubmission ? 'Update Work for' : 'Submit Work for'} {title}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {existingSubmission && (
          <View style={{ backgroundColor: '#EEF2FF', padding: 12, borderRadius: SIZES.radius, marginBottom: 16 }}>
            <Text style={{ color: COLORS.primary, fontSize: 13 }}>
              You are updating your previous submission. Please note that you must re-select any media files you wish to include.
            </Text>
          </View>
        )}
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Describe your work (e.g. Posted reels and stories as required...)"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Proof URLs</Text>
        <View style={styles.urlInputRow}>
          <TextInput
            style={styles.input}
            placeholder="https://instagram.com/p/..."
            value={proofUrlInput}
            onChangeText={setProofUrlInput}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.addUrlBtn} onPress={handleAddUrl}>
            <Ionicons name="add" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>

        {proofUrls.map((url, i) => (
          <View key={i} style={styles.urlPill}>
            <Text style={styles.urlPillText} numberOfLines={1}>{url}</Text>
            <TouchableOpacity onPress={() => handleRemoveUrl(i)}>
              <Ionicons name="close-circle" size={18} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        ))}

        <Text style={styles.label}>Media Proofs (Photos, Videos, Documents up to 50MB)</Text>
        <View style={styles.uploadRow}>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickImage}>
            <Ionicons name="images-outline" size={24} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Photo / Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickDocument}>
            <Ionicons name="document-outline" size={24} color={COLORS.primary} />
            <Text style={styles.uploadBtnText}>Document</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mediaGrid}>
          {mediaFiles.map((file, i) => {
            const isImage = file.mimeType?.startsWith('image/');
            return (
              <View key={i} style={styles.mediaItem}>
                {isImage ? (
                  <Image source={{ uri: file.uri }} style={styles.mediaImage} />
                ) : (
                  <View style={styles.filePlaceholder}>
                    <Ionicons name="document-text" size={32} color={COLORS.primary} />
                    <Text style={styles.fileNameText} numberOfLines={1}>{file.name}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => handleRemoveFile(i)}>
                  <Ionicons name="close-circle" size={22} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[styles.submitBtn, loading && styles.submitBtnDisabled]} 
          onPress={handleSubmit} 
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.submitBtnText}>Submit Work</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 52, paddingBottom: 14,
    backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    flex: 1, fontSize: 16, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginHorizontal: 8,
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  label: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, marginTop: 16 },
  textArea: {
    backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, padding: 12, minHeight: 100, textAlignVertical: 'top',
  },
  urlInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, paddingHorizontal: 12, height: 44,
  },
  addUrlBtn: {
    width: 44, height: 44, backgroundColor: COLORS.primary,
    borderRadius: SIZES.radius, alignItems: 'center', justifyContent: 'center',
  },
  urlPill: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.primaryLight, padding: 10, borderRadius: SIZES.radius, marginBottom: 6,
  },
  urlPillText: { color: COLORS.primary, flex: 1, marginRight: 8, fontSize: 13 },
  uploadRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  uploadBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: COLORS.primary, borderStyle: 'dashed',
    borderRadius: SIZES.radius, padding: 12, backgroundColor: COLORS.white,
  },
  uploadBtnText: { color: COLORS.primary, fontWeight: '600', fontSize: 13 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  mediaItem: { width: 80, height: 80, borderRadius: SIZES.radius, overflow: 'hidden', position: 'relative', backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.borderLight },
  mediaImage: { width: '100%', height: '100%' },
  filePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 4 },
  fileNameText: { fontSize: 10, color: COLORS.textSecondary, marginTop: 4, textAlign: 'center' },
  removeMediaBtn: { position: 'absolute', top: 2, right: 2, backgroundColor: '#fff', borderRadius: 11 },
  footer: { padding: 16, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.border },
  submitBtn: {
    backgroundColor: COLORS.primary, paddingVertical: 14, borderRadius: SIZES.radius,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

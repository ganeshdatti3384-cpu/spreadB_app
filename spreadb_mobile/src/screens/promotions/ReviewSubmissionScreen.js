import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, Image, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../theme/colors';
import { reviewSubmission } from '../../api/submissions';

export default function ReviewSubmissionScreen({ route, navigation }) {
  const { submission, readOnly } = route.params || {};

  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReview = async (status) => {
    if (status === 'approved' && rating === 0) {
      Alert.alert('Error', 'Please provide a rating (1-5 stars) before approving.');
      return;
    }

    setLoading(true);
    try {
      await reviewSubmission({
        submissionId: submission._id,
        status,
        feedback,
        rating
      });
      Alert.alert('Success', `Submission ${status === 'approved' ? 'Approved' : 'Rejected'} successfully!`);
      navigation.goBack();
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to submit review.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!submission) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>No submission data found.</Text>
      </View>
    );
  }

  const influencerName = submission.influencerId?.firstName 
    ? `${submission.influencerId.firstName} ${submission.influencerId.lastName}`
    : submission.influencerId?.email || 'Influencer';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Review Work</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Submitted by: {influencerName}</Text>
          {submission.influencerId?.email && (
            <Text style={styles.subLabel}>Email: {submission.influencerId.email}</Text>
          )}
          {submission.influencerId?.role && (
            <Text style={styles.subLabel}>Role: {submission.influencerId.role}</Text>
          )}
          
          <Text style={styles.label}>Description</Text>
          <Text style={styles.descText}>{submission.description || 'No description provided.'}</Text>
        </View>

        {submission.proofUrls && submission.proofUrls.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Proof URLs</Text>
            {submission.proofUrls.map((url, i) => (
              <TouchableOpacity key={i} style={styles.urlPill} onPress={() => Linking.openURL(url)}>
                <Ionicons name="link-outline" size={18} color={COLORS.primary} />
                <Text style={styles.urlPillText} numberOfLines={1}>{url}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {submission.mediaProofs && submission.mediaProofs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.label}>Media Files</Text>
            <View style={styles.mediaGrid}>
              {submission.mediaProofs.map((file, i) => {
                // In a real app, URL should be prefixed with API base URL if relative
                // e.g. `${api.defaults.baseURL}/${file.url}` 
                // We'll leave it as is, or you might need a helper function.
                return (
                  <Image key={i} source={{ uri: `http://192.168.1.100:5000/${file.url}` }} style={styles.mediaImage} />
                );
              })}
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.label}>{readOnly ? 'Review Details' : 'Your Review'}</Text>
          
          {(submission.rating > 0 || !readOnly) && (
            <>
              <Text style={styles.subLabel}>Rating</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity 
                    key={star} 
                    onPress={() => !readOnly && setRating(star)}
                    disabled={readOnly}
                    activeOpacity={readOnly ? 1 : 0.7}
                  >
                    <Ionicons 
                      name={star <= (readOnly ? (submission.rating || 0) : rating) ? "star" : "star-outline"} 
                      size={32} 
                      color={star <= (readOnly ? (submission.rating || 0) : rating) ? "#FFD700" : COLORS.border} 
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {(!readOnly || submission.feedback) && (
            <>
              <Text style={styles.subLabel}>Feedback {readOnly ? '' : '(Optional)'}</Text>
              {readOnly ? (
                <Text style={styles.descText}>{submission.feedback}</Text>
              ) : (
                <TextInput
                  style={styles.textArea}
                  placeholder="Write your feedback..."
                  multiline
                  numberOfLines={3}
                  value={feedback}
                  onChangeText={setFeedback}
                />
              )}
            </>
          )}

          {readOnly && !submission.rating && !submission.feedback && (
            <Text style={styles.descText}>No review has been provided yet.</Text>
          )}
        </View>
      </ScrollView>

      {!readOnly && (
        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.rejectBtn, loading && styles.btnDisabled]} 
            onPress={() => handleReview('rejected')}
            disabled={loading}
          >
            <Text style={styles.rejectBtnText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.approveBtn, loading && styles.btnDisabled]} 
            onPress={() => handleReview('approved')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.approveBtnText}>Approve & Pay</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { color: COLORS.error, fontSize: 16 },
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
  content: { padding: 16, gap: 12 },
  card: {
    backgroundColor: COLORS.white, padding: 16, borderRadius: SIZES.radiusLg,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 },
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  label: { fontSize: 15, fontWeight: '600', color: COLORS.text, marginBottom: 8 },
  descText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 22 },
  urlPill: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primaryLight,
    padding: 12, borderRadius: SIZES.radius, marginBottom: 8, gap: 8
  },
  urlPillText: { color: COLORS.primary, fontSize: 14, flex: 1 },
  mediaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mediaImage: { width: 80, height: 80, borderRadius: SIZES.radius, backgroundColor: '#eee' },
  subLabel: { fontSize: 13, fontWeight: '500', color: COLORS.textSecondary, marginTop: 12, marginBottom: 6 },
  starRow: { flexDirection: 'row', gap: 8 },
  textArea: {
    backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: SIZES.radius, padding: 12, minHeight: 80, textAlignVertical: 'top',
  },
  footer: { 
    flexDirection: 'row', padding: 16, backgroundColor: COLORS.white, 
    borderTopWidth: 1, borderColor: COLORS.border, gap: 12 
  },
  rejectBtn: {
    flex: 1, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.error,
    paddingVertical: 14, borderRadius: SIZES.radius, alignItems: 'center',
  },
  rejectBtnText: { color: COLORS.error, fontSize: 16, fontWeight: '700' },
  approveBtn: {
    flex: 1, backgroundColor: COLORS.primary, paddingVertical: 14, 
    borderRadius: SIZES.radius, alignItems: 'center',
  },
  approveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
  btnDisabled: { opacity: 0.7 },
});

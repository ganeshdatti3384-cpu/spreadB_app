/**
 * Utility function to extract participant name from conversation data
 * Handles both Influencer and Brand Owner roles with proper fallbacks
 */
export const extractParticipantName = (participant, currentUserId) => {
  if (!participant) return 'User';
  
  // Get the other participant (not the current user)
  const other = participant.userId?._id 
    ? participant 
    : { userId: participant };
  
  // Skip if this is the current user
  if (String(other.userId?._id || other.userId) === String(currentUserId)) {
    return null;
  }
  
  const userData = other.userId || other;
  const role = userData.role || other.role;
  
  // Extract name based on role
  if (role === 'Influencer') {
    // For influencers: firstName + lastName, fallback to userName
    const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
    return fullName || userData.userName || 'Influencer';
  } else if (role === 'Brand Owner') {
    // For brands: brandName (from profile), fallback to firstName + lastName
    // The backend should populate brandName from BrandOwnerProfile
    return userData.brandName || 
           `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 
           'Brand Owner';
  }
  
  // Generic fallback
  return userData.firstName || 
         userData.brandName || 
         userData.userName || 
         userData.name || 
         'User';
};

/**
 * Get the other participant from a conversation
 */
export const getOtherParticipant = (conversation, currentUserId) => {
  if (!conversation?.participants) return null;
  
  return conversation.participants.find(
    p => String(p.userId?._id || p.userId) !== String(currentUserId)
  );
};

/**
 * Extract participant name from conversation
 */
export const getParticipantNameFromConversation = (conversation, currentUserId) => {
  const other = getOtherParticipant(conversation, currentUserId);
  return extractParticipantName(other, currentUserId) || 'User';
};

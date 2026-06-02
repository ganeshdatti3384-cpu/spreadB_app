import { Message, Conversation } from "../model/message_model.js";
import { Application } from "../model/promotion_model.js";

/**
 * Auto-create conversation when application is accepted
 * Sends a welcome message from brand to influencer
 * Reopens conversation if it was previously closed
 */
export const createConversationOnAcceptance = async (applicationId, brandUserId, influencerUserId, campaignTitle) => {
  try {
    // Check if conversation already exists between these users (including inactive ones)
    let conversation = await Conversation.findOne({
      "participants.userId": { $all: [brandUserId, influencerUserId] }
    });

    let messageContent;
    
    if (!conversation) {
      // Create new conversation
      conversation = await Conversation.create({
        participants: [
          { userId: brandUserId, role: "Brand Owner" },
          { userId: influencerUserId, role: "Influencer" }
        ],
        isActive: true,
        relatedPromotion: null, // Can be set if needed
        metadata: {
          totalMessages: 0,
          unreadCount: {
            brand: 0,
            influencer: 1 // Welcome message will be unread for influencer
          }
        }
      });
      messageContent = `🎉 Congratulations! Your application for "${campaignTitle}" has been accepted. Let's discuss the campaign details and next steps. Feel free to ask any questions!`;
      console.log(`✅ New conversation created for application ${applicationId}`);
    } else if (!conversation.isActive) {
      // Reopen existing closed conversation
      conversation.isActive = true;
      await conversation.save();
      messageContent = `🎉 Great news! You've been accepted for a new campaign: "${campaignTitle}". Let's work together again!`;
      console.log(`✅ Conversation reopened for application ${applicationId}`);
    } else {
      // Conversation already active, just send welcome message
      messageContent = `🎉 Congratulations! Your application for "${campaignTitle}" has been accepted. Let's discuss the campaign details and next steps. Feel free to ask any questions!`;
      console.log(`✅ Using existing active conversation for application ${applicationId}`);
    }

    // Send automated welcome/reopen message from brand to influencer
    const welcomeMessage = await Message.create({
      conversationId: conversation._id,
      senderId: brandUserId,
      receiverId: influencerUserId,
      messageType: "text",
      content: messageContent,
      isRead: false
    });

    // Update conversation with last message
    conversation.lastMessage = welcomeMessage._id;
    conversation.lastMessageAt = new Date();
    conversation.metadata.totalMessages += 1;
    conversation.metadata.unreadCount.influencer += 1;
    await conversation.save();

    return { conversation, welcomeMessage };

  } catch (error) {
    console.error('Error creating conversation on acceptance:', error);
    throw error;
  }
};

/**
 * Close conversation when work is completed
 * Marks conversation as inactive
 */
export const closeConversationOnCompletion = async (brandUserId, influencerUserId) => {
  try {
    const conversation = await Conversation.findBetweenUsers(brandUserId, influencerUserId);

    if (conversation) {
      conversation.isActive = false;
      await conversation.save();

      // Send automated closing message
      await Message.create({
        conversationId: conversation._id,
        senderId: brandUserId,
        receiverId: influencerUserId,
        messageType: "text",
        content: `✅ This campaign has been completed. Thank you for your collaboration! This conversation is now closed. You can chat again when you work on a new campaign together.`,
        isRead: false
      });

      console.log(`✅ Conversation closed between brand ${brandUserId} and influencer ${influencerUserId}`);
      return conversation;
    }

    return null;
  } catch (error) {
    console.error('Error closing conversation:', error);
    throw error;
  }
};

/**
 * Reopen conversation for new promotion
 * Reactivates existing conversation or creates new one
 */
export const reopenConversationForNewPromotion = async (brandUserId, influencerUserId, campaignTitle) => {
  try {
    // Find existing conversation (even if inactive)
    let conversation = await Conversation.findOne({
      "participants.userId": { $all: [brandUserId, influencerUserId] }
    });

    if (conversation) {
      // Reopen existing conversation
      conversation.isActive = true;
      await conversation.save();

      // Send reopen message
      await Message.create({
        conversationId: conversation._id,
        senderId: brandUserId,
        receiverId: influencerUserId,
        messageType: "text",
        content: `🎉 Great news! You've been accepted for a new campaign: "${campaignTitle}". Let's work together again!`,
        isRead: false
      });

      console.log(`✅ Conversation reopened for new promotion`);
    } else {
      // Create new conversation if none exists
      const result = await createConversationOnAcceptance(null, brandUserId, influencerUserId, campaignTitle);
      conversation = result.conversation;
    }

    return conversation;
  } catch (error) {
    console.error('Error reopening conversation:', error);
    throw error;
  }
};

/**
 * Check if conversation should be active based on active collaborations
 */
export const checkConversationStatus = async (brandUserId, influencerUserId) => {
  try {
    // Check if there are any active accepted applications between these users
    const activeApplications = await Application.find({
      influencerId: influencerUserId,
      status: "accepted"
    }).populate('campaignId');

    // Filter for applications where the campaign belongs to this brand
    const activeCollaborations = activeApplications.filter(app => 
      app.campaignId && app.campaignId.brandOwnerId.toString() === brandUserId.toString()
    );

    return activeCollaborations.length > 0;
  } catch (error) {
    console.error('Error checking conversation status:', error);
    return false;
  }
};

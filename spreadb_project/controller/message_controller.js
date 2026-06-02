import { Message, Conversation } from "../model/message_model.js";
import { InfluencerProfile, BrandOwnerProfile } from "../model/profile.js";
import User from "../model/users.js";
import path from "path";
import fs from "fs";

// Get all conversations for a user
export const getUserConversations = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const conversations = await Conversation.getUserConversations(userId)
      .populate({
        path: 'participants.userId',
        select: 'firstName lastName email role'
      })
      .populate({
        path: 'relatedPromotion',
        select: 'title applicationStatus status'
      })
      .populate({
        path: 'lastMessage',
        select: 'content createdAt'
      });
    
    // Enhance conversations with profile data and application status
    const enhancedConversations = await Promise.allSettled(
      conversations.map(async (conversation) => {
        const otherParticipant = conversation.participants.find(
          p => p.userId._id.toString() !== userId.toString()
        );
        
        if (otherParticipant) {
          let profileData = null;
          
          if (otherParticipant.role === "Influencer" || otherParticipant.userId.role === "Influencer") {
            profileData = await InfluencerProfile.findOne({ 
              userId: otherParticipant.userId._id 
            }).select('firstName lastName userName profilePhoto');
          } else if (otherParticipant.role === "Brand Owner" || otherParticipant.userId.role === "Brand Owner") {
            profileData = await BrandOwnerProfile.findOne({ 
              userId: otherParticipant.userId._id 
            }).select('brandName brandLogo');
          }
          
          // Merge profile data with user data
          const enhancedParticipant = {
            ...otherParticipant.toObject(),
            userId: {
              ...otherParticipant.userId.toObject(),
              ...(profileData ? profileData.toObject() : {})
            }
          };
          
          // Check if contract/campaign has ended
          let isContractEnded = false;
          if (conversation.relatedPromotion) {
            isContractEnded = conversation.relatedPromotion.applicationStatus === 'closed' || 
                             conversation.relatedPromotion.status === 'completed';
          }
          
          return {
            ...conversation.toObject(),
            participants: conversation.participants.map(p => 
              p.userId._id.toString() === userId.toString() ? p : enhancedParticipant
            ),
            isContractEnded
          };
        }
        
        return conversation.toObject();
      })
    );
    
    // Filter out rejected promises and extract values
    const successfulConversations = enhancedConversations
      .filter(result => result.status === 'fulfilled')
      .map(result => result.value);
    
    res.status(200).json({
      success: true,
      conversations: successfulConversations
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch conversations",
      error: error.message
    });
  }
};

// Get messages for a specific conversation
export const getConversationMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Max 100 per page
    const skip = (page - 1) * limit;
    
    // Verify user is part of the conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found"
      });
    }
    
    // SECURITY: Strict participant verification with string conversion
    const isParticipant = conversation.participants.some(
      p => String(p.userId) === String(userId)
    );
    
    if (!isParticipant) {
      console.warn(`⚠️ Unauthorized access attempt to conversation ${conversationId} by user ${userId}`);
      return res.status(403).json({
        success: false,
        message: "Access denied to this conversation"
      });
    }
    
    // Get messages with pagination
    const messages = await Message.find({
      conversationId: conversationId,
      isDeleted: false
    })
    .populate('senderId', 'firstName lastName email role')
    .populate('receiverId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip)
    .lean(); // Performance optimization
    
    // SECURITY: Ensure sender IDs are strings for consistent frontend comparison
    const sanitizedMessages = messages.map(msg => ({
      ...msg,
      sender: String(msg.senderId?._id || msg.senderId),
      senderId: String(msg.senderId?._id || msg.senderId),
      receiverId: String(msg.receiverId?._id || msg.receiverId),
      _id: String(msg._id)
    }));
    
    console.log(`✅ Retrieved ${sanitizedMessages.length} messages for conversation ${conversationId}`);
    
    // Mark messages as read for the current user
    await Message.updateMany(
      {
        conversationId: conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.status(200).json({
      success: true,
      messages: sanitizedMessages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      }
    });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch messages"
    });
  }
};

// Send a new message
export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content, messageType = "text", conversationId: bodyConversationId } = req.body;
    const senderId = req.user.id;
    
    console.log('=== BACKEND Send Message Debug ===');
    console.log('Request body:', req.body);
    console.log('Request file:', req.file);
    console.log('User from token:', req.user);
    console.log('Extracted data:', {
      senderId,
      receiverId,
      content,
      messageType,
      bodyConversationId,
      hasFile: !!req.file
    });
    
    // If conversationId is provided in body, use it directly
    let conversation;
    if (bodyConversationId) {
      conversation = await Conversation.findById(bodyConversationId);
      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: "Conversation not found"
        });
      }
      
      // Verify user is part of the conversation
      const isParticipant = conversation.participants.some(
        p => p.userId.toString() === senderId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({
          success: false,
          message: "Access denied to this conversation"
        });
      }
      
      // Get receiver ID from conversation
      const otherParticipant = conversation.participants.find(
        p => p.userId.toString() !== senderId.toString()
      );
      const actualReceiverId = otherParticipant?.userId;
      
      if (!actualReceiverId) {
        return res.status(400).json({
          success: false,
          message: "Could not determine receiver"
        });
      }
      
      // Validate content or file
      if (!content && !req.file) {
        return res.status(400).json({
          success: false,
          message: "Message content or file is required"
        });
      }
      
      // Handle file upload if present
      let fileUrl = null;
      let fileName = null;
      let fileSize = null;
      
      if (req.file && messageType !== "text") {
        fileUrl = `/api/uploads/messages/${req.file.filename}`;
        fileName = req.file.originalname;
        fileSize = req.file.size;
      }
      
      // Create message
      const message = new Message({
        conversationId: conversation._id,
        senderId,
        receiverId: actualReceiverId,
        messageType,
        content: messageType === "text" ? content : undefined,
        fileUrl,
        fileName,
        fileSize
      });
      
      await message.save();
      
      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageAt = new Date();
      conversation.metadata.totalMessages += 1;
      
      // Update unread count for receiver
      const receiver = await User.findById(actualReceiverId);
      const receiverRole = receiver.role === "Brand Owner" ? "brand" : "influencer";
      conversation.metadata.unreadCount[receiverRole] += 1;
      
      await conversation.save();
      
      // Populate message for response
      await message.populate('senderId', 'firstName lastName email role');
      await message.populate('receiverId', 'firstName lastName email role');
      
      return res.status(201).json({
        success: true,
        message: message,
        conversationId: conversation._id
      });
    }
    
    // Original flow: receiverId provided
    // Validate required fields
    if (!receiverId) {
      console.error('❌ Missing receiverId in request');
      return res.status(400).json({
        success: false,
        message: "Receiver ID is required"
      });
    }
    
    // Validate receiverId format
    if (!/^[0-9a-fA-F]{24}$/.test(receiverId)) {
      console.error('❌ Invalid receiverId format:', receiverId);
      return res.status(400).json({
        success: false,
        message: "Invalid receiver ID format"
      });
    }
    
    if (!content && !req.file) {
      console.error('❌ Missing content and file in request');
      return res.status(400).json({
        success: false,
        message: "Message content or file is required"
      });
    }
    
    // Validate sender ID format
    if (!/^[0-9a-fA-F]{24}$/.test(senderId)) {
      console.error('❌ Invalid senderId format:', senderId);
      return res.status(400).json({
        success: false,
        message: "Invalid sender ID format"
      });
    }
    
    console.log('✅ Basic validation passed');
    
    // Validate receiver exists and has different role
    console.log('🔍 Looking up users in database...');
    const receiver = await User.findById(receiverId);
    const sender = await User.findById(senderId);
    
    console.log('Sender lookup result:', sender ? { 
      id: sender._id, 
      role: sender.role, 
      email: sender.email,
      firstName: sender.firstName,
      lastName: sender.lastName,
      isVerified: sender.isVerified
    } : '❌ NOT FOUND');
    
    console.log('Receiver lookup result:', receiver ? { 
      id: receiver._id, 
      role: receiver.role, 
      email: receiver.email,
      firstName: receiver.firstName,
      lastName: receiver.lastName,
      isVerified: receiver.isVerified
    } : '❌ NOT FOUND');
    
    if (!receiver) {
      console.error('❌ Receiver not found in database');
      return res.status(404).json({
        success: false,
        message: "Receiver not found"
      });
    }
    
    if (!sender) {
      console.error('❌ Sender not found in database');
      return res.status(404).json({
        success: false,
        message: "Sender not found"
      });
    }
    
    if (receiver.role === sender.role) {
      console.error('❌ Same role validation failed:', { senderRole: sender.role, receiverRole: receiver.role });
      return res.status(400).json({
        success: false,
        message: "Can only message users with different roles"
      });
    }
    
    console.log('✅ User validation passed');
    
    // Find or create conversation
    conversation = await Conversation.findBetweenUsers(senderId, receiverId);
    
    if (!conversation) {
      conversation = new Conversation({
        participants: [
          { userId: senderId, role: sender.role },
          { userId: receiverId, role: receiver.role }
        ],
        isActive: true  // Allow direct messaging
      });
      await conversation.save();
    }
    
    // 🆕 REACTIVATE CONVERSATION IF CLOSED
    // Allow users to continue chatting even after campaign ends
    if (!conversation.isActive) {
      conversation.isActive = true;
      await conversation.save();
    }
    
    // Handle file upload if present
    let fileUrl = null;
    let fileName = null;
    let fileSize = null;
    
    if (req.file && messageType !== "text") {
      fileUrl = `/api/uploads/messages/${req.file.filename}`;
      fileName = req.file.originalname;
      fileSize = req.file.size;
    }
    
    // Create message
    const message = new Message({
      conversationId: conversation._id,
      senderId,
      receiverId,
      messageType,
      content: messageType === "text" ? content : undefined,
      fileUrl,
      fileName,
      fileSize
    });
    
    await message.save();
    
    // Update conversation
    conversation.lastMessage = message._id;
    conversation.lastMessageAt = new Date();
    conversation.metadata.totalMessages += 1;
    
    // Update unread count for receiver
    const receiverRole = receiver.role === "Brand Owner" ? "brand" : "influencer";
    conversation.metadata.unreadCount[receiverRole] += 1;
    
    await conversation.save();
    
    // Populate message for response
    await message.populate('senderId', 'firstName lastName email role');
    await message.populate('receiverId', 'firstName lastName email role');
    
    res.status(201).json({
      success: true,
      message: message,
      conversationId: conversation._id
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
      error: error.message
    });
  }
};

// Helper function to auto-create basic profile if it doesn't exist
const ensureProfileExists = async (user) => {
  if (user.role === "Influencer") {
    const existingProfile = await InfluencerProfile.findOne({ userId: user._id });
    if (!existingProfile) {
      await InfluencerProfile.create({
        userId: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userName: user.email.split('@')[0],
        about: `Influencer: ${user.firstName} ${user.lastName}`,
        category: ['General'],
        locations: ['Global']
      });
      console.log(`Auto-created influencer profile for ${user.email}`);
    }
  } else if (user.role === "Brand Owner") {
    const existingProfile = await BrandOwnerProfile.findOne({ userId: user._id });
    if (!existingProfile) {
      const firstName = user.firstName?.trim() || '';
      const lastName = user.lastName?.trim() || '';
      const brandName = `${firstName} ${lastName}`.trim() || 'Brand';
      
      await BrandOwnerProfile.create({
        userId: user._id,
        email: user.email,
        brandName: brandName,
        industry: 'General',
        description: `Brand owned by ${firstName} ${lastName}`.trim(),
        locations: ['Global']
      });
      console.log(`Auto-created brand owner profile for ${user.email}`);
    }
  }
};

// Get available users to message (Brand Owners for Influencers and vice versa)
export const getAvailableUsers = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Ensure current user has a profile
    await ensureProfileExists(currentUser);
    
    let availableUsers = [];
    
    if (currentUser.role === "Influencer") {
      // Show Brand Owners to Influencers
      const brandOwners = await User.find({ 
        role: "Brand Owner",
        isVerified: true,
        _id: { $ne: currentUserId }
      }).select('firstName lastName email');
      
      // Ensure all brand owners have profiles and get their data
      for (const user of brandOwners) {
        await ensureProfileExists(user);
        
        const profile = await BrandOwnerProfile.findOne({ userId: user._id })
          .select('brandName brandLogo industry description');
        
        availableUsers.push({
          userId: user._id,
          email: user.email,
          role: user.role,
          profile: {
            name: profile?.brandName || `${user.firstName} ${user.lastName}`,
            logo: profile?.brandLogo || null,
            industry: profile?.industry || 'Brand Owner',
            description: profile?.description || `Brand owned by ${user.firstName} ${user.lastName}`
          }
        });
      }
    } else if (currentUser.role === "Brand Owner") {
      // Show Influencers to Brand Owners
      const influencers = await User.find({ 
        role: "Influencer",
        isVerified: true,
        _id: { $ne: currentUserId }
      }).select('firstName lastName email');
      
      // Ensure all influencers have profiles and get their data
      for (const user of influencers) {
        await ensureProfileExists(user);
        
        const profile = await InfluencerProfile.findOne({ userId: user._id })
          .select('firstName lastName userName profilePhoto category about');
        
        availableUsers.push({
          userId: user._id,
          email: user.email,
          role: user.role,
          profile: {
            name: profile?.firstName && profile?.lastName 
              ? `${profile.firstName} ${profile.lastName}` 
              : `${user.firstName} ${user.lastName}`,
            userName: profile?.userName || user.email.split('@')[0],
            photo: profile?.profilePhoto || null,
            categories: profile?.category || ['General'],
            about: profile?.about || `Influencer: ${user.firstName} ${user.lastName}`
          }
        });
      }
    }
    
    res.status(200).json({
      success: true,
      users: availableUsers,
      currentUserRole: currentUser.role
    });
  } catch (error) {
    console.error("Error fetching available users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch available users",
      error: error.message
    });
  }
};

// Get all profiles for messaging (separate method for better debugging)
export const getAllProfiles = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    let profiles = [];
    
    if (currentUser.role === "Influencer") {
      // Get all Brand Owners (with or without profiles)
      const brandOwners = await User.find({
        role: "Brand Owner",
        isVerified: true,
        _id: { $ne: currentUserId }
      }).select('firstName lastName email');
      
      for (const user of brandOwners) {
        const profile = await BrandOwnerProfile.findOne({ userId: user._id })
          .select('brandName brandLogo industry description');
        
        profiles.push({
          userId: user._id,
          email: user.email,
          role: user.role,
          profile: {
            name: profile?.brandName || `${user.firstName} ${user.lastName}`,
            logo: profile?.brandLogo || null,
            industry: profile?.industry || 'Brand Owner',
            description: profile?.description || `Brand owned by ${user.firstName} ${user.lastName}`
          }
        });
      }
        
    } else if (currentUser.role === "Brand Owner") {
      // Get all Influencers (with or without profiles)
      const influencers = await User.find({
        role: "Influencer",
        isVerified: true,
        _id: { $ne: currentUserId }
      }).select('firstName lastName email');
      
      for (const user of influencers) {
        const profile = await InfluencerProfile.findOne({ userId: user._id })
          .select('firstName lastName userName profilePhoto category about');
        
        profiles.push({
          userId: user._id,
          email: user.email,
          role: user.role,
          profile: {
            name: profile?.firstName && profile?.lastName 
              ? `${profile.firstName} ${profile.lastName}` 
              : `${user.firstName} ${user.lastName}`,
            userName: profile?.userName || user.email.split('@')[0],
            photo: profile?.profilePhoto || null,
            categories: profile?.category || ['General'],
            about: profile?.about || `Influencer: ${user.firstName} ${user.lastName}`
          }
        });
      }
    }
    
    res.status(200).json({
      success: true,
      users: profiles,
      currentUserRole: currentUser.role,
      totalCount: profiles.length
    });
  } catch (error) {
    console.error("Error fetching profiles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profiles",
      error: error.message
    });
  }
};

// Create basic profiles for users who don't have them
export const createBasicProfiles = async (req, res) => {
  try {
    let created = { influencers: 0, brandOwners: 0 };
    
    // Create basic influencer profiles for users without profiles
    const influencersWithoutProfiles = await User.find({ role: "Influencer" });
    for (const user of influencersWithoutProfiles) {
      const existingProfile = await InfluencerProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        await InfluencerProfile.create({
          userId: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          userName: user.email.split('@')[0],
          about: `Influencer: ${user.firstName} ${user.lastName}`,
          category: ['General'],
          locations: ['Global']
        });
        created.influencers++;
      }
    }
    
    // Create basic brand owner profiles for users without profiles
    const brandOwnersWithoutProfiles = await User.find({ role: "Brand Owner" });
    for (const user of brandOwnersWithoutProfiles) {
      const existingProfile = await BrandOwnerProfile.findOne({ userId: user._id });
      if (!existingProfile) {
        await BrandOwnerProfile.create({
          userId: user._id,
          email: user.email,
          brandName: `${user.firstName} ${user.lastName} Brand`,
          industry: 'General',
          description: `Brand owned by ${user.firstName} ${user.lastName}`,
          locations: ['Global']
        });
        created.brandOwners++;
      }
    }
    
    res.status(200).json({
      success: true,
      message: "Basic profiles created successfully",
      created: created
    });
  } catch (error) {
    console.error("Error creating basic profiles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create basic profiles",
      error: error.message
    });
  }
};

// Debug method to check database content
export const debugProfiles = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    
    // Get counts
    const totalUsers = await User.countDocuments();
    const verifiedUsers = await User.countDocuments({ isVerified: true });
    const brandOwners = await User.countDocuments({ role: "Brand Owner" });
    const influencers = await User.countDocuments({ role: "Influencer" });
    const brandProfiles = await BrandOwnerProfile.countDocuments();
    const influencerProfiles = await InfluencerProfile.countDocuments();
    
    // Get sample data
    const sampleBrandOwners = await User.find({ role: "Brand Owner" })
      .select('firstName lastName email isVerified')
      .limit(3);
    
    const sampleInfluencers = await User.find({ role: "Influencer" })
      .select('firstName lastName email isVerified')
      .limit(3);
    
    const sampleBrandProfiles = await BrandOwnerProfile.find({})
      .populate('userId', 'firstName lastName email')
      .select('brandName userId')
      .limit(3);
    
    const sampleInfluencerProfiles = await InfluencerProfile.find({})
      .populate('userId', 'firstName lastName email')
      .select('firstName lastName userName userId')
      .limit(3);
    
    res.status(200).json({
      success: true,
      currentUser: {
        id: currentUser._id,
        role: currentUser.role,
        email: currentUser.email,
        isVerified: currentUser.isVerified
      },
      counts: {
        totalUsers,
        verifiedUsers,
        brandOwners,
        influencers,
        brandProfiles,
        influencerProfiles
      },
      samples: {
        brandOwners: sampleBrandOwners,
        influencers: sampleInfluencers,
        brandProfiles: sampleBrandProfiles,
        influencerProfiles: sampleInfluencerProfiles
      }
    });
  } catch (error) {
    console.error("Error in debug profiles:", error);
    res.status(500).json({
      success: false,
      message: "Debug failed",
      error: error.message
    });
  }
};

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    
    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: "Message not found"
      });
    }
    
    // Only sender can delete their message
    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: "Can only delete your own messages"
      });
    }
    
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    res.status(200).json({
      success: true,
      message: "Message deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete message",
      error: error.message
    });
  }
};

// Mark conversation as read
export const markConversationAsRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    // Update all unread messages in conversation for this user
    await Message.updateMany(
      {
        conversationId: conversationId,
        receiverId: userId,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    // Reset unread count in conversation metadata
    const conversation = await Conversation.findById(conversationId);
    if (conversation) {
      const user = await User.findById(userId);
      const userRole = user.role === "Brand Owner" ? "brand" : "influencer";
      conversation.metadata.unreadCount[userRole] = 0;
      await conversation.save();
    }
    
    res.status(200).json({
      success: true,
      message: "Conversation marked as read"
    });
  } catch (error) {
    console.error("Error marking conversation as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark conversation as read",
      error: error.message
    });
  }
};
import { Message, Conversation } from "../model/message_model.js";
import { Promotion } from "../model/promotion_model.js";
import { Application } from "../model/promotion_model.js";
import { InfluencerProfile } from "../model/profile.js";
import User from "../model/users.js";

// Get notification counts for navbar
export const getNotificationCounts = async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    let counts = { messages: 0, promotions: 0, notifications: 0, sticks: 0 };

    // Unread messages
    const unreadMessages = await Message.countDocuments({
      receiverId: userId, isRead: false, isDeleted: false
    });
    counts.messages = unreadMessages;
    counts.notifications = unreadMessages;

    if (user.role === "Brand Owner") {
      const brandPromotions = await Promotion.find({ brandOwnerId: userId });
      counts.promotions = brandPromotions.length;
      // Count pending proposals
      const promotionIds = brandPromotions.map(p => p._id);
      counts.proposals = await Application.countDocuments({ campaignId: { $in: promotionIds }, status: "pending" });
    } else if (user.role === "Influencer") {
      // Available active campaigns
      counts.promotions = await Promotion.countDocuments({ status: "active", applicationStatus: "open" });
      // Applications count
      counts.applications = await Application.countDocuments({ influencerId: userId });
      // Sticks balance — the key fix for home screen showing 0
      let profile = await InfluencerProfile.findOne({ userId });
      if (!profile) {
        // Create profile if it doesn't exist
        profile = await InfluencerProfile.create({
          userId,
          email: user.email,
          firstName: user.firstName || 'User',
          lastName: user.lastName || '',
          userName: user.email.split('@')[0],
          sticks: { 
            free: 100, 
            purchased: 0, 
            total: 100, 
            spent: 0, 
            transactions: [{ type: "earned", amount: 100, description: "Welcome bonus — 100 free sticks", date: new Date() }] 
          }
        });
      } else {
        // Backfill sticks if missing
        if (!profile.sticks || profile.sticks.total === undefined || (profile.sticks.total === 0 && profile.sticks.free === 0 && profile.sticks.purchased === 0)) {
          profile.sticks = { 
            free: 100, 
            purchased: 0, 
            total: 100, 
            spent: 0, 
            transactions: [{ type: "earned", amount: 100, description: "Welcome bonus — 100 free sticks", date: new Date() }] 
          };
          await profile.save();
        }
      }
      counts.sticks = profile.sticks?.total ?? 0;
    }

    res.status(200).json({ success: true, counts, userRole: user.role });
  } catch (error) {
    console.error("Error fetching notification counts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch notification counts", error: error.message });
  }
};

// Get detailed notifications (for future notification page)
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get recent messages as notifications
    const messageNotifications = await Message.find({
      receiverId: userId,
      isDeleted: false
    })
    .populate('senderId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);

    const notifications = messageNotifications.map(msg => ({
      id: msg._id,
      type: 'message',
      title: `New message from ${msg.senderId.firstName} ${msg.senderId.lastName}`,
      message: msg.content || 'Sent you a file',
      isRead: msg.isRead,
      createdAt: msg.createdAt,
      data: {
        senderId: msg.senderId._id,
        conversationId: msg.conversationId
      }
    }));

    res.status(200).json({
      success: true,
      notifications: notifications,
      pagination: {
        page,
        limit,
        hasMore: notifications.length === limit
      }
    });

  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch notifications",
      error: error.message
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId, type } = req.body;
    const userId = req.user.id;

    if (type === 'message') {
      await Message.findOneAndUpdate(
        { _id: notificationId, receiverId: userId },
        { isRead: true, readAt: new Date() }
      );
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read"
    });

  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Failed to mark notification as read",
      error: error.message
    });
  }
};
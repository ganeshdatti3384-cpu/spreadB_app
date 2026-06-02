import { Notification } from "../model/notification_model.js";

// GET all notifications for logged-in user
 
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50);

    res.status(200).json({
      count: notifications.length,
      notifications,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};


export const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    res.status(200).json({
      message: "Notification marked as read",
      notification,
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// Mark all as read
 
export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { userId: req.user._id, read: false },
      { read: true }
    );

    res.status(200).json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE single notification
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    res.status(200).json({
      message: "Notification deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE all notifications for logged-in user
export const deleteAllNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    await Notification.deleteMany({ userId });

    res.status(200).json({
      message: "All notifications deleted successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};



// import { Notification } from "../model/notification_model.js";

// export const getNotifications = async (req, res) => {
//   try {
//     const userId = req.user._id;

//     const notifications = await Notification.find({ userId }).sort({
//       createdAt: -1,
//     });

//     return res.status(200).json({
//       count: notifications.length,
//       notifications,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

// export const markAsRead = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const updated = await Notification.findByIdAndUpdate(
//       id,
//       { read: true },
//       { new: true }
//     );

//     return res.status(200).json({
//       message: "Notification marked as read",
//       updated,
//     });
//   } catch (err) {
//     return res.status(500).json({ message: "Server Error" });
//   }
// };

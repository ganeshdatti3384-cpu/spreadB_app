import express from "express";
import {
  getUserConversations,
  getConversationMessages,
  sendMessage,
  getAvailableUsers,
  getAllProfiles,
  createBasicProfiles,
  debugProfiles,
  deleteMessage,
  markConversationAsRead,
  editMessage
} from "../controller/message_controller.js";
import { protect } from "../middleware/auth_middleware.js";
import multer from "multer";
import path from "path";
import multerS3 from "multer-s3";
import { s3, s3BucketName } from "../utils/s3Config.js";

const router = express.Router();

// Configure multer for file uploads
const storage = multerS3({
  s3: s3,
  bucket: s3BucketName,
  contentType: multerS3.AUTO_CONTENT_TYPE,
  key: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `messages/${file.fieldname}-${uniqueSuffix}${extension}`);
  }
});

// File filter for allowed file types
const fileFilter = (req, file, cb) => {
  // Allow images
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  }
  // Allow videos
  else if (file.mimetype.startsWith('video/')) {
    cb(null, true);
  }
  // Allow audio
  else if (file.mimetype.startsWith('audio/')) {
    cb(null, true);
  }
  // Allow documents
  else if (file.mimetype === 'application/pdf' || 
           file.mimetype === 'application/msword' ||
           file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
           file.mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
           file.mimetype === 'text/plain' ||
           file.mimetype === 'text/csv') {
    cb(null, true);
  }
  // Allow other common file types
  else if (file.mimetype === 'application/zip' ||
           file.mimetype === 'application/x-zip-compressed') {
    cb(null, true);
  }
  else {
    cb(new Error('Invalid file type. Allowed: images, videos, audio, documents (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV) and ZIP files.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit for video/audio support
  }
});

// Routes

// GET /api/messages/conversations - Get all conversations for user
router.get("/conversations", protect, getUserConversations);

// GET /api/messages/conversations/:conversationId - Get messages for specific conversation
router.get("/conversations/:conversationId", protect, getConversationMessages);

// POST /api/messages/send - Send a new message (with optional file)
router.post("/send", protect, upload.single('file'), sendMessage);

// GET /api/messages/users - Get available users to message
router.get("/users", protect, getAvailableUsers);

// GET /api/messages/profiles - Get all profiles for messaging
router.get("/profiles", protect, getAllProfiles);

// POST /api/messages/create-basic-profiles - Create basic profiles for users without profiles
router.post("/create-basic-profiles", protect, createBasicProfiles);

// GET /api/messages/debug - Debug profiles and database content
router.get("/debug", protect, debugProfiles);

// GET /api/messages/test - Simple test endpoint
router.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Message routes are working!",
    timestamp: new Date().toISOString()
  });
});

// DELETE /api/messages/:messageId - Delete a message
router.delete("/:messageId", protect, deleteMessage);

// PUT /api/messages/:messageId - Edit a text message
router.put("/:messageId", protect, editMessage);

// PUT /api/messages/conversations/:conversationId/read - Mark conversation as read
router.put("/conversations/:conversationId/read", protect, markConversationAsRead);

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 25MB.'
      });
    }
  }
  
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  next(error);
});

export default router;
const express = require('express');
const multer = require('multer');
const path = require('path');
const router = express.Router();

const { authenticateRest } = require('../middleware/sessionAuth');
const {
  getChatRooms,
  getMessages,
  sendMessage,
  markAsRead,
  getStores,
  createChatRoom,
  uploadImage
} = require('../controllers/chatController');

// Multer configuration for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/var/www/html/public/assets/images/chat');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'chat-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// All routes require authentication
router.use(authenticateRest);

// Get all chat rooms for current user
router.get('/rooms', getChatRooms);

// Get stores (for buyer to start new chat)
router.get('/stores', getStores);

// Create new chat room
router.post('/rooms', createChatRoom);

// Get messages for a specific room
router.get('/rooms/:storeId/:buyerId/messages', getMessages);

// Send message
router.post('/rooms/:storeId/:buyerId/messages', sendMessage);

// Mark messages as read
router.put('/rooms/:storeId/:buyerId/read', markAsRead);

// Upload image
router.post('/upload-image', upload.single('image'), uploadImage);

module.exports = router;

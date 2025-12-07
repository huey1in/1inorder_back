const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');
const { userValidation, handleValidationErrors } = require('../middleware/validation');
const { upload, uploadErrorHandler, processUploadedFiles } = require('../middleware/upload');

// 微信小程序登录
router.post('/wx-login', authController.wxLogin);

// 绑定手机号（需要登录）
router.post('/bind-phone',
  authenticateToken,
  [
    body('phone').notEmpty().withMessage('手机号为必填项'),
    handleValidationErrors
  ],
  authController.bindPhone
);

router.post('/register', userValidation.register, authController.register);

router.post('/login', userValidation.login, authController.login);

router.get('/check', authenticateToken, authController.checkToken);

router.get('/profile', authenticateToken, authController.getProfile);

router.put('/profile', authenticateToken, userValidation.updateProfile, authController.updateProfile);

router.post('/change-password',
  authenticateToken,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('当前密码为必填项'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('新密码长度至少 6 位'),
    handleValidationErrors
  ],
  authController.changePassword
);

router.post('/upload-avatar',
  authenticateToken,
  upload.single('avatar'),
  uploadErrorHandler,
  processUploadedFiles,
  authController.uploadAvatar
);

module.exports = router;

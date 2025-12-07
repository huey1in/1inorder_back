const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// 公开接口
// 获取店铺信息
router.get('/info', shopController.getShopInfo);

// 检查是否营业
router.get('/check-open', shopController.checkOpen);

// 获取公告
router.get('/announcement', shopController.getAnnouncement);

// 管理员接口
// 更新店铺信息
router.put('/info', authenticateToken, requireAdmin, shopController.updateShopInfo);

// 更新公告
router.put('/announcement', authenticateToken, requireAdmin, shopController.updateAnnouncement);

// 切换营业状态
router.patch('/toggle-open', authenticateToken, requireAdmin, shopController.toggleOpen);

module.exports = router;

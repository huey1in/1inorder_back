const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin/adminController');
const userAdminController = require('../controllers/admin/userAdminController');
const productAdminController = require('../controllers/admin/productAdminController');
const orderAdminController = require('../controllers/admin/orderAdminController');
const categoryAdminController = require('../controllers/admin/categoryAdminController');

// 管理员认证中间件
const requireAdmin = (req, res, next) => {
  if (!req.session.adminUser || req.session.adminUser.role !== 'admin') {
    return res.status(401).json({ success: false, message: '需要管理员权限' });
  }
  next();
};

// ==================== 认证相关 ====================
router.post('/api/login', adminController.adminLogin);
router.post('/api/logout', adminController.adminLogout);
router.get('/api/auth/check', (req, res) => {
  if (req.session.adminUser && req.session.adminUser.role === 'admin') {
    res.json({ success: true, user: req.session.adminUser });
  } else {
    res.status(401).json({ success: false, message: '未登录或session已过期' });
  }
});

// ==================== 仪表盘 ====================
router.get('/api/dashboard', requireAdmin, adminController.getDashboardStats);

// ==================== 用户管理 ====================
router.get('/api/users', requireAdmin, userAdminController.getUsersApi);
router.post('/api/users/:id/toggle', requireAdmin, userAdminController.toggleUserStatusApi);
router.delete('/api/users/:id', requireAdmin, userAdminController.deleteUserApi);

// ==================== 商品管理 ====================
router.get('/api/products', requireAdmin, productAdminController.getProductsApi);
router.post('/api/products', requireAdmin, productAdminController.createProductApi);
router.put('/api/products/:id', requireAdmin, productAdminController.updateProductApi);
router.delete('/api/products/:id', requireAdmin, productAdminController.deleteProductApi);
router.post('/api/products/:id/toggle', requireAdmin, productAdminController.toggleProductStatusApi);
router.get('/api/products/categories', requireAdmin, productAdminController.getCategoriesApi);

// ==================== 订单管理 ====================
router.get('/api/orders', requireAdmin, orderAdminController.getOrdersApi);
router.get('/api/orders/:id', requireAdmin, orderAdminController.getOrderDetailsApi);
router.put('/api/orders/:id/status', requireAdmin, orderAdminController.updateOrderStatusApi);
router.put('/api/orders/:id/payment', requireAdmin, orderAdminController.updatePaymentStatusApi);
router.delete('/api/orders/:id', requireAdmin, orderAdminController.deleteOrderApi);
router.get('/api/orders/stats', requireAdmin, orderAdminController.getOrderStatsApi);

// ==================== 分类管理 ====================
router.get('/api/categories', requireAdmin, categoryAdminController.getCategoriesApi);
router.post('/api/categories', requireAdmin, categoryAdminController.createCategoryApi);
router.put('/api/categories/:id', requireAdmin, categoryAdminController.updateCategoryApi);
router.delete('/api/categories/:id', requireAdmin, categoryAdminController.deleteCategoryApi);
router.post('/api/categories/:id/toggle', requireAdmin, categoryAdminController.toggleCategoryStatusApi);
router.get('/api/categories/parents', requireAdmin, categoryAdminController.getParentCategoriesApi);

module.exports = router;
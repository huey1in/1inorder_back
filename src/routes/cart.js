const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticateToken } = require('../middleware/auth');

// 所有购物车接口都需要登录
router.use(authenticateToken);

// 获取购物车
router.get('/', cartController.getCart);

// 获取购物车商品数量
router.get('/count', cartController.getCartCount);

// 添加商品到购物车
router.post('/add', cartController.addToCart);

// 更新购物车商品数量
router.patch('/item/:id', cartController.updateCartItem);

// 从购物车移除商品
router.delete('/item/:id', cartController.removeFromCart);

// 清空购物车
router.delete('/clear', cartController.clearCart);

module.exports = router;

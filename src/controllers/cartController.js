const Cart = require('../models/Cart');

/**
 * 获取购物车
 */
const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.getByUserId(userId);

    res.json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({
      success: false,
      message: '获取购物车失败'
    });
  }
};

/**
 * 添加商品到购物车
 */
const addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1, specs } = req.body;

    if (!product_id) {
      return res.status(400).json({
        success: false,
        message: '商品ID不能为空'
      });
    }

    const cart = await Cart.addItem(userId, product_id, quantity, specs);

    res.json({
      success: true,
      message: '添加成功',
      data: { cart }
    });
  } catch (error) {
    console.error('Add to cart error:', error);
    res.status(400).json({
      success: false,
      message: error.message || '添加购物车失败'
    });
  }
};

/**
 * 更新购物车商品数量
 */
const updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { quantity } = req.body;

    if (quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: '数量不能为空'
      });
    }

    const cart = await Cart.updateQuantity(userId, parseInt(id), quantity);

    res.json({
      success: true,
      message: '更新成功',
      data: { cart }
    });
  } catch (error) {
    console.error('Update cart item error:', error);
    res.status(400).json({
      success: false,
      message: error.message || '更新购物车失败'
    });
  }
};

/**
 * 从购物车移除商品
 */
const removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const cart = await Cart.removeItem(userId, parseInt(id));

    res.json({
      success: true,
      message: '移除成功',
      data: { cart }
    });
  } catch (error) {
    console.error('Remove from cart error:', error);
    res.status(500).json({
      success: false,
      message: '移除购物车商品失败'
    });
  }
};

/**
 * 清空购物车
 */
const clearCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.clear(userId);

    res.json({
      success: true,
      message: '购物车已清空',
      data: { cart }
    });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({
      success: false,
      message: '清空购物车失败'
    });
  }
};

/**
 * 获取购物车商品数量
 */
const getCartCount = async (req, res) => {
  try {
    const userId = req.user.id;
    const count = await Cart.getCount(userId);

    res.json({
      success: true,
      data: { count }
    });
  } catch (error) {
    console.error('Get cart count error:', error);
    res.status(500).json({
      success: false,
      message: '获取购物车数量失败'
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  getCartCount
};

const database = require('../config/database');

// 默认商品图片路径
const DEFAULT_PRODUCT_IMAGE = '/uploads/products/default.svg';

// 获取完整的图片URL
function getImageUrl(imagePath) {
  if (!imagePath) return `${process.env.BASE_URL}${DEFAULT_PRODUCT_IMAGE}`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.BASE_URL}${imagePath}`;
}

class Cart {
  /**
   * 添加商品到购物车
   */
  static async addItem(userId, productId, quantity = 1, specs = null) {
    // 检查商品是否存在
    const products = await database.query(`
      SELECT id, name, price, stock_quantity, is_available 
      FROM products WHERE id = ?
    `, [productId]);

    if (!products[0]) {
      throw new Error('商品不存在');
    }

    const product = products[0];
    if (!product.is_available) {
      throw new Error('商品已下架');
    }

    // 检查购物车是否已有该商品（相同规格）
    const specsJson = specs ? JSON.stringify(specs) : null;
    const existingItems = await database.query(`
      SELECT id, quantity FROM cart_items 
      WHERE user_id = ? AND product_id = ? AND (specs = ? OR (specs IS NULL AND ? IS NULL))
    `, [userId, productId, specsJson, specsJson]);

    if (existingItems[0]) {
      // 更新数量
      const newQuantity = existingItems[0].quantity + quantity;
      
      // 检查库存
      if (newQuantity > product.stock_quantity) {
        throw new Error('库存不足');
      }

      await database.query(`
        UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [newQuantity, existingItems[0].id]);

      return this.getByUserId(userId);
    } else {
      // 检查库存
      if (quantity > product.stock_quantity) {
        throw new Error('库存不足');
      }

      // 新增
      await database.query(`
        INSERT INTO cart_items (user_id, product_id, quantity, specs)
        VALUES (?, ?, ?, ?)
      `, [userId, productId, quantity, specsJson]);

      return this.getByUserId(userId);
    }
  }

  /**
   * 更新购物车商品数量
   */
  static async updateQuantity(userId, cartItemId, quantity) {
    if (quantity <= 0) {
      return this.removeItem(userId, cartItemId);
    }

    // 检查库存
    const items = await database.query(`
      SELECT ci.*, p.stock_quantity 
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.id = ? AND ci.user_id = ?
    `, [cartItemId, userId]);

    if (!items[0]) {
      throw new Error('购物车商品不存在');
    }

    if (quantity > items[0].stock_quantity) {
      throw new Error('库存不足');
    }

    await database.query(`
      UPDATE cart_items SET quantity = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [quantity, cartItemId, userId]);

    return this.getByUserId(userId);
  }

  /**
   * 从购物车移除商品
   */
  static async removeItem(userId, cartItemId) {
    await database.query(`
      DELETE FROM cart_items WHERE id = ? AND user_id = ?
    `, [cartItemId, userId]);

    return this.getByUserId(userId);
  }

  /**
   * 获取用户购物车
   */
  static async getByUserId(userId) {
    const items = await database.query(`
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        ci.specs,
        ci.created_at,
        p.id as product_id,
        p.name,
        p.price,
        p.images,
        p.stock_quantity,
        p.is_available,
        c.name as category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE ci.user_id = ?
      ORDER BY ci.created_at DESC
    `, [userId]);

    let totalAmount = 0;
    let totalCount = 0;

    const cartItems = items.map(item => {
      const rawImages = item.images ? JSON.parse(item.images) : [];
      // 将图片路径转换为完整URL
      const images = rawImages.length > 0 
        ? rawImages.map(img => getImageUrl(img))
        : [getImageUrl(null)];
      const specs = item.specs ? JSON.parse(item.specs) : null;
      const itemTotal = parseFloat(item.price) * item.quantity;
      
      totalAmount += itemTotal;
      totalCount += item.quantity;

      return {
        cart_item_id: item.cart_item_id,
        product_id: item.product_id,
        name: item.name,
        price: parseFloat(item.price),
        quantity: item.quantity,
        specs,
        images,
        stock_quantity: item.stock_quantity,
        is_available: item.is_available,
        category_name: item.category_name,
        item_total: itemTotal
      };
    });

    return {
      items: cartItems,
      total_amount: totalAmount,
      total_count: totalCount
    };
  }

  /**
   * 清空购物车
   */
  static async clear(userId) {
    await database.query(`
      DELETE FROM cart_items WHERE user_id = ?
    `, [userId]);

    return { items: [], total_amount: 0, total_count: 0 };
  }

  /**
   * 选择性清空购物车（创建订单后）
   */
  static async removeItems(userId, cartItemIds) {
    if (!cartItemIds || cartItemIds.length === 0) return;

    const placeholders = cartItemIds.map(() => '?').join(',');
    await database.query(`
      DELETE FROM cart_items 
      WHERE user_id = ? AND id IN (${placeholders})
    `, [userId, ...cartItemIds]);
  }

  /**
   * 获取购物车商品数量
   */
  static async getCount(userId) {
    const result = await database.query(`
      SELECT COALESCE(SUM(quantity), 0) as count 
      FROM cart_items WHERE user_id = ?
    `, [userId]);
    return result[0]?.count || 0;
  }
}

module.exports = Cart;

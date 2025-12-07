const database = require('../config/database');

// 默认商品图片路径
const DEFAULT_PRODUCT_IMAGE = '/uploads/products/default.svg';

// 获取完整的图片URL
function getImageUrl(imagePath) {
  if (!imagePath) return `${process.env.BASE_URL}${DEFAULT_PRODUCT_IMAGE}`;
  if (imagePath.startsWith('http')) return imagePath;
  return `${process.env.BASE_URL}${imagePath}`;
}

class Order {
  static async create(orderData) {
    const {
      user_id, total_amount, delivery_fee = 0,
      order_type, delivery_address, notes, items,
      table_number, contact_name, contact_phone
    } = orderData;

    await database.beginTransaction();

    try {
      const orderNumber = this.generateOrderNumber();
      const pickupCode = order_type === 'pickup' ? this.generatePickupCode() : null;

      const result = await database.query(`
        INSERT INTO orders (
          user_id, order_number, total_amount, delivery_fee,
          order_type, delivery_address, notes,
          table_number, pickup_code, contact_name, contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        user_id, orderNumber, total_amount, delivery_fee,
        order_type, delivery_address || null, notes || null,
        table_number || null, pickupCode, contact_name || null, contact_phone || null
      ]);

      console.log('Order insert result:', result);

      // 获取插入的ID
      const orderId = result.insertId || result.lastID;
      console.log('Order insert ID:', orderId);

      if (!orderId) {
        throw new Error('订单创建失败，未获取到插入 ID');
      }

      for (const item of items) {
        await database.query(`
          INSERT INTO order_items (order_id, product_id, quantity, price, specs, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [orderId, item.product_id, item.quantity, item.price, 
            item.specs ? JSON.stringify(item.specs) : null, item.notes || null]);

        if (item.update_stock) {
          await database.query(`
            UPDATE products SET stock_quantity = stock_quantity - ?,
            sales_count = sales_count + ?
            WHERE id = ? AND stock_quantity >= ?
          `, [item.quantity, item.quantity, item.product_id, item.quantity]);
        }
      }

      await database.commit();
      return this.findById(orderId);

    } catch (error) {
      console.error('Order.create error:', error);
      await database.rollback();
      throw error;
    }
  }

  /**
   * 生成取餐号（4位数字）
   */
  static generatePickupCode() {
    return String(Math.floor(1000 + Math.random() * 9000));
  }

  static async findById(id) {
    const orders = await database.query(`
      SELECT
        o.*,
        u.phone,
        u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [id]);

    if (!orders[0]) return null;

    const order = orders[0];

    const items = await database.query(`
      SELECT
        oi.*,
        p.name as product_name,
        p.images
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [id]);

    items.forEach(item => {
      const rawImages = item.images ? JSON.parse(item.images) : [];
      item.images = rawImages.length > 0 
        ? rawImages.map(img => getImageUrl(img))
        : [getImageUrl(null)];
      item.specs = item.specs ? JSON.parse(item.specs) : null;
    });

    order.items = items;
    return order;
  }

  static async getByUser(userId, filters = {}) {
    const { status, page = 1, limit = 10 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT o.*
      FROM orders o
      WHERE o.user_id = ?
    `;
    const params = [userId];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    const countQuery = query.replace(
      'SELECT o.*',
      'SELECT COUNT(*) as total'
    );

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const orders = await database.query(query, params);
    const totalResult = await database.query(countQuery, params.slice(0, -2));
    const total = totalResult && totalResult[0] ? totalResult[0].total : 0;

    // 为每个订单获取订单项信息
    for (const order of orders) {
      const items = await database.query(`
        SELECT
          oi.*,
          p.name as product_name,
          p.images
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      // 解析图片JSON并转换为完整URL
      items.forEach(item => {
        const rawImages = item.images ? JSON.parse(item.images) : [];
        item.images = rawImages.length > 0 
          ? rawImages.map(img => getImageUrl(img))
          : [getImageUrl(null)];
      });

      order.items = items;
    }

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async updateStatus(id, status, notes = null) {
    let query = `UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];

    if (notes) {
      query += `, notes = ?`;
      params.push(notes);
    }

    query += ` WHERE id = ?`;
    params.push(id);

    await database.query(query, params);

    return this.findById(id);
  }

  static async updatePaymentStatus(id, paymentStatus) {
    // 验证支付状态
    const validStatuses = ['unpaid', 'paid', 'refunded'];
    if (!validStatuses.includes(paymentStatus)) {
      throw new Error(`支付状态无效，必须为：${validStatuses.join(', ')}`);
    }

    await database.query(`
      UPDATE orders 
      SET payment_status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [paymentStatus, id]);

    return this.findById(id);
  }



  static async getAll(filters = {}) {
    const { 
      status, payment_status, order_type, keyword,
      page = 1, limit = 10 
    } = filters;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = `
      SELECT o.*, u.phone, u.nickname
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND o.status = ?';
      params.push(status);
    }

    if (payment_status) {
      query += ' AND o.payment_status = ?';
      params.push(payment_status);
    }

    if (order_type) {
      query += ' AND o.order_type = ?';
      params.push(order_type);
    }

    if (keyword) {
      query += ' AND (o.order_number LIKE ? OR u.phone LIKE ? OR u.nickname LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const countQuery = query.replace(
      'SELECT o.*, u.phone, u.nickname',
      'SELECT COUNT(*) as total'
    );

    query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const orders = await database.query(query, params);
    const totalResult = await database.query(countQuery, params.slice(0, -2));
    const total = totalResult && totalResult[0] ? totalResult[0].total : 0;

    // 为每个订单获取订单项信息
    for (const order of orders) {
      const items = await database.query(`
        SELECT
          oi.*,
          p.name as product_name,
          p.images
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      items.forEach(item => {
        const rawImages = item.images ? JSON.parse(item.images) : [];
        item.images = rawImages.length > 0 
          ? rawImages.map(img => getImageUrl(img))
          : [getImageUrl(null)];
        item.specs = item.specs ? JSON.parse(item.specs) : null;
      });

      order.items = items;
    }

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    };
  }

  static async getStatistics(filters = {}) {
    const { start_date, end_date } = filters;

    let query = 'SELECT COUNT(*) as total_orders, SUM(total_amount) as total_revenue FROM orders WHERE 1=1';
    const params = [];

    if (start_date) {
      query += ' AND created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND created_at <= ?';
      params.push(end_date);
    }

    const result = await database.query(query, params);

    const statusQuery = query.replace(
      'COUNT(*) as total_orders, SUM(total_amount) as total_revenue',
      'status, COUNT(*) as count'
    ) + ' GROUP BY status';

    const statusStats = await database.query(statusQuery, params);

    return {
      total_orders: result[0].total_orders || 0,
      total_revenue: result[0].total_revenue || 0,
      status_breakdown: statusStats
    };
  }

  static generateOrderNumber() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const timestamp = now.getTime().toString().slice(-6);

    return `ORD${year}${month}${day}${timestamp}`;
  }

  static async cancel(id, reason = null) {
    const order = await this.findById(id);
    if (!order) throw new Error('订单不存在');

    if (['delivered', 'cancelled'].includes(order.status)) {
      throw new Error('该订单无法取消');
    }

    await database.beginTransaction();

    try {
      await database.query(`
        UPDATE orders SET status = 'cancelled', notes = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [reason, id]);

      for (const item of order.items) {
        await database.query(`
          UPDATE products SET stock_quantity = stock_quantity + ?
          WHERE id = ?
        `, [item.quantity, item.product_id]);
      }

      await database.commit();
      return this.findById(id);

    } catch (error) {
      await database.rollback();
      throw error;
    }
  }

  static async deleteById(id) {
    const database = require('../config/database');
    
    try {
      await database.beginTransaction();

      // 删除订单项
      await database.query(`
        DELETE FROM order_items WHERE order_id = ?
      `, [id]);

      // 删除订单
      const result = await database.query(`
        DELETE FROM orders WHERE id = ?
      `, [id]);

      await database.commit();
      return result.affectedRows > 0;

    } catch (error) {
      await database.rollback();
      throw error;
    }
  }
}

module.exports = Order;

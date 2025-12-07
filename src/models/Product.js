const database = require('../config/database');

// 默认商品图片路径
const DEFAULT_PRODUCT_IMAGE = '/uploads/products/default.svg';

class Product {
  // 获取完整的图片URL
  static getImageUrl(imagePath) {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}${imagePath}`;
  }

  // 格式化商品数据，将图片路径转换为完整URL
  static formatProduct(product) {
    if (!product) return null;
    const images = product.images ? 
      (typeof product.images === 'string' ? JSON.parse(product.images) : product.images) : 
      [DEFAULT_PRODUCT_IMAGE];
    
    return {
      ...product,
      images: images.map(img => this.getImageUrl(img))
    };
  }

  static async create(productData) {
    try {
      const {
        name, description, price, stock_quantity = 0,
        category_id, images, is_available = true
      } = productData;

      // 如果没有提供图片，使用默认图片
      const productImages = images && images.length > 0 ? images : [DEFAULT_PRODUCT_IMAGE];

      const result = await database.query(`
        INSERT INTO products (
          name, description, price, stock_quantity,
          category_id, images, is_available
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        name, description || null, price, stock_quantity,
        category_id, JSON.stringify(productImages), is_available
      ]);

      console.log('Product insert result:', result);

      // 获取插入的ID
      const insertId = result.insertId || result.lastID;
      console.log('Product insert ID:', insertId);

      if (!insertId) {
        throw new Error('创建商品失败，未获取到插入 ID');
      }

      return this.findById(insertId);
    } catch (error) {
      console.error('Product.create error:', error);
      throw error;
    }
  }

  static async findById(id) {
    const products = await database.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = ?
    `, [id]);

    return this.formatProduct(products[0]);
  }

  static async getAll(filters = {}) {
    const {
      category_id, is_available = true,
      page = 1, limit = 10, search, min_price, max_price
    } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (is_available !== null) {
      query += ' AND p.is_available = ?';
      params.push(is_available);
    }

    if (category_id) {
      query += ' AND p.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (min_price) {
      query += ' AND p.price >= ?';
      params.push(min_price);
    }

    if (max_price) {
      query += ' AND p.price <= ?';
      params.push(max_price);
    }

    const countQuery = query.replace(
      'SELECT p.*, c.name as category_name',
      'SELECT COUNT(*) as total'
    );

    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const products = await database.query(query, params);
    const totalResult = await database.query(countQuery, params.slice(0, -2));
    const total = totalResult[0].total;

    return {
      products: products.map(product => this.formatProduct(product)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async updateById(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'images') {
          fields.push(`${key} = ?`);
          values.push(JSON.stringify(updateData[key]));
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return null;

    values.push(id);

    await database.query(`
      UPDATE products SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    return this.findById(id);
  }

  static async updateStock(id, quantity, operation = 'decrease') {
    const product = await this.findById(id);
    if (!product) throw new Error('商品不存在');

    let newStock;
    if (operation === 'decrease') {
      newStock = product.stock_quantity - quantity;
      if (newStock < 0) throw new Error('库存不足');
    } else {
      newStock = product.stock_quantity + quantity;
    }

    await database.query(`
      UPDATE products SET stock_quantity = ?
      WHERE id = ?
    `, [newStock, id]);

    return newStock;
  }

  static async delete(id) {
    await database.query('UPDATE products SET is_available = false WHERE id = ?', [id]);
    return true;
  }

  static async getFeatured(limit = 10) {
    let query = `
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_available = true
      ORDER BY p.sales_count DESC, p.created_at DESC
    `;

    const params = [];
    if (limit && Number.isFinite(limit)) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const products = await database.query(query, params);

    return products.map(product => this.formatProduct(product));
  }

  static async getByCategory(categoryId, limit = 10) {
    const products = await database.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.category_id = ? AND p.is_available = true
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [categoryId, limit]);

    return products.map(product => this.formatProduct(product));
  }

  static async getRecommended(limit = 10) {
    const products = await database.query(`
      SELECT p.*, c.name as category_name
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.is_available = true
      ORDER BY p.created_at DESC
      LIMIT ?
    `, [limit]);

    return products.map(product => this.formatProduct(product));
  }
}

module.exports = Product;

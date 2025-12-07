const database = require('../config/database');

class Category {
  static async create(categoryData) {
    try {
      const { name, description, image, parent_id, sort_order = 0, type = 'product' } = categoryData;

      const result = await database.query(`
        INSERT INTO categories (name, description, image, parent_id, sort_order, type)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, description || null, image || null, parent_id || null, sort_order, type]);

      console.log('Insert result:', result);

      // 获取插入的ID
      const insertId = result.insertId || result.lastID;
      console.log('Insert ID:', insertId);

      if (!insertId) {
        throw new Error('创建分类失败，未获取到插入 ID');
      }

      return this.findById(insertId);
    } catch (error) {
      console.error('Category.create error:', error);
      throw error;
    }
  }

  static async findById(id) {
    const categories = await database.query('SELECT * FROM categories WHERE id = ?', [id]);
    return categories[0] || null;
  }

  static async getAll(options = {}) {
    // 如果传入的是字符串，当作 type 处理（兼容旧调用方式）
    if (typeof options === 'string') {
      options = { type: options };
    }

    const { type, page = 1, limit = 100, is_active = null } = options;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 100;
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM categories WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM categories WHERE 1=1';
    const params = [];
    const countParams = [];

    // 默认显示所有分类（包括禁用的），除非明确指定
    if (is_active !== null) {
      query += ' AND is_active = ?';
      countQuery += ' AND is_active = ?';
      params.push(is_active);
      countParams.push(is_active);
    }

    if (type) {
      query += ' AND type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    query += ' ORDER BY sort_order, name LIMIT ? OFFSET ?';
    params.push(limitNum, offset);

    const categories = await database.query(query, params);
    const totalResult = await database.query(countQuery, countParams);
    const total = totalResult[0]?.total || 0;

    return {
      categories,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  static async getTree(type = null) {
    const result = await this.getAll({ type, limit: 1000 });
    const categories = result.categories || result;

    const categoryMap = {};
    const tree = [];

    categories.forEach(category => {
      categoryMap[category.id] = { ...category, children: [] };
    });

    categories.forEach(category => {
      if (category.parent_id && categoryMap[category.parent_id]) {
        categoryMap[category.parent_id].children.push(categoryMap[category.id]);
      } else {
        tree.push(categoryMap[category.id]);
      }
    });

    return tree;
  }

  static async updateById(id, updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);

    await database.query(`
      UPDATE categories SET ${fields.join(', ')}
      WHERE id = ?
    `, values);

    return this.findById(id);
  }

  static async delete(id) {
    await database.query('UPDATE categories SET is_active = false WHERE id = ?', [id]);
    return true;
  }

  static async getChildren(parentId) {
    return database.query(`
      SELECT * FROM categories
      WHERE parent_id = ? AND is_active = true
      ORDER BY sort_order, name
    `, [parentId]);
  }
}

module.exports = Category;

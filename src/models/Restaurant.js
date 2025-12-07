const database = require('../config/database');

class Restaurant {
  static async create(restaurantData) {
    const {
      name, description, address, phone, email, owner_id,
      category_id, image, opening_hours, delivery_fee = 0, min_order_amount = 0
    } = restaurantData;

    const result = await database.query(`
      INSERT INTO restaurants (
        name, description, address, phone, email, owner_id,
        category_id, image, opening_hours, delivery_fee, min_order_amount
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      name, description, address, phone, email, owner_id,
      category_id, image, opening_hours, delivery_fee, min_order_amount
    ]);

    return this.findById(result.insertId);
  }

  static async findById(id) {
    const restaurants = await database.query(`
      SELECT r.*, c.name as category_name, u.username as owner_name
      FROM restaurants r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.owner_id = u.id
      WHERE r.id = ?
    `, [id]);

    return restaurants[0] || null;
  }

  static async getAll(filters = {}) {
    const { category_id, is_active = true, page = 1, limit = 10, search } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, c.name as category_name, u.username as owner_name
      FROM restaurants r
      LEFT JOIN categories c ON r.category_id = c.id
      LEFT JOIN users u ON r.owner_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (is_active !== null) {
      query += ' AND r.is_active = ?';
      params.push(is_active);
    }

    if (category_id) {
      query += ' AND r.category_id = ?';
      params.push(category_id);
    }

    if (search) {
      query += ' AND (r.name LIKE ? OR r.description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    const countQuery = query.replace(
      'SELECT r.*, c.name as category_name, u.username as owner_name',
      'SELECT COUNT(*) as total'
    );

    query += ' ORDER BY r.rating DESC, r.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const restaurants = await database.query(query, params);
    const totalResult = await database.query(countQuery, params.slice(0, -2));
    const total = totalResult[0].total;

    return {
      restaurants,
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
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return null;

    values.push(id);

    await database.query(`
      UPDATE restaurants SET ${fields.join(', ')}
      WHERE id = ?
    `, values);

    return this.findById(id);
  }

  static async delete(id) {
    await database.query('UPDATE restaurants SET is_active = false WHERE id = ?', [id]);
    return true;
  }

  static async getByOwner(ownerId) {
    return database.query(`
      SELECT r.*, c.name as category_name
      FROM restaurants r
      LEFT JOIN categories c ON r.category_id = c.id
      WHERE r.owner_id = ?
      ORDER BY r.created_at DESC
    `, [ownerId]);
  }

  static async getTables(restaurantId) {
    return database.query(`
      SELECT * FROM restaurant_tables
      WHERE restaurant_id = ?
      ORDER BY table_number
    `, [restaurantId]);
  }

  static async addTable(restaurantId, tableData) {
    const { table_number, capacity, qr_code } = tableData;

    const result = await database.query(`
      INSERT INTO restaurant_tables (restaurant_id, table_number, capacity, qr_code)
      VALUES (?, ?, ?, ?)
    `, [restaurantId, table_number, capacity, qr_code]);

    return result.insertId;
  }

  static async getDefault() {
    const restaurants = await database.query(`
      SELECT * FROM restaurants
      WHERE is_active = 1
      ORDER BY id ASC
      LIMIT 1
    `);

    return restaurants[0] || null;
  }
}

module.exports = Restaurant;
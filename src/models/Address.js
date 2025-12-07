const database = require('../config/database');

class Address {
  /**
   * 创建收货地址
   */
  static async create(addressData) {
    const {
      user_id, name, phone, province, city, district,
      detail, is_default = false, tag = ''
    } = addressData;

    // 如果设置为默认地址，先取消其他默认地址
    if (is_default) {
      await database.query(`
        UPDATE addresses SET is_default = 0 WHERE user_id = ?
      `, [user_id]);
    }

    const result = await database.query(`
      INSERT INTO addresses (
        user_id, name, phone, province, city, district,
        detail, is_default, tag
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [user_id, name, phone, province, city, district, detail, is_default ? 1 : 0, tag]);

    const insertId = result.insertId || result.lastID;
    return this.findById(insertId);
  }

  /**
   * 根据ID查找地址
   */
  static async findById(id) {
    const addresses = await database.query(`
      SELECT * FROM addresses WHERE id = ?
    `, [id]);
    return addresses[0] || null;
  }

  /**
   * 获取用户的所有地址
   */
  static async getByUserId(userId) {
    const addresses = await database.query(`
      SELECT * FROM addresses 
      WHERE user_id = ? 
      ORDER BY is_default DESC, created_at DESC
    `, [userId]);
    return addresses;
  }

  /**
   * 获取用户的默认地址
   */
  static async getDefaultByUserId(userId) {
    const addresses = await database.query(`
      SELECT * FROM addresses 
      WHERE user_id = ? AND is_default = 1
      LIMIT 1
    `, [userId]);
    return addresses[0] || null;
  }

  /**
   * 更新地址
   */
  static async updateById(id, userId, updateData) {
    const { is_default, ...otherData } = updateData;

    // 如果设置为默认地址，先取消其他默认地址
    if (is_default) {
      await database.query(`
        UPDATE addresses SET is_default = 0 WHERE user_id = ?
      `, [userId]);
    }

    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'is_default') {
          fields.push(`${key} = ?`);
          values.push(updateData[key] ? 1 : 0);
        } else {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      }
    });

    if (fields.length === 0) return null;

    values.push(id, userId);

    await database.query(`
      UPDATE addresses SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, values);

    return this.findById(id);
  }

  /**
   * 设置默认地址
   */
  static async setDefault(id, userId) {
    // 先取消所有默认
    await database.query(`
      UPDATE addresses SET is_default = 0 WHERE user_id = ?
    `, [userId]);

    // 设置新默认
    await database.query(`
      UPDATE addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND user_id = ?
    `, [id, userId]);

    return this.findById(id);
  }

  /**
   * 删除地址
   */
  static async delete(id, userId) {
    const result = await database.query(`
      DELETE FROM addresses WHERE id = ? AND user_id = ?
    `, [id, userId]);
    return result.affectedRows > 0 || result.changes > 0;
  }
}

module.exports = Address;

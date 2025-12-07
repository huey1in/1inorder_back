const database = require('../config/database');
const bcrypt = require('bcryptjs');

// 默认头像路径（数据库中存储的相对路径）
const DEFAULT_AVATAR = '/uploads/avatars/default.svg';

class User {
  // 获取完整的头像URL
  static getAvatarUrl(avatar) {
    // 如果已经是完整URL，直接返回
    if (avatar && avatar.startsWith('http')) return avatar;
    // 使用传入的头像路径或默认头像，拼接 BASE_URL
    const avatarPath = avatar || DEFAULT_AVATAR;
    return `${process.env.BASE_URL}${avatarPath}`;
  }

  // 格式化用户数据，将头像路径转换为完整URL
  static formatUser(user) {
    if (!user) return null;
    return {
      ...user,
      avatar: this.getAvatarUrl(user.avatar)
    };
  }

  static async create(userData) {
    const { password, phone, role = 'customer', openid, nickname, avatar } = userData;

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null;
    // 如果没有提供头像，使用默认头像
    const userAvatar = avatar || DEFAULT_AVATAR;

    try {
      const result = await database.query(`
        INSERT INTO users (password, phone, role, openid, nickname, avatar)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [hashedPassword, phone || null, role, openid || null, nickname || null, userAvatar]);

      const insertId = result.insertId || result.lastID;
      return this.findById(insertId);
    } catch (error) {
      console.error('User.create error - SQL:', error);
      throw error;
    }
  }

  /**
   * 通过微信openid创建或查找用户
   */
  static async findOrCreateByOpenid(openid, userInfo = {}) {
    // 先查找是否存在
    let user = await this.findByOpenid(openid);
    
    if (user) {
      // 更新用户信息（如果有新信息）
      if (userInfo.nickname || userInfo.avatar) {
        const updateData = {};
        if (userInfo.nickname) updateData.nickname = userInfo.nickname;
        if (userInfo.avatar) updateData.avatar = userInfo.avatar;
        user = await this.updateById(user.id, updateData);
      }
      return user;
    }

    // 创建新用户
    return this.create({
      openid,
      nickname: userInfo.nickname || '微信用户',
      avatar: userInfo.avatar || DEFAULT_AVATAR,
      role: 'customer'
    });
  }

  static async findById(id) {
    const users = await database.query('SELECT * FROM users WHERE id = ?', [id]);
    return this.formatUser(users[0]);
  }

  static async findByPhone(phone) {
    const users = await database.query('SELECT * FROM users WHERE phone = ?', [phone]);
    return this.formatUser(users[0]);
  }

  /**
   * 通过微信openid查找用户
   */
  static async findByOpenid(openid) {
    const users = await database.query('SELECT * FROM users WHERE openid = ?', [openid]);
    return this.formatUser(users[0]);
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
      UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, values);

    return this.findById(id);
  }

  static async validatePassword(user, password) {
    return bcrypt.compare(password, user.password);
  }

  static async changePassword(id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await database.query(`
      UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [hashedPassword, id]);

    return true;
  }

  static async getAll(page = 1, limit = 10) {
    const offset = (page - 1) * limit;

    const users = await database.query(`
      SELECT id, phone, role, is_active, avatar, nickname, created_at, updated_at
      FROM users
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const totalResult = await database.query('SELECT COUNT(*) as total FROM users');
    const total = totalResult[0].total;

    return {
      users: users.map(user => this.formatUser(user)),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async delete(id) {
    await database.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }
}

module.exports = User;
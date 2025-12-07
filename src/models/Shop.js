const database = require('../config/database');

class Shop {
  /**
   * 获取店铺信息
   */
  static async getInfo() {
    const shops = await database.query(`
      SELECT * FROM shop_info WHERE id = 1
    `);
    
    if (!shops[0]) {
      // 返回默认店铺信息
      return {
        id: 1,
        name: '点餐小程序',
        logo: '/uploads/shop/logo.png',
        description: '欢迎光临',
        phone: '',
        address: '',
        opening_hours: '08:00-8:00',
        is_open: true,
        announcement: '',
        min_order_amount: 0,
        delivery_fee: 0,
        delivery_start_amount: 0
      };
    }

    return shops[0];
  }

  /**
   * 更新店铺信息
   */
  static async update(updateData) {
    const fields = [];
    const values = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updateData[key]);
      }
    });

    if (fields.length === 0) return this.getInfo();

    // 检查是否存在店铺记录
    const existing = await database.query('SELECT id FROM shop_info WHERE id = 1');
    
    if (existing[0]) {
      await database.query(`
        UPDATE shop_info SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
      `, values);
    } else {
      // 创建店铺记录
      const insertFields = ['id', ...Object.keys(updateData)];
      const insertValues = [1, ...Object.values(updateData)];
      const placeholders = insertFields.map(() => '?').join(',');
      
      await database.query(`
        INSERT INTO shop_info (${insertFields.join(',')}) VALUES (${placeholders})
      `, insertValues);
    }

    return this.getInfo();
  }

  /**
   * 检查店铺是否营业
   */
  static async isOpen() {
    const shop = await this.getInfo();
    
    if (!shop.is_open) return false;
    
    // 检查营业时间
    if (shop.opening_hours) {
      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      
      const [start, end] = shop.opening_hours.split('-');
      if (start && end) {
        const [startHour, startMin] = start.split(':').map(Number);
        const [endHour, endMin] = end.split(':').map(Number);
        
        const startTime = startHour * 60 + startMin;
        const endTime = endHour * 60 + endMin;
        
        if (currentTime < startTime || currentTime > endTime) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * 获取店铺公告
   */
  static async getAnnouncement() {
    const shop = await this.getInfo();
    return shop.announcement || '';
  }

  /**
   * 更新店铺公告
   */
  static async updateAnnouncement(announcement) {
    return this.update({ announcement });
  }

  /**
   * 切换营业状态
   */
  static async toggleOpen(isOpen) {
    return this.update({ is_open: isOpen ? 1 : 0 });
  }
}

module.exports = Shop;

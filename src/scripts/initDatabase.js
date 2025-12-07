const database = require('../config/database');

const createTables = async (externalConnection = false) => {
  try {
    // 如果不是外部连接，则自己管理数据库连接
    if (!externalConnection) {
      await database.connect();
    }

    console.log('Creating database tables...');

    // Drop all existing tables
    await database.query('DROP TABLE IF EXISTS order_items');
    await database.query('DROP TABLE IF EXISTS orders');
    await database.query('DROP TABLE IF EXISTS cart_items');
    await database.query('DROP TABLE IF EXISTS products');
    await database.query('DROP TABLE IF EXISTS categories');
    await database.query('DROP TABLE IF EXISTS addresses');
    await database.query('DROP TABLE IF EXISTS shop_info');
    await database.query('DROP TABLE IF EXISTS users');

    console.log('Old tables dropped...');

    // Users table - 支持微信小程序登录
    await database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        password VARCHAR(255),
        phone VARCHAR(20) UNIQUE,
        openid VARCHAR(100) UNIQUE,
        nickname VARCHAR(100),
        avatar VARCHAR(255),
        role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Categories table - 菜品分类
    await database.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        name VARCHAR(100) NOT NULL,
        description TEXT,
        image VARCHAR(255),
        parent_id INTEGER,
        sort_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT 1,
        type VARCHAR(20) DEFAULT 'product' CHECK (type IN ('product', 'restaurant')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES categories(id)
      )
    `);

    // Products table - 菜品/商品
    await database.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        name VARCHAR(200) NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        original_price DECIMAL(10,2),
        stock_quantity INTEGER DEFAULT 0,
        category_id INTEGER,
        images TEXT,
        specs TEXT,
        is_available BOOLEAN DEFAULT true,
        is_featured BOOLEAN DEFAULT false,
        sales_count INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id)
      )
    `);

    // Orders table - 订单
    await database.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled')),
        payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'refunded')),
        order_type VARCHAR(20) NOT NULL CHECK (order_type IN ('delivery', 'pickup', 'dine_in')),
        table_number VARCHAR(20),
        pickup_code VARCHAR(10),
        delivery_address TEXT,
        contact_name VARCHAR(50),
        contact_phone VARCHAR(20),
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Order items table - 订单商品
    await database.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        order_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        specs TEXT,
        notes TEXT,
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Addresses table - 收货地址
    await database.query(`
      CREATE TABLE IF NOT EXISTS addresses (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        name VARCHAR(50) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        province VARCHAR(50) NOT NULL,
        city VARCHAR(50) NOT NULL,
        district VARCHAR(50) NOT NULL,
        detail TEXT NOT NULL,
        is_default BOOLEAN DEFAULT 0,
        tag VARCHAR(20),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    // Cart items table - 购物车
    await database.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        specs TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Shop info table - 店铺信息
    await database.query(`
      CREATE TABLE IF NOT EXISTS shop_info (
        id INTEGER PRIMARY KEY ${database.dbType === 'mysql' ? 'AUTO_INCREMENT' : 'AUTOINCREMENT'},
        name VARCHAR(100) NOT NULL DEFAULT '点餐小程序',
        logo VARCHAR(255),
        description TEXT,
        phone VARCHAR(20),
        address TEXT,
        opening_hours VARCHAR(50) DEFAULT '09:00-22:00',
        is_open BOOLEAN DEFAULT 1,
        announcement TEXT,
        min_order_amount DECIMAL(10,2) DEFAULT 0,
        delivery_fee DECIMAL(10,2) DEFAULT 0,
        delivery_start_amount DECIMAL(10,2) DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully!');

    // Insert sample data
    await insertSampleData();

  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    // 只有在自己管理连接时才关闭
    if (!externalConnection) {
      await database.close();
    }
  }
};

const insertSampleData = async () => {
  try {
    console.log('Inserting sample data...');

    // 插入菜品分类
    const categories = [
      ['热销推荐', '店铺热销菜品', 'product', 1],
      ['Test', '测试分类', 'product', 2]
    ];

    for (const [name, description, type, sort_order] of categories) {
      try {
        await database.query(`
          INSERT INTO categories (name, description, type, sort_order) VALUES (?, ?, ?, ?)
        `, [name, description, type, sort_order]);
      } catch (error) {
        if (!error.message.includes('UNIQUE constraint failed')) {
          throw error;
        }
      }
    }

    // 插入管理员账号
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('y20051010', 10);

    try {
      await database.query(`
        INSERT INTO users (phone, password, role, nickname, avatar) VALUES (?, ?, ?, ?, ?)
      `, ['13773338396', adminPassword, 'admin', '管理员', '/uploads/avatars/default.svg']);
    } catch (error) {
      if (!error.message.includes('UNIQUE constraint failed')) {
        throw error;
      }
    }

    // 插入店铺信息
    try {
      await database.query(`
        INSERT INTO shop_info (name, description, phone, address, opening_hours, announcement, min_order_amount, delivery_fee)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        '1in的小店',
        '新鲜食材，用心烹饪',
        '400-888-8888',
        '南京机电职业技术学院',
        '00:00-24:00',
        '欢迎光临！',
        15,
        5
      ]);
    } catch (error) {
      console.log('Shop info may already exist');
    }

    console.log('Sample data inserted successfully!');

    // 插入示例菜品
    console.log('\nInserting sample products...');
    const productCategories = await database.query('SELECT id, name FROM categories WHERE type = ?', ['product']);
    
    if (productCategories && productCategories.length > 0) {
      const sampleProducts = [
        { name: 'zhl宝宝', desc: '可爱的zhl宝宝', price: 99999, category: '热销推荐' },
      ];

      for (const product of sampleProducts) {
        const category = productCategories.find(c => c.name === product.category);
        if (category) {
          await database.query(`
            INSERT INTO products (name, description, price, stock_quantity, category_id, images, is_available, is_featured)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            product.name,
            product.desc,
            product.price,
            999,
            category.id,
            JSON.stringify(['/uploads/products/default.svg']),
            1,
            product.category === '热销推荐' ? 1 : 0
          ]);
        }
      }
      console.log('Successfully inserted sample products!');
    }

  } catch (error) {
    console.error('Error inserting sample data:', error);
  }
};

if (require.main === module) {
  createTables();
}

module.exports = { createTables, insertSampleData };
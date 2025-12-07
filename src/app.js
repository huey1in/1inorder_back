const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const fs = require('fs');
const database = require('./config/database');
const { errorHandler, notFoundHandler } = require('./utils/errorHandler');
const { logRequest } = require('./utils/logger');
const { createTables } = require('./scripts/initDatabase');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const addressRoutes = require('./routes/addresses');
const cartRoutes = require('./routes/cart');
const shopRoutes = require('./routes/shop');

const app = express();

// 信任代理
app.set('trust proxy', 1);

// 静态文件服务
app.use('/static', express.static(path.join(__dirname, '../public')));

// 上传文件静态服务 - 需要在 helmet 之前配置，允许跨域访问
app.use('/uploads', (req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  next();
}, express.static(path.join(__dirname, '../uploads')));

// Session配置
app.use(session({
  secret: process.env.JWT_SECRET || 'your-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // 在生产环境中应该设置为 true (需要 HTTPS)
    maxAge: 24 * 60 * 60 * 1000 // 24小时
  }
}));

app.use(helmet({
  contentSecurityPolicy: false, // 为了支持内联样式和脚本
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // 允许跨域资源
  crossOriginEmbedderPolicy: false // 允许嵌入跨域资源
}));

app.use(cors({
  origin: function(origin, callback) {
    // 允许无 origin 的请求（如移动端、Postman）
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:8080',
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:8080',
      'http://127.0.0.1:5173'
    ];
    
    // 允许所有 .yinxh.fun 的子域名
    if (origin.endsWith('.yinxh.fun') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    callback(null, true); // 暂时允许所有来源，方便调试
  },
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // 生产环境100，开发环境1000
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use(limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // 生产环境5次，开发环境50次
  message: {
    success: false,
    message: '认证尝试过于频繁，请稍后再试'
  }
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(logRequest);

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'API 服务运行中'
  });
});

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/shop', shopRoutes);

app.use('/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
const isDevelopment = process.env.NODE_ENV === 'development';

const startServer = async () => {
  try {
    // 开发模式下，每次启动删除旧数据库并重新初始化
    if (isDevelopment) {
      const dbPath = process.env.SQLITE_PATH || './database.sqlite';
      const absoluteDbPath = path.resolve(__dirname, '..', dbPath);
      
      if (fs.existsSync(absoluteDbPath)) {
        console.log('Development mode: Deleting old database...');
        try {
          fs.unlinkSync(absoluteDbPath);
          console.log(`Deleted: ${absoluteDbPath}`);
        } catch (err) {
          if (err.code === 'EBUSY' || err.code === 'EPERM') {
            console.warn(`Database file is busy/locked, skip deleting: ${absoluteDbPath}`);
          } else {
            throw err;
          }
        }
      }
      
      console.log('Development mode: Initializing database...');
      await database.connect();
      await createTables(true);  // true 表示使用外部连接
      console.log('Database initialized successfully');
    } else {
      await database.connect();
      console.log('Database connected successfully');
    }

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log(`API docs: http://localhost:${PORT}/api`);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await database.close();
  process.exit(0);
});

if (require.main === module) {
  startServer();
}

module.exports = app;

# 1inorder 后端服务

![GitHub License](https://img.shields.io/github/license/huey1in/1inorder_back)
![GitHub Stars](https://img.shields.io/github/stars/huey1in/1inorder_back)
![GitHub Forks](https://img.shields.io/github/forks/huey1in/1inorder_back)
![Node.js](https://img.shields.io/badge/Node.js-16+-green)
![Express](https://img.shields.io/badge/Express-4.x-blue)

1inorder的后端服务，提供完整的 REST API 接口。

## 项目结构

```
back/
├── src/
│   ├── app.js                          # 应用入口
│   ├── config/
│   │   └── database.js                 # 数据库配置
│   ├── controllers/                    # 业务逻辑层
│   │   ├── addressController.js
│   │   ├── authController.js
│   │   ├── cartController.js
│   │   ├── categoryController.js
│   │   ├── orderController.js
│   │   ├── productController.js
│   │   ├── shopController.js
│   │   ├── userController.js
│   │   └── admin/                      # 管理员接口
│   ├── middleware/                     # 中间件
│   │   ├── auth.js                     # 认证中间件
│   │   ├── upload.js                   # 文件上传
│   │   └── validation.js               # 数据验证
│   ├── models/                         # 数据模型
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   ├── Category.js
│   │   ├── Cart.js
│   │   ├── Address.js
│   │   ├── Restaurant.js
│   │   └── Shop.js
│   ├── routes/                         # 路由配置
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── products.js
│   │   ├── categories.js
│   │   ├── cart.js
│   │   ├── orders.js
│   │   ├── addresses.js
│   │   ├── shop.js
│   │   └── admin.js
│   ├── scripts/
│   │   ├── dev.js                      # 开发脚本
│   │   └── initDatabase.js             # 数据库初始化
│   └── utils/
│       ├── errorHandler.js
│       └── logger.js
├── uploads/                             # 文件上传目录
├── .env.example                         # 环境变量模板
├── .gitignore                          # Git 忽略文件
├── package.json
└── database.sqlite                      # SQLite 数据库
```

## 快速开始

### 环境要求
- Node.js 16+
- npm 或 yarn
- SQLite（开发）或 MySQL（生产）

### 安装依赖
```bash
cd back
npm install
```

### 配置环境变量
```bash
# 复制模板文件
cp .env.example .env

# 编辑 .env 文件，配置以下内容：
# - 数据库连接信息
# - JWT 密钥
# - CORS 配置
# - 文件上传路径
```

### 初始化数据库
```bash
npm run init:db
```

### 启动开发服务器
```bash
npm run dev
```

服务器将在 `http://localhost:3000` 启动

## API 文档

### 认证接口
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出

### 用户接口
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息
- `PUT /api/users/password` - 修改密码

### 产品接口
- `GET /api/products` - 获取产品列表
- `GET /api/products/:id` - 获取产品详情
- `POST /api/products` - 创建产品（管理员）
- `PUT /api/products/:id` - 更新产品（管理员）
- `DELETE /api/products/:id` - 删除产品（管理员）

### 订单接口
- `GET /api/orders` - 获取订单列表
- `POST /api/orders` - 创建订单
- `GET /api/orders/:id` - 获取订单详情
- `PUT /api/orders/:id` - 更新订单状态

### 购物车接口
- `GET /api/cart` - 获取购物车
- `POST /api/cart` - 添加到购物车
- `DELETE /api/cart/:id` - 删除购物车项

## 主要技术

- **框架**: Express.js
- **数据库**: SQLite (开发) / MySQL (生产)
- **认证**: JWT + Session
- **密码加密**: bcryptjs
- **文件上传**: Multer
- **CORS**: 跨域资源共享

## 开发规范

- 使用 ES6+ 语法
- 所有 API 返回统一的 JSON 响应格式
- 路由按功能模块分组
- 业务逻辑与路由分离
- 使用中间件处理通用逻辑


## 许可证

MIT License

Copyright (c) 2025 huey1in

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## 作者

1in

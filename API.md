# 接口文档（简版）

## 总览
- 基础 URL：`http://localhost:3000`
- 公共前缀：业务接口 `/api/*`，管理后台接口 `/admin/api/*`
- 认证：大部分业务接口需用户 JWT（`Authorization: Bearer <token>`）；管理接口使用 `express-session`，登录后自动携带 Cookie。
- 数据格式：请求/响应均为 JSON；文件上传使用 `multipart/form-data`。

## 认证与账户
- `POST /api/auth/register` 注册，参数：`phone`、`password`。
- `POST /api/auth/login` 登录，返回 `token`。
- `GET /api/auth/profile` 获取当前用户。
- `PUT /api/auth/profile` 更新手机号/头像。
- `POST /api/auth/change-password` 修改密码。
- `POST /api/auth/upload-avatar` 上传头像（字段 `avatar`，单文件）。
- `POST /api/auth/wx-login` 微信小程序登录（开发模式下使用 mock）。
- `POST /api/auth/bind-phone` 绑定手机号（需登录）。
- `GET /api/auth/check` 校验 token。

## 分类
- `GET /api/categories` 列表（可选 `type`）。
- `GET /api/categories/tree` 树形。
- `GET /api/categories/:id` 单个；`GET /api/categories/:id/children` 子级。
- 管理（需 admin）：`POST /api/categories` 创建，`PUT /api/categories/:id` 更新，`DELETE /api/categories/:id` 删除。

## 商品
- `GET /api/products` 列表（分页：`page`/`limit`，过滤：`category_id`、`is_available`、`is_featured`、`search`、价格区间）。
- `GET /api/products/featured` 精选；`GET /api/products/recommended` 推荐。
- `GET /api/products/category/:categoryId` 按分类；`GET /api/products/:id` 详情。
- 管理（需 admin）：`POST /api/products` 创建，`PUT /api/products/:id` 更新，`DELETE /api/products/:id` 下架删除，`PATCH /api/products/:id/stock` 调整库存；图片上传字段 `images`，最多 5 张。

## 购物车（需登录）
- `GET /api/cart` 查看；`GET /api/cart/count` 数量。
- `POST /api/cart/add` 添加（`product_id`、`quantity`）。
- `PATCH /api/cart/item/:id` 更新数量。
- `DELETE /api/cart/item/:id` 移除；`DELETE /api/cart/clear` 清空。

## 订单（需登录）
- `GET /api/orders/my` 我的订单（分页/状态过滤）。
- `GET /api/orders/:id` 详情。
- `POST /api/orders` 创建（含 `items[*].product_id/quantity`、`order_type`、配送地址等）。
- `POST /api/orders/:id/pay` 支付模拟；`POST /api/orders/:id/cancel` 取消；`DELETE /api/orders/:id` 删除已取消/已送达订单。
- 管理（需 admin）：`PATCH /api/orders/:id/status` 更新状态；`PATCH /api/orders/:id/payment` 更新支付状态；`GET /api/orders/statistics` 统计。

## 地址簿（需登录）
- `GET /api/addresses` 列表；`GET /api/addresses/default` 默认；`GET /api/addresses/:id` 详情。
- `POST /api/addresses` 创建；`PUT /api/addresses/:id` 更新；`PATCH /api/addresses/:id/default` 设默认；`DELETE /api/addresses/:id` 删除。

## 店铺信息
- 公共：`GET /api/shop/info` 店铺信息；`GET /api/shop/check-open` 是否营业；`GET /api/shop/announcement` 公告。
- 管理（需 admin）：`PUT /api/shop/info` 更新店铺；`PUT /api/shop/announcement` 更新公告；`PATCH /api/shop/toggle-open` 切换营业状态。

## 管理后台 API（需管理员 Session）
- 登录登出：`POST /admin/login`，`POST /admin/logout`，`GET /admin/api/auth/check`。
- 仪表盘：`GET /admin/api/dashboard`。
- 用户：`GET /admin/api/users`，`POST /admin/api/users/:id/toggle`，`DELETE /admin/api/users/:id`。
- 商品：`GET /admin/api/products`，`POST /admin/api/products`，`PUT /admin/api/products/:id`，`DELETE /admin/api/products/:id`，`POST /admin/api/products/:id/toggle`，`GET /admin/api/products/categories`。
- 订单：`GET /admin/api/orders`，`GET /admin/api/orders/:id`，`PUT /admin/api/orders/:id/status`，`PUT /admin/api/orders/:id/payment`，`DELETE /admin/api/orders/:id`，`GET /admin/api/orders/stats`。
- 分类：`GET /admin/api/categories`，`POST /admin/api/categories`，`PUT /admin/api/categories/:id`，`DELETE /admin/api/categories/:id`，`POST /admin/api/categories/:id/toggle`，`GET /admin/api/categories/parents`。

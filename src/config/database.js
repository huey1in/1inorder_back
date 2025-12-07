const initSqlJs = require('sql.js');
const fs = require('fs');
const mysql = require('mysql2/promise');
require('dotenv').config();

class Database {
  constructor() {
    this.db = null;
    this.SQL = null;
    this.dbType = process.env.DB_TYPE || 'sqlite';
    this.dbPath = process.env.SQLITE_PATH || './database.sqlite';
    this.inTransaction = false;
  }

  async connect() {
    try {
      if (this.dbType === 'sqlite') {
        await this.connectSQLite();
      } else if (this.dbType === 'mysql') {
        await this.connectMySQL();
      }
      console.log(`Connected to ${this.dbType} database successfully`);
    } catch (error) {
      console.error('Database connection failed:', error);
      throw error;
    }
  }

  async connectSQLite() {
    this.SQL = await initSqlJs();

    let data;
    if (fs.existsSync(this.dbPath)) {
      data = fs.readFileSync(this.dbPath);
    }

    this.db = new this.SQL.Database(data);

    this.db.run('PRAGMA foreign_keys = ON');
    this.db.run('PRAGMA encoding = "UTF-8"');
  }

  async connectMySQL() {
    this.db = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: process.env.MYSQL_PORT,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      database: process.env.MYSQL_DATABASE,
      charset: 'utf8mb4'
    });
  }

  async query(sql, params = []) {
    if (this.dbType === 'sqlite') {
      return this.querySQLite(sql, params);
    } else if (this.dbType === 'mysql') {
      return this.queryMySQL(sql, params);
    }
  }

  async querySQLite(sql, params = []) {
    try {
      const sqlLower = sql.trim().toLowerCase();

      if (sqlLower.startsWith('select')) {
        const stmt = this.db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          rows.push(stmt.getAsObject());
        }
        stmt.free();
        return rows;
      } else {
        const stmt = this.db.prepare(sql);
        stmt.run(params);
        const changes = this.db.getRowsModified();
        const result = this.db.exec('SELECT last_insert_rowid() as id');
        const lastId = result.length > 0 ? result[0].values[0][0] : 0;
        stmt.free();

        // 只在非事务状态下自动保存
        if (!this.inTransaction) {
          this.saveDatabase();
        }

        return { insertId: lastId, affectedRows: changes };
      }
    } catch (error) {
      throw error;
    }
  }

  async queryMySQL(sql, params = []) {
    const [rows] = await this.db.execute(sql, params);
    return rows;
  }

  saveDatabase() {
    if (this.dbType === 'sqlite' && this.db) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      console.log(`Database saved to ${this.dbPath} (${buffer.length} bytes)`);
    }
  }

  async beginTransaction() {
    if (this.dbType === 'sqlite') {
      if (!this.inTransaction) {
        this.inTransaction = true;
        return this.query('BEGIN TRANSACTION');
      }
    } else if (this.dbType === 'mysql') {
      return this.db.beginTransaction();
    }
  }

  async commit() {
    if (this.dbType === 'sqlite') {
      if (this.inTransaction) {
        const result = await this.query('COMMIT');
        this.inTransaction = false;
        this.saveDatabase();
        return result;
      }
    } else if (this.dbType === 'mysql') {
      return this.db.commit();
    }
  }

  async rollback() {
    if (this.dbType === 'sqlite') {
      if (this.inTransaction) {
        this.inTransaction = false;
        return this.query('ROLLBACK');
      }
    } else if (this.dbType === 'mysql') {
      return this.db.rollback();
    }
  }

  async close() {
    if (this.db) {
      if (this.dbType === 'sqlite') {
        this.saveDatabase();
        this.db.close();
      } else if (this.dbType === 'mysql') {
        return this.db.end();
      }
    }
  }
}

const database = new Database();

module.exports = database;
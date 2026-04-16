import dotenv from "dotenv";
dotenv.config(); // 👈 SEM path, assume raiz

import mysql from "mysql2/promise";

console.log("🔍 DB_USER:", process.env.DB_USER);
console.log("🔍 DB_NAME:", process.env.DB_NAME);

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  charset: "utf8mb4",
});

export default pool;

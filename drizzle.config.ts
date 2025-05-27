import { defineConfig } from "drizzle-kit";
import 'dotenv/config';

if (!process.env.MYSQL_HOST || 
    !process.env.MYSQL_USER ||  
    !process.env.MYSQL_DATABASE) {
  throw new Error("MySQL configuration missing. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, and MYSQL_DATABASE");
}

export default defineConfig({
  out: "./mysql-migrations",
  schema: "./shared/schema.ts",
  dialect: "mysql",
  dbCredentials: {
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT ? parseInt(process.env.MYSQL_PORT) : 3306,
    user: process.env.MYSQL_USER,
    database: process.env.MYSQL_DATABASE,
  },
});

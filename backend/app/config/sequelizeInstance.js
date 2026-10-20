import "dotenv/config";
import dbConfig from "./db.config.js";
import { Sequelize } from "sequelize";

// Tests use sqlite memory. The app still uses MySQL outside NODE_ENV=test.
const sequelize =
  process.env.NODE_ENV === "test"
    ? new Sequelize({
        dialect: "sqlite",
        storage: ":memory:",
        logging: false,
        pool: { max: 1 },
      })
    : new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
        host: dbConfig.HOST,
        dialect: dbConfig.dialect,
        pool: {
          max: dbConfig.pool.max,
          min: dbConfig.pool.min,
          acquire: dbConfig.pool.acquire,
          idle: dbConfig.pool.idle,
        },
        logging: false,
      });

export default sequelize;

import { Pool } from "pg";

import { cfg } from "../config.js";

export const pgPool = new Pool({
  host: cfg.postgres.host,
  port: cfg.postgres.port,
  database: cfg.postgres.database,
  user: cfg.postgres.user,
  password: cfg.postgres.password,
});

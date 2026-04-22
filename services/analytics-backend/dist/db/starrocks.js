import mysql from "mysql2/promise";
import { cfg } from "../config.js";
export async function runStarRocksQuery(sql, values = []) {
    const conn = await mysql.createConnection({
        host: cfg.starrocks.host,
        port: cfg.starrocks.port,
        user: cfg.starrocks.user,
        password: cfg.starrocks.password,
        database: cfg.starrocks.database,
        connectTimeout: cfg.queryTimeoutMs,
    });
    try {
        const [rows] = await conn.execute(sql, values);
        return rows;
    }
    finally {
        await conn.end();
    }
}

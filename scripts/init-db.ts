import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getDb } from "../src/lib/db/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.join(__dirname, "../src/lib/db/schema.sql");

const db = getDb();
const schema = fs.readFileSync(schemaPath, "utf-8");

// SQLite는 multi-statement exec 지원
db.exec(schema);
console.log("DB initialized:", process.env.GDS_DATA_DIR ?? "./data");

import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

export const DATA_DIR = process.env.GDS_DATA_DIR
  ? path.resolve(process.env.GDS_DATA_DIR)
  : path.join(ROOT, "data");

export const DB_PATH = path.join(DATA_DIR, "game-data-studio.db");

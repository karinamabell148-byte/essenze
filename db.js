const path = require("path");
const fs = require("fs");
const { DatabaseSync } = require("node:sqlite");

const DB_PATH = path.join(__dirname, "casa_aurora.sqlite");

if (!fs.existsSync(DB_PATH)) {
  throw new Error(
    `Banco não encontrado em ${DB_PATH}. Rode "npm run seed" (ou "python3 build_db.py") primeiro para criá-lo.`
  );
}

const raw = new DatabaseSync(DB_PATH);
raw.exec("PRAGMA journal_mode = WAL");
raw.exec("PRAGMA foreign_keys = ON");

function prefixNamedParams(obj) {
  const out = {};
  for (const key of Object.keys(obj)) {
    out[`@${key}`] = obj[key];
  }
  return out;
}

function wrapStatement(stmt) {
  const normalizeArgs = (args) => {
    if (args.length === 1 && args[0] !== null && typeof args[0] === "object" && !Array.isArray(args[0])) {
      return [prefixNamedParams(args[0])];
    }
    return args;
  };

  return {
    run: (...args) => stmt.run(...normalizeArgs(args)),
    get: (...args) => stmt.get(...normalizeArgs(args)),
    all: (...args) => stmt.all(...normalizeArgs(args)),
  };
}

const db = {
  prepare(sql) {
    return wrapStatement(raw.prepare(sql));
  },
  transaction(fn) {
    return (...args) => {
      raw.exec("BEGIN");
      try {
        const result = fn(...args);
        raw.exec("COMMIT");
        return result;
      } catch (err) {
        try {
          raw.exec("ROLLBACK");
        } catch (_) {}
        throw err;
      }
    };
  },
};

module.exports = db;
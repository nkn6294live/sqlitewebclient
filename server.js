const http = require("http");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const url = require("url");

const DEFAULT_PORT = 5000;
const DEFAULT_HOST = '0.0.0.0'
const PORT = process.env.PORT ? parseInt(process.env.PORT) : DEFAULT_PORT;
const HOST = process.env.HOST || DEFAULT_HOST || '0.0.0.0'
const DEFAULT_ROOT_FOLDER = "./databases";
const ROOT_FOLDER =
  process.env.ROOT_FOLDER === undefined
    ? DEFAULT_ROOT_FOLDER
    : process.env.ROOT_FOLDER === ""
    ? ""
    : process.env.ROOT_FOLDER;
const MAX_READ_CONNECTIONS = 1;
const MAX_WRITE_CONNECTIONS = 1;
const DEFAULT_QUERY_TIMEOUT = 5000; // Milliseconds
const DEFAULT_DB_NAME = "default.db";
const DEFAULT_DB_PATH_ENV =
  process.env.DEFAULT_DB_PATH ||
  path.join(DEFAULT_ROOT_FOLDER, DEFAULT_DB_NAME);
const DEFAULT_DB_DIR = path.dirname(DEFAULT_DB_PATH_ENV);
const CLIENT_FOLDER = path.join(__dirname, "client");
const INDEX_HTML_PATH = path.join(CLIENT_FOLDER, "index.html");
const API_PREFIX = "/api";

const dbConnections = {};

function ensureDirectoryExists(dirPath) {
  if (dirPath && !fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getDatabasePath(dbName) {
  return dbName ? path.join(ROOT_FOLDER, dbName) : DEFAULT_DB_PATH_ENV;
}

async function getOrCreateDatabaseConnection(dbPath, readOnly = false) {
  if (!dbPath) {
    return null; // Không có đường dẫn DB
  }
  if (!fs.existsSync(dbPath)) {
    return new Promise((resolve, reject) => {
      const newDb = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Failed to create database:", err.message);
          reject(err);
        } else {
          console.log(`Database created at: ${dbPath}`);
          const connection = getDatabaseConnectionInternal(dbPath, readOnly);
          resolve(connection);
          newDb.close();
        }
      });
    });
  }
  return getDatabaseConnectionInternal(dbPath, readOnly);
}

function getDatabaseConnectionInternal(dbPath, readOnly = false) {
  if (!dbConnections[dbPath]) {
    dbConnections[dbPath] = {
      read: [],
      readwrite: [],
    };
  }

  const connections = readOnly
    ? dbConnections[dbPath].read
    : dbConnections[dbPath].readwrite;
  const maxConnections = readOnly
    ? MAX_READ_CONNECTIONS
    : MAX_WRITE_CONNECTIONS;

  if (connections.length < maxConnections) {
    const db = new sqlite3.Database(
      dbPath,
      readOnly ? sqlite3.OPEN_READONLY : sqlite3.OPEN_READWRITE,
      (err) => {
        if (err) {
          console.error("Failed to connect to database:", err.message);
          return null;
        }
      }
    );
    connections.push(db);
    return db;
  }

  return connections[0]; // Trả về kết nối hiện có
}

function releaseDatabaseConnection(dbPath, db) {
  if (dbConnections[dbPath]) {
    const connections = dbConnections[dbPath].read.includes(db)
      ? dbConnections[dbPath].read
      : dbConnections[dbPath].readwrite;
    const index = connections.indexOf(db);
    if (index > -1) {
      connections.splice(index, 1);
      db.close((err) => {
        if (err) {
          console.error("Failed to close database:", err.message);
        }
      });
    }
    if (
      dbConnections[dbPath].read.length === 0 &&
      dbConnections[dbPath].readwrite.length === 0
    ) {
      delete dbConnections[dbPath];
    }
  }
}

function closeAllConnections() {
  for (const dbPath in dbConnections) {
    if (dbConnections.hasOwnProperty(dbPath)) {
      dbConnections[dbPath].read.forEach((db) => {
        db.close((err) => {
          if (err) {
            console.error(
              `Failed to close read connection for ${dbPath}:`,
              err.message
            );
          }
        });
      });
      dbConnections[dbPath].readwrite.forEach((db) => {
        db.close((err) => {
          if (err) {
            console.error(
              `Failed to close readwrite connection for ${dbPath}:`,
              err.message
            );
          }
        });
      });
    }
  }
  console.log("All database connections closed.");
}

process.on("SIGINT", () => {
  console.log("Shutting down server...");
  closeAllConnections();
  process.exit(0);
});

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const req_query = parsedUrl.query;
  let req_body = {};
  let method = req.method || "GET";

  if (method === "POST") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }
    try {
      req_body = JSON.parse(body);
    } catch (error) {
      // Ignore invalid JSON, body might not always be JSON
    }
  }

  if (pathname.startsWith(API_PREFIX + "/")) {
    let reqPath = pathname.replace(API_PREFIX, "");
    res.setHeader("Content-Type", "application/json");
    if (reqPath === `/create-db` && method === "POST") {
      const dbName = req_body.name || req_query.name;
      if (!dbName) {
        res.writeHead(400);
        return res.end(JSON.stringify({ error: "Missing database name" }));
      }
      const dbPath = getDatabasePath(dbName);
      ensureDirectoryExists(path.dirname(dbPath));
      const db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error("Failed to create database:", err.message);
          res.writeHead(500);
          return res.end(
            JSON.stringify({ error: "Failed to create database" })
          );
        }
        db.close();
        res.writeHead(200);
        res.end(
          JSON.stringify({
            message: `Database "${dbName}" created successfully at "${dbPath}"`,
          })
        );
      });
    } else if (reqPath === `/query` && method === "POST") {
      const dbName = req_body.db || req_query.db;
      const query = req_query.sql || req_body.query;
      const params = req_body.param;
      const readOnlyParam = req_body.readOnly || req_query.readOnly;
      const readOnly = readOnlyParam === "true";
      const timeoutParam = parseInt(req_body.timeout || req_query.timeout);
      const timeout = isNaN(timeoutParam)
        ? DEFAULT_QUERY_TIMEOUT
        : timeoutParam;
      const createIfNotExistParam =
        req_body.createIfNotExist || req_query.createIfNotExist;
      const createIfNotExist = createIfNotExistParam === "true";

      const effectiveDbName = dbName;
      const dbPath = getDatabasePath(effectiveDbName);

      if ((!effectiveDbName && !DEFAULT_DB_PATH_ENV) || !query) {
        res.writeHead(400);
        return res.end(
          JSON.stringify({ error: "Missing database name or query" })
        );
      }

      let dbInstance;

      try {
        const finalDbPath = effectiveDbName ? dbPath : DEFAULT_DB_PATH_ENV;
        ensureDirectoryExists(path.dirname(finalDbPath));
        if (createIfNotExist) {
          dbInstance = await getOrCreateDatabaseConnection(
            finalDbPath,
            readOnly
          );
          if (!dbInstance) {
            res.writeHead(500);
            return res.end(
              JSON.stringify({
                error: "Failed to get or create database connection",
              })
            );
          }
        } else {
          dbInstance = getDatabaseConnectionInternal(finalDbPath, readOnly);
          if (!dbInstance) {
            res.writeHead(404);
            return res.end(
              JSON.stringify({
                error: `Database "${
                  effectiveDbName || DEFAULT_DB_NAME
                }" not found`,
              })
            );
          }
        }

        const executeQueryWithTimeout = (db, sql, parameters, timeoutMs) => {
          return new Promise((resolve, reject) => {
            let timedOut = false;
            const timeoutId = setTimeout(() => {
              timedOut = true;
              reject(new Error("Query execution timeout"));
            }, timeoutMs);

            db.all(sql, parameters, (err, rows) => {
              clearTimeout(timeoutId);
              if (timedOut) return;
              if (err) {
                reject(err);
                return;
              }
              resolve(rows);
            });
          });
        };
        let t = Date.now();
        const results = await executeQueryWithTimeout(
          dbInstance,
          query,
          params || [],
          timeout
        );
        t = Date.now() - t;
        res.writeHead(200);
        res.end(JSON.stringify({ results, time: t }));
      } catch (error) {
        if (error.message === "Query execution timeout") {
          console.error(
            `Query timeout (${timeout}ms) for database: ${
              effectiveDbName || DEFAULT_DB_NAME
            }, query: ${query}`
          );
          res.writeHead(408); // Request Timeout
          return res.end(JSON.stringify({ error: "Query execution timeout" }));
        }
        if (
          readOnly &&
          error.message.includes("attempt to write a readonly database")
        ) {
          res.writeHead(403);
          return res.end(
            JSON.stringify({
              error: "Read-only connection cannot execute write operations",
              details: error.message,
            })
          );
        }
        console.error("Query error:", error.message);
        res.writeHead(500);
        return res.end(JSON.stringify({ error: error.message }));
      } finally {
        if (dbInstance)
          releaseDatabaseConnection(
            effectiveDbName || DEFAULT_DB_PATH_ENV,
            dbInstance
          );
      }
    } else if (reqPath === `/listdb` && method === "GET") {
      let files = await fsp.readdir(ROOT_FOLDER);
      files = files.filter((f) => f.endsWith(".db"));
      return res.end(JSON.stringify({ results: files }));
    } else {
      res.writeHead(404);
      return res.end(JSON.stringify({ error: "Not Found" }));
    }
  } else {
    // Serve static files from client folder
    const filePath = path.join(
      CLIENT_FOLDER,
      !pathname || pathname === "/" ? "index.html" : pathname
    );
    try {
      const data = await fsp.readFile(filePath);
      const extname = path.extname(filePath);
      let contentType = "text/html";
      switch (extname) {
        case ".js":
          contentType = "application/javascript";
          break;
        case ".css":
          contentType = "text/css";
          break;
        case ".json":
          contentType = "application/json";
          break;
        case ".png":
          contentType = "image/png";
          break;
        case ".jpg":
        case ".jpeg":
          contentType = "image/jpg";
          break;
      }
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    } catch (error) {
      // If file not found, serve index.html (SPA behavior)
      if (error.code === "ENOENT") {
        try {
          const indexHTML = await fsp.readFile(INDEX_HTML_PATH);
          res.writeHead(200, { "Content-Type": "text/html" });
          res.end(indexHTML);
        } catch (err) {
          console.error("Error serving index.html:", err);
          res.writeHead(500, { "Content-Type": "text/plain" });
          res.end("Internal Server Error");
        }
      } else {
        console.error("Error serving static file:", error);
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      }
    }
  }
});

server.listen(PORT, HOST,  () => {
  console.log(`Server listening on http://${HOST}:${PORT}`);
  ensureDirectoryExists(DEFAULT_DB_DIR);
  ensureDirectoryExists(CLIENT_FOLDER);
});

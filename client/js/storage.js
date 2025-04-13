// storage.js
const LOCAL_STORAGE_DB_KEY = "sqlite_client_databases";
const LOCAL_STORAGE_QUERY_HISTORY_KEY = "sqlite_client_query_history";

export function loadDatabaseStorage() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_STORAGE_DB_KEY)) || [];
  } catch {
    return [];
  }
}

export function saveDatabaseToStorage(dbName, storedDatabases) {
  if (dbName && !storedDatabases.includes(dbName)) {
    storedDatabases.push(dbName);
    localStorage.setItem(LOCAL_STORAGE_DB_KEY, JSON.stringify(storedDatabases));
  }
  return storedDatabases;
}

export function loadQueryHistory() {
  const storedHistory = localStorage.getItem(LOCAL_STORAGE_QUERY_HISTORY_KEY);
  return storedHistory ? JSON.parse(storedHistory) : [];
}

export function saveQueryToHistory(queryInfo, queryHistory) {
  queryHistory.push(queryInfo);
  if (queryHistory.length > 10) {
    queryHistory.shift();
  }
  localStorage.setItem(
    LOCAL_STORAGE_QUERY_HISTORY_KEY,
    JSON.stringify(queryHistory)
  );
  return queryHistory;
}

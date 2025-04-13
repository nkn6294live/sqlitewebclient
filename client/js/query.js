// query.js
export async function queryApi(dbName, query) {
    const response = await fetch("/api/query", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        db: dbName,
        query,
        createIfNotExist: true,
      }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to execute query");
    }
  
    return response.json();
  }
  
  export async function getListDB() {
    const response = await fetch("/api/listdb", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to get list database");
    }
  
    return response.json();
  }
  
  export async function createDatabaseOnServer(dbName) {
    const response = await fetch("/api/create-db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dbName }),
    });
  
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to create database");
    }
  
    return response.json();
  }
  
  export async function fetchTableList(dbName) {
    const data = await queryApi(
      dbName,
      "SELECT name FROM sqlite_master WHERE type='table';"
    );
    return data.results || [];
  }
  
// main.js
import {
    queryApi,
    getListDB,
    createDatabaseOnServer,
    fetchTableList,
  } from "./query.js";
  import {
    loadDatabaseStorage,
    saveDatabaseToStorage,
    loadQueryHistory,
    saveQueryToHistory,
  } from "./storage.js";
  import {
    createDatabaseListItem,
    createCreateDbLink,
    createTableItem,
    createNoTablesItem,
    createErrorItem,
    updateResultsTable,
    updateQuerySuggestions,
  } from "./components.js";
  
  document.addEventListener("DOMContentLoaded", () => {
    const databaseListElement = document.getElementById("database-list");
    const sqlQueryTextarea = document.getElementById("sql-query");
    const executeQueryButton = document.getElementById("execute-query-button");
    const responseContainer = document.getElementById("response-container");
    const resultsTable = document.getElementById("results-table");
    const resultsTableHead = resultsTable.querySelector("thead tr");
    const resultsTableBody = resultsTable.querySelector("tbody");
    const versionNumberSpan = document.getElementById("version-number");
    const sqlQueryInfo = document.getElementById("sql-query-info");
    const querySuggestionsDatalist = document.getElementById("query-suggestions");
  
    const CLIENT_VERSION = "1.0.4";
    const DEFAULT_FETCH_LIMIT = 50;
  
    let storedDatabases = loadDatabaseStorage();
    let queryHistory = loadQueryHistory();
    let currentDatabase = null;
  
    if (versionNumberSpan) {
      versionNumberSpan.textContent = CLIENT_VERSION;
    }
  
    async function fetchTableData(
      dbName,
      tableName,
      offSet = 0,
      limit = DEFAULT_FETCH_LIMIT
    ) {
      const query = `SELECT * FROM ${tableName} LIMIT ${limit} OFFSET ${offSet};`;
      responseContainer.textContent = `Fetching data from "${tableName}"...`;
      resultsTable.style.display = "none";
  
      try {
        const data = await queryApi(dbName, query);
        if (data.results && Array.isArray(data.results)) {
          const displayed = updateResultsTable(
            data.results,
            resultsTableHead,
            resultsTableBody
          );
          responseContainer.textContent = displayed
            ? ""
            : "Query executed, no results.";
          resultsTable.style.display = displayed ? "table" : "none";
        } else if (data.message) {
          responseContainer.textContent = data.message;
          resultsTable.style.display = "none";
        } else {
          responseContainer.textContent = "No data returned.";
          resultsTable.style.display = "none";
        }
      } catch (error) {
        console.error("Error fetching table data:", error);
        responseContainer.textContent = `Error: ${error.message}`;
        resultsTable.style.display = "none";
      }
    }
  
    function populateDatabaseList() {
      databaseListElement.innerHTML = "";
  
      const createLink = createCreateDbLink(async () => {
        const dbName = prompt("Enter new database name:");
        if (dbName && dbName.trim()) {
          try {
            const data = await createDatabaseOnServer(dbName.trim());
            responseContainer.textContent =
              data.message || data.error || "DB operation done.";
            if (data.message) {
              storedDatabases = saveDatabaseToStorage(
                dbName.trim(),
                storedDatabases
              );
              populateDatabaseList();
            }
          } catch (error) {
            console.error("Error creating db:", error);
            responseContainer.textContent = "Failed to create database.";
          }
        }
      });
      databaseListElement.appendChild(createLink);
  
      storedDatabases.forEach((db) => {
        const listItem = createDatabaseListItem(
          db,
          (dbName, listItem, tableList) => {
            currentDatabase = dbName;
            document
              .querySelectorAll(".database-item")
              .forEach((item) =>
                item.classList.remove(
                  ..."db-selected bg-gray-300 font-semibold".split(" ")
                )
              );
            listItem.classList.add(
              ..."db-selected bg-gray-300 font-semibold".split(" ")
            );
            sqlQueryTextarea.placeholder = `Enter SQL query for database "${dbName}"`;
            sqlQueryInfo.innerHTML = dbName;
  
            // tableList.classList.toggle("open");
            tableList.classList.remove("hidden");
            tableList.classList.add("block");
            if (tableList.dataset.loaded) return;
  
            fetchTableList(dbName)
              .then((tables) => {
                tableList.innerHTML = "";
                if (tables.length > 0) {
                  tables.forEach((tableObj) => {
                    const tableItem = createTableItem(tableObj.name, () =>
                      fetchTableData(dbName, tableObj.name)
                    );
                    tableList.appendChild(tableItem);
                  });
                } else {
                  tableList.appendChild(createNoTablesItem());
                }
                tableList.dataset.loaded = "true";
              })
              .catch((error) => {
                console.error("Failed to fetch tables:", error);
                tableList.innerHTML = "";
                tableList.appendChild(createErrorItem("Failed to load tables"));
              });
          }
        );
        databaseListElement.appendChild(listItem);
      });
    }
  
    getListDB()
      .then((data) => {
        let serverDBs = data?.results || [];
        storedDatabases = [...new Set([...storedDatabases, ...serverDBs])];
      })
      .catch((error) => {
        console.error(`Failed to get list db: ${error?.message}`);
      })
      .finally(() => {
        populateDatabaseList();
        updateQuerySuggestions(queryHistory, querySuggestionsDatalist);
      });
  
    if (queryHistory.length > 0) {
      sqlQueryTextarea.value = queryHistory[queryHistory.length - 1].query;
    }
    sqlQueryTextarea.focus();
  
    executeQueryButton.addEventListener("click", async () => {
      const query = sqlQueryTextarea.value;
      const dbToSend = currentDatabase;
  
      if (!query.trim()) {
        responseContainer.textContent = "Please enter an SQL query.";
        resultsTable.style.display = "none";
        return;
      }
  
      responseContainer.textContent = "Executing query...";
      resultsTable.style.display = "none";
  
      try {
        const data = await queryApi(dbToSend, query);
        if (dbToSend) {
          storedDatabases = saveDatabaseToStorage(dbToSend, storedDatabases);
        }
        queryHistory = saveQueryToHistory(
          { query, dbName: dbToSend, createIfNotExist: true },
          queryHistory
        );
        updateQuerySuggestions(queryHistory, querySuggestionsDatalist);
  
        if (data.results && Array.isArray(data.results)) {
          const displayed = updateResultsTable(
            data.results,
            resultsTableHead,
            resultsTableBody
          );
          responseContainer.textContent = displayed
            ? ""
            : "Query executed, no results.";
          resultsTable.style.display = displayed ? "table" : "none";
        } else if (data.message) {
          responseContainer.textContent = data.message;
          resultsTable.style.display = "none";
        } else {
          responseContainer.textContent = "Query executed.";
          resultsTable.style.display = "none";
        }
      } catch (error) {
        console.error("Query error:", error);
        responseContainer.textContent = `Error: ${error.message}`;
        resultsTable.style.display = "none";
      }
    });
  
    sqlQueryTextarea.addEventListener("keydown", (event) => {
      if (event.ctrlKey && event.key === "Enter") {
        executeQueryButton.click();
      }
    });
  });
  
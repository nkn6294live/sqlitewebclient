// components.js
export function createDatabaseListItem(dbName, onClick, selected = false) {
    const listItem = document.createElement("li");
    listItem.className = `database-item ${
      selected ? "db-selected bg-gray-300 font-semibold" : ""
    } p-2 rounded-md`;
    // listItem.textContent = dbName;
    listItem.innerHTML = `
        <div class="flex items-center cursor-pointer">
            <svg class="w-3.5 h-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round"
                    d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
            </svg>
            <span class="truncate max-w-[200px]">${dbName}</span>
        </div>
    `;
  
    const tableList = document.createElement("ul");
    tableList.className =
      "list-none p-0 m-0 mt-2 ml-5" + ` ${selected ? "block" : "hidden"}`;
    listItem.appendChild(tableList);
  
    listItem.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(dbName, listItem, tableList);
    });
  
    return listItem;
  }
  
  export function createCreateDbLink(onClick) {
    const createLinkItem = document.createElement("li");
    createLinkItem.id = "create-db-link";
    createLinkItem.className =
      "create-db-link cursor-pointer font-medium flex items-center p-2 sticky top-0 z-10 bg-gray-100";
    createLinkItem.innerHTML = `
        <svg class="w-3.5 h-3.5 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
        <span class="underline">New</span>
    `;
    createLinkItem.addEventListener("click", onClick);
    return createLinkItem;
  }
  
  export function createTableItem(tableName, onClick) {
    const tableItem = document.createElement("li");
    tableItem.className =
      "cursor-pointer p-1 text-sm flex items-center hover:bg-gray-200 rounded";
    // tableItem.textContent = tableName;
    tableItem.innerHTML = `
        <svg class="w-3 h-3 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
            stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round"
                d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 0 1-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0 1 12 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125.504M3.375 8.25c-.621 0-1.125.504-1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125.504m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125m-8.625 0c.621 0 1.125.504 1.125 1.125v1.5M12 10.875c0 .621.504 1.125 1.125 1.125m8.625-1.125c-.621 0-1.125.504-1.125 1.125v1.5m-8.625-1.125h7.5" />
        </svg>
        <span class="truncate max-w-[200px]">${tableName}</span>
    `;
    tableItem.addEventListener("click", (e) => {
      e.stopPropagation();
      onClick(tableName);
    });
    return tableItem;
  }
  
  export function createNoTablesItem() {
    const noTablesItem = document.createElement("li");
    noTablesItem.className = "no-tables";
    noTablesItem.textContent = "No tables found";
    return noTablesItem;
  }
  
  export function createErrorItem(message) {
    const errorItem = document.createElement("li");
    errorItem.className = "error text-red-500 italic";
    errorItem.textContent = message;
    return errorItem;
  }
  
  export function updateResultsTable(
    results,
    resultsTableHead,
    resultsTableBody
  ) {
    resultsTableHead.innerHTML = "";
    resultsTableBody.innerHTML = "";
  
    if (results && Array.isArray(results) && results.length > 0) {
      const columns = Object.keys(results[0]);
      columns.forEach((col) => {
        const th = document.createElement("th");
        th.classList =
          "border border-gray-300 p-2 min-w-[100px] max-w-[160px] text-left font-semibold break-words";
        th.textContent = col;
        resultsTableHead.appendChild(th);
      });
  
      results.forEach((row) => {
        const tr = document.createElement("tr");
        columns.forEach((col) => {
          const td = document.createElement("td");
          td.classList = "border border-gray-300 p-2 break-words";
          td.textContent = row[col];
          tr.appendChild(td);
        });
        resultsTableBody.appendChild(tr);
      });
      return true;
    } else if (results && Array.isArray(results) && results.length == 0) {
      const th = document.createElement("th");
      th.classList =
        "border border-gray-300 p-2 min-w-[100px] max-w-[160px] text-left font-semibold break-words";
      th.textContent = "Data";
      resultsTableHead.appendChild(th);
  
      const tr = document.createElement("tr");
      tr.id = "no-data";
      tr.class = "block";
      const td = document.createElement("td");
      td.colspan = "1";
      td.classList = "border border-gray-300 p-2 text-center text-gray-500";
      td.textContent = "No results found";
      tr.appendChild(td);
      resultsTableBody.appendChild(tr);
      return true;
    } else {
      //
    }
    return false;
  }
  
  export function updateQuerySuggestions(queryHistory, querySuggestionsDatalist) {
    querySuggestionsDatalist.innerHTML = "";
    const uniqueQueries = [...new Set(queryHistory.map((item) => item.query))];
    uniqueQueries.forEach((query) => {
      const option = document.createElement("option");
      option.value = query;
      querySuggestionsDatalist.appendChild(option);
    });
  }
  
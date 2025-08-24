class RelationalFileStorage {
  constructor() {
    this.fileHandles = {};
    this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
    this.dbTables = {
      accounts: 'accounts.xlsx',
      transactions: 'transactions.xlsx',
      customers: 'customers.xlsx',
      vendors: 'vendors.xlsx',
      tags: 'tags.xlsx',
      todos: 'todos.xlsx',
      transaction_types: 'transaction_types.xlsx',
      subcategories: 'subcategories.xlsx',
      currencies: 'currencies.xlsx',
      exchange_rates: 'exchange_rates.xlsx',
      currency_settings: 'currency_settings.xlsx',
      user_preferences: 'user_preferences.xlsx',
      api_usage: 'api_usage.xlsx',
      api_settings: 'api_settings.xlsx',
      database_info: 'database_info.xlsx'
    };
  }

  async loadDatabase() {
    try {
      const storedDb = localStorage.getItem('accounting_relational_db');
      if (!storedDb) return null;

      const dbInfo = JSON.parse(storedDb);
      
      // Only return null - automatic loading will be handled differently
      // The database initialization should show the setup screen if no stored handles exist
      return null;
    } catch (error) {
      console.error('Error loading relational database:', error);
      return null;
    }
  }

  async selectDatabaseFolder() {
    try {
      if (this.supportsFileSystemAccess) {
        const dirHandle = await window.showDirectoryPicker();
        
        const loadedFiles = {};
        
        for (const [table, filename] of Object.entries(this.dbTables)) {
          try {
            const fileHandle = await dirHandle.getFileHandle(filename, { create: false });
            this.fileHandles[table] = fileHandle;
            const file = await fileHandle.getFile();
            loadedFiles[table] = file;
          } catch (err) {
            console.warn(`File ${filename} not found in directory`);
          }
        }

        if (Object.keys(loadedFiles).length > 0) {
          const dbInfo = {
            type: 'directory',
            timestamp: Date.now(),
            path: dirHandle.name || 'Unknown Directory'
          };
          localStorage.setItem('accounting_relational_db', JSON.stringify(dbInfo));
          this.addToRecentDatabases(dbInfo);
          return loadedFiles;
        }
      }
      
      return this.selectIndividualFiles();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('User cancelled folder selection');
        return null;
      }
      console.error('Error selecting database folder:', error);
      return this.selectIndividualFiles();
    }
  }

  async selectIndividualFiles() {
    const loadedFiles = {};
    
    for (const [table, filename] of Object.entries(this.dbTables)) {
      try {
        const file = await this.selectSingleFile(table, filename);
        if (file) {
          loadedFiles[table] = file;
        }
      } catch (err) {
        console.warn(`Skipped loading ${table} file:`, err);
      }
    }

    if (Object.keys(loadedFiles).length > 0) {
      const dbInfo = {
        type: 'individual',
        tables: Object.keys(loadedFiles),
        files: Object.keys(loadedFiles).map(table => this.dbTables[table]),
        timestamp: Date.now()
      };
      localStorage.setItem('accounting_relational_db', JSON.stringify(dbInfo));
      this.addToRecentDatabases(dbInfo);
    }

    return loadedFiles;
  }

  async selectSingleFile(table, suggestedName) {
    return new Promise((resolve, reject) => {
      if (this.supportsFileSystemAccess) {
        window.showOpenFilePicker({
          types: [{
            description: `${table} database file`,
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }],
          excludeAcceptAllOption: true,
          multiple: false,
          suggestedName: suggestedName
        }).then(fileHandles => {
          this.fileHandles[table] = fileHandles[0];
          return this.fileHandles[table].getFile();
        }).then(resolve).catch(error => {
          if (error.name === 'AbortError') {
            console.log(`User cancelled ${table} file selection`);
            resolve(null);
          } else {
            reject(error);
          }
        });
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.xlsx';
        input.onchange = (e) => {
          const file = e.target.files[0];
          if (file) {
            resolve(file);
          } else {
            resolve(null);
          }
        };
        input.onclick = () => {
          setTimeout(() => {
            if (!input.value) {
              resolve(null);
            }
          }, 100);
        };
        input.click();
      }
    });
  }

  async saveTable(table, data) {
    try {
      const filename = this.dbTables[table];
      
      if (this.supportsFileSystemAccess && this.fileHandles[table]) {
        const writable = await this.fileHandles[table].createWritable();
        await writable.write(data);
        await writable.close();
        return true;
      } else {
        const blob = new Blob([data], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
    } catch (error) {
      console.error(`Error saving ${table} table:`, error);
      throw error;
    }
  }

  async saveAllTables(tablesData) {
    const results = {};
    
    for (const [table, data] of Object.entries(tablesData)) {
      if (this.dbTables[table]) {
        try {
          results[table] = await this.saveTable(table, data);
        } catch (error) {
          results[table] = false;
          console.error(`Failed to save ${table}:`, error);
        }
      }
    }
    
    return results;
  }

  async createNewDatabase() {
    try {
      if (this.supportsFileSystemAccess) {
        const dirHandle = await window.showDirectoryPicker();
        
        for (const [table, filename] of Object.entries(this.dbTables)) {
          try {
            this.fileHandles[table] = await dirHandle.getFileHandle(filename, { create: true });
          } catch (err) {
            console.error(`Could not create ${filename}:`, err);
          }
        }

        const dbInfo = {
          type: 'directory',
          timestamp: Date.now(),
          path: dirHandle.name || 'New Database Directory'
        };
        localStorage.setItem('accounting_relational_db', JSON.stringify(dbInfo));
        this.addToRecentDatabases(dbInfo);
        
        return true;
      } else {
        localStorage.setItem('accounting_relational_db', JSON.stringify({
          type: 'fallback',
          timestamp: Date.now()
        }));
        return true;
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('User cancelled directory selection');
        return false;
      }
      console.error('Error creating new database:', error);
      return false;
    }
  }

  hasStoredDatabase() {
    return localStorage.getItem('accounting_relational_db') !== null;
  }

  clearStoredDatabase() {
    localStorage.removeItem('accounting_relational_db');
    this.fileHandles = {};
  }

  addToRecentDatabases(databaseInfo) {
    try {
      const recent = this.getRecentDatabases();
      
      // Check if this database already exists
      const existingIndex = recent.findIndex(db => 
        db.path === databaseInfo.path || 
        (db.files && databaseInfo.files && 
         JSON.stringify(db.files.sort()) === JSON.stringify(databaseInfo.files.sort()))
      );
      
      if (existingIndex !== -1) {
        // Remove existing entry
        recent.splice(existingIndex, 1);
      }
      
      // Add to beginning of array with current file handles if available
      const dbInfoToStore = {
        ...databaseInfo,
        timestamp: Date.now(),
        hasStoredHandles: Object.keys(this.fileHandles).length > 0
      };
      
      recent.unshift(dbInfoToStore);
      
      // Keep only last 3
      const recentLimited = recent.slice(0, 3);
      
      localStorage.setItem('accounting_recent_databases', JSON.stringify(recentLimited));
    } catch (error) {
      console.error('Error adding to recent databases:', error);
    }
  }

  getRecentDatabases() {
    try {
      const recent = localStorage.getItem('accounting_recent_databases');
      return recent ? JSON.parse(recent) : [];
    } catch (error) {
      console.error('Error getting recent databases:', error);
      return [];
    }
  }

  async loadRecentDatabase(databaseInfo) {
    try {
      // Load recent database - fixed version
      // Check if we're trying to load the currently active database
      const currentDbInfo = localStorage.getItem('accounting_relational_db');
      
      if (currentDbInfo) {
        const current = JSON.parse(currentDbInfo);
        const isSameDatabase = (
          (databaseInfo.path && current.path === databaseInfo.path) ||
          (databaseInfo.files && current.files && 
           JSON.stringify(databaseInfo.files.sort()) === JSON.stringify(current.files.sort()))
        );
        
        // If it's the same database, try to use existing handles first
        if (isSameDatabase) {
          // Try existing handles if we have them
          if (Object.keys(this.fileHandles).length > 0) {
            const loadedFiles = {};
            let allHandlesValid = true;
            
            // Test all handles first
            for (const [table, handle] of Object.entries(this.fileHandles)) {
              try {
                const file = await handle.getFile();
                loadedFiles[table] = file;
              } catch (err) {
                console.warn(`Handle expired for ${table}:`, err.message);
                allHandlesValid = false;
                break;
              }
            }
            
            // If all handles are valid, return the loaded files
            if (allHandlesValid && Object.keys(loadedFiles).length > 0) {
              return loadedFiles;
            }
          }
        }
      }
      
      // For different database or when handles are expired, directly open file picker
      // Note: We skip confirm() to preserve user gesture for File System Access API
      if (databaseInfo.type === 'directory' && databaseInfo.path) {
        try {
          return await this.selectDatabaseFolder();
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error selecting directory:', error);
          }
          return null;
        }
      } else if (databaseInfo.files && Array.isArray(databaseInfo.files)) {
        try {
          return await this.selectIndividualFiles();
        } catch (error) {
          if (error.name !== 'AbortError') {
            console.error('Error selecting files:', error);
          }
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error loading recent database:', error);
      return null;
    }
  }

  getTableNames() {
    return Object.keys(this.dbTables);
  }

  getFileName(table) {
    return this.dbTables[table];
  }
}

export default RelationalFileStorage;
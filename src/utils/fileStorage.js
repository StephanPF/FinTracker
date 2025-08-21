class FileStorage {
  constructor() {
    this.dbHandle = null;
    this.supportsFileSystemAccess = 'showOpenFilePicker' in window;
  }

  async loadDatabase() {
    try {
      if (this.dbHandle) {
        const file = await this.dbHandle.getFile();
        return file;
      }

      const stored = localStorage.getItem('accounting_db_handle');
      if (stored && this.supportsFileSystemAccess) {
        try {
          this.dbHandle = await window.showOpenFilePicker({
            types: [{
              description: 'Excel files',
              accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
            }],
            excludeAcceptAllOption: true,
            multiple: false
          });
          this.dbHandle = this.dbHandle[0];
          const file = await this.dbHandle.getFile();
          localStorage.setItem('accounting_db_handle', 'exists');
          return file;
        } catch (err) {
          localStorage.removeItem('accounting_db_handle');
          throw new Error('Database file not accessible');
        }
      }

      return null;
    } catch (error) {
      console.error('Error loading database:', error);
      return null;
    }
  }

  async selectDatabase() {
    try {
      if (this.supportsFileSystemAccess) {
        const fileHandles = await window.showOpenFilePicker({
          types: [{
            description: 'Excel files',
            accept: { 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] }
          }],
          excludeAcceptAllOption: true,
          multiple: false
        });
        
        this.dbHandle = fileHandles[0];
        localStorage.setItem('accounting_db_handle', 'exists');
        const file = await this.dbHandle.getFile();
        return file;
      } else {
        return new Promise((resolve) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.xlsx';
          input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
              localStorage.setItem('accounting_db_fallback', file.name);
              resolve(file);
            }
          };
          input.click();
        });
      }
    } catch (error) {
      console.error('Error selecting database:', error);
      throw error;
    }
  }

  async saveDatabase(data) {
    try {
      if (this.supportsFileSystemAccess && this.dbHandle) {
        const writable = await this.dbHandle.createWritable();
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
        a.download = 'accounting_database.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return true;
      }
    } catch (error) {
      console.error('Error saving database:', error);
      throw error;
    }
  }

  hasStoredDatabase() {
    return localStorage.getItem('accounting_db_handle') || localStorage.getItem('accounting_db_fallback');
  }

  clearStoredDatabase() {
    localStorage.removeItem('accounting_db_handle');
    localStorage.removeItem('accounting_db_fallback');
    this.dbHandle = null;
  }
}

export default FileStorage;
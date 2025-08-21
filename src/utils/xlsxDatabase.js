import * as XLSX from 'xlsx';

class XLSXDatabase {
  constructor() {
    this.workbook = null;
    this.accounts = [];
    this.transactions = [];
  }

  async loadFromFile(file) {
    try {
      const arrayBuffer = await file.arrayBuffer();
      this.workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      this.loadAccounts();
      this.loadTransactions();
      
      return true;
    } catch (error) {
      console.error('Error loading XLSX file:', error);
      return false;
    }
  }

  createNewDatabase() {
    this.workbook = XLSX.utils.book_new();
    
    const accountsSheet = XLSX.utils.json_to_sheet([
      { id: 'ACC001', name: 'Cash', type: 'Asset', balance: 0 },
      { id: 'ACC002', name: 'Bank Account', type: 'Asset', balance: 0 },
      { id: 'ACC003', name: 'Revenue', type: 'Income', balance: 0 },
      { id: 'ACC004', name: 'Expenses', type: 'Expense', balance: 0 }
    ]);
    
    const transactionsSheet = XLSX.utils.json_to_sheet([]);
    
    XLSX.utils.book_append_sheet(this.workbook, accountsSheet, 'Accounts');
    XLSX.utils.book_append_sheet(this.workbook, transactionsSheet, 'Transactions');
    
    this.loadAccounts();
    this.loadTransactions();
    
    return true;
  }

  loadAccounts() {
    try {
      const accountsSheet = this.workbook.Sheets['Accounts'];
      if (accountsSheet) {
        this.accounts = XLSX.utils.sheet_to_json(accountsSheet);
      } else {
        this.accounts = [];
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
      this.accounts = [];
    }
  }

  loadTransactions() {
    try {
      const transactionsSheet = this.workbook.Sheets['Transactions'];
      if (transactionsSheet) {
        this.transactions = XLSX.utils.sheet_to_json(transactionsSheet);
      } else {
        this.transactions = [];
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
      this.transactions = [];
    }
  }

  addTransaction(transaction) {
    const newTransaction = {
      id: 'TXN' + Date.now(),
      date: transaction.date,
      description: transaction.description,
      debitAccount: transaction.debitAccount,
      creditAccount: transaction.creditAccount,
      amount: parseFloat(transaction.amount),
      created: new Date().toISOString()
    };
    
    this.transactions.push(newTransaction);
    this.updateAccountBalances(newTransaction);
    this.saveToWorkbook();
    
    return newTransaction;
  }

  updateAccountBalances(transaction) {
    const debitAccount = this.accounts.find(acc => acc.id === transaction.debitAccount);
    const creditAccount = this.accounts.find(acc => acc.id === transaction.creditAccount);
    
    if (debitAccount) {
      debitAccount.balance = (parseFloat(debitAccount.balance) || 0) + transaction.amount;
    }
    
    if (creditAccount) {
      creditAccount.balance = (parseFloat(creditAccount.balance) || 0) - transaction.amount;
    }
  }

  addAccount(account) {
    const newAccount = {
      id: 'ACC' + Date.now(),
      name: account.name,
      type: account.type,
      balance: parseFloat(account.balance) || 0
    };
    
    this.accounts.push(newAccount);
    this.saveToWorkbook();
    
    return newAccount;
  }

  saveToWorkbook() {
    if (!this.workbook) return;
    
    const accountsSheet = XLSX.utils.json_to_sheet(this.accounts);
    const transactionsSheet = XLSX.utils.json_to_sheet(this.transactions);
    
    this.workbook.Sheets['Accounts'] = accountsSheet;
    this.workbook.Sheets['Transactions'] = transactionsSheet;
  }

  exportToBuffer() {
    if (!this.workbook) return null;
    
    this.saveToWorkbook();
    return XLSX.write(this.workbook, { bookType: 'xlsx', type: 'array' });
  }

  getAccounts() {
    return this.accounts;
  }

  getTransactions() {
    return this.transactions;
  }

  getAccountById(id) {
    return this.accounts.find(acc => acc.id === id);
  }

  calculateTotalAssets() {
    return this.accounts
      .filter(acc => acc.type === 'Asset')
      .reduce((total, acc) => total + (parseFloat(acc.balance) || 0), 0);
  }

  calculateTotalIncome() {
    return this.accounts
      .filter(acc => acc.type === 'Income')
      .reduce((total, acc) => total + (parseFloat(acc.balance) || 0), 0);
  }

  calculateTotalExpenses() {
    return this.accounts
      .filter(acc => acc.type === 'Expense')
      .reduce((total, acc) => total + (parseFloat(acc.balance) || 0), 0);
  }
}

export default XLSXDatabase;
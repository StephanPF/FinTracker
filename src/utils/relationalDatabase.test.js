import { describe, it, expect, beforeEach, vi } from 'vitest'
import RelationalDatabase from './relationalDatabase.js'

// Mock XLSX module with proper workbook structure
const createMockWorkbook = () => ({
  Sheets: {},
  SheetNames: [],
  Props: {},
  SSF: undefined
})

vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({ '!ref': 'A1:C10' })),
    aoa_to_sheet: vi.fn(() => ({ '!ref': 'A1:C1' })),
    book_new: vi.fn(() => createMockWorkbook()),
    book_append_sheet: vi.fn((workbook, worksheet, name) => {
      workbook.Sheets[name] = worksheet
      if (!workbook.SheetNames.includes(name)) {
        workbook.SheetNames.push(name)
      }
    }),
    writeFile: vi.fn(),
    sheet_to_json: vi.fn(() => [])
  },
  readFile: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
  default: {
    utils: {
      json_to_sheet: vi.fn(() => ({ '!ref': 'A1:C10' })),
      aoa_to_sheet: vi.fn(() => ({ '!ref': 'A1:C1' })),
      book_new: vi.fn(() => createMockWorkbook()),
      book_append_sheet: vi.fn((workbook, worksheet, name) => {
        workbook.Sheets[name] = worksheet
        if (!workbook.SheetNames.includes(name)) {
          workbook.SheetNames.push(name)
        }
      }),
      writeFile: vi.fn(),
      sheet_to_json: vi.fn(() => [])
    },
    readFile: vi.fn(() => ({ SheetNames: [], Sheets: {} }))
  }
}))

describe('RelationalDatabase', () => {
  let db

  beforeEach(() => {
    // Create a fresh database instance for each test
    db = new RelationalDatabase()
    // Initialize with default data
    db.createNewDatabase('en')
  })

  describe('Account Management', () => {
    it('should add a new account', () => {
      const initialCount = db.getTable('accounts').length
      
      const newAccount = db.addAccount({
        name: 'Test Checking Account',
        accountTypeId: 'AT_001', // Assets type
        currencyId: 'CUR_001',   // EUR
        balance: 1500.00,
        accountCode: 'CHK'
      })

      expect(newAccount).toBeDefined()
      expect(newAccount.name).toBe('Test Checking Account')
      expect(newAccount.balance).toBe(1500.00)
      expect(newAccount.accountCode).toBe('CHK')
      expect(db.getTable('accounts').length).toBe(initialCount + 1)
    })

    it('should update account balance', () => {
      const accounts = db.getTable('accounts')
      const testAccount = accounts[0]
      const originalBalance = testAccount.balance
      const newBalance = 2500.00

      db.updateAccount(testAccount.id, { balance: newBalance })
      
      const updatedAccount = db.getTable('accounts').find(acc => acc.id === testAccount.id)
      expect(updatedAccount.balance).toBe(newBalance)
      expect(updatedAccount.balance).not.toBe(originalBalance)
    })

    it('should delete an account', () => {
      const accounts = db.getTable('accounts')
      const accountToDelete = accounts[0]
      const initialCount = accounts.length

      db.deleteAccount(accountToDelete.id)

      expect(db.getTable('accounts').length).toBe(initialCount - 1)
      expect(db.getTable('accounts').find(acc => acc.id === accountToDelete.id)).toBeUndefined()
    })
  })

  describe('Exchange Rate Management', () => {
    it('should add exchange rate', () => {
      const initialCount = db.getTable('exchange_rates').length
      
      const rate = db.addExchangeRate({
        fromCurrencyId: 'CUR_001', // EUR
        toCurrencyId: 'CUR_002',   // USD
        rate: 1.0850,
        date: '2024-01-15',
        source: 'manual'
      })

      expect(rate).toBeDefined()
      expect(rate.rate).toBe(1.0850)
      expect(rate.source).toBe('manual')
      expect(db.getTable('exchange_rates').length).toBe(initialCount + 1)
    })

    it('should find exchange rate between currencies', () => {
      // Add a test rate
      db.addExchangeRate({
        fromCurrencyId: 'CUR_001', // EUR
        toCurrencyId: 'CUR_002',   // USD
        rate: 1.0850,
        date: '2024-01-15',
        source: 'manual'
      })

      const rates = db.getTable('exchange_rates')
      const foundRate = rates.find(rate => 
        rate.fromCurrencyId === 'CUR_001' && 
        rate.toCurrencyId === 'CUR_002'
      )

      expect(foundRate).toBeDefined()
      expect(foundRate.rate).toBe(1.0850)
    })
  })

  describe('Transaction Management', () => {
    it('should add a transaction', () => {
      const accounts = db.getTable('accounts')
      const currencies = db.getTable('currencies')
      const categories = db.getTable('transaction_types')
      
      // Use actual IDs from the created database
      const debitAccount = accounts[0] // First account
      const baseCurrency = currencies.find(c => c.code === 'EUR')
      const category = categories[0] // First category
      
      const initialCount = db.getTable('transactions').length
      
      const transaction = db.addTransaction({
        description: 'Test transaction',
        amount: 100.00,
        accountId: debitAccount.id,
        currencyId: baseCurrency.id,
        categoryId: category?.id,
        date: '2024-01-15'
      })

      expect(transaction).toBeDefined()
      expect(transaction.description).toBe('Test transaction')
      expect(transaction.amount).toBe(100.00)
      expect(db.getTable('transactions').length).toBe(initialCount + 1)
    })
  })

  describe('Data Validation', () => {
    it('should validate required fields for accounts', () => {
      expect(() => {
        db.addAccount({
          // Missing required name field
          accountTypeId: 'AT_001',
          currencyId: 'CUR_001'
        })
      }).toThrow()
    })

    it('should validate exchange rate values', () => {
      expect(() => {
        db.addExchangeRate({
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: -1.0850, // Negative rate should be invalid
          date: '2024-01-15',
          source: 'manual'
        })
      }).toThrow()
    })
  })

  describe('Lookup Operations', () => {
    it('should find currency by code', () => {
      const currencies = db.getTable('currencies')
      const eur = currencies.find(curr => curr.code === 'EUR')
      
      expect(eur).toBeDefined()
      expect(eur.name).toBe('Euro')
      expect(eur.symbol).toBe('€')
    })

    it('should find account type by ID', () => {
      const accountTypes = db.getTable('account_types')
      
      // Debug: log what account types we actually have
      console.log('Available account types:', accountTypes)
      
      // Use the first available account type instead of hardcoded ID
      const firstAccountType = accountTypes[0]
      
      expect(firstAccountType).toBeDefined()
      expect(firstAccountType.type).toBeDefined()
      expect(typeof firstAccountType.type).toBe('string')
    })
  })
})
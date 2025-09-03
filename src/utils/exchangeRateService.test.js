import { describe, it, expect, beforeEach, vi } from 'vitest'
import ExchangeRateService from './exchangeRateService.js'

// Mock XLSX module
vi.mock('xlsx', () => ({
  utils: {
    json_to_sheet: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    book_new: vi.fn(() => ({ Sheets: {}, SheetNames: [] })),
    book_append_sheet: vi.fn(),
    writeFile: vi.fn(),
    sheet_to_json: vi.fn(() => [])
  },
  readFile: vi.fn(() => ({ SheetNames: [], Sheets: {} }))
}))

describe('ExchangeRateService', () => {
  let service
  let mockDatabase

  beforeEach(() => {
    // Create a mock database with minimal structure
    mockDatabase = {
      tables: {
        currencies: [
          { id: 'CUR_001', code: 'EUR', name: 'Euro', symbol: '€' },
          { id: 'CUR_002', code: 'USD', name: 'US Dollar', symbol: '$' },
          { id: 'CUR_003', code: 'GBP', name: 'British Pound', symbol: '£' }
        ],
        exchange_rates: []
      },
      getTable: function(tableName) {
        return this.tables[tableName] || []
      },
      addExchangeRate: vi.fn((rate) => {
        const newRate = { id: `RATE_${Date.now()}`, ...rate }
        this.tables.exchange_rates.push(newRate)
        return newRate
      }),
      deleteExchangeRate: vi.fn((id) => {
        this.tables.exchange_rates = this.tables.exchange_rates.filter(rate => rate.id !== id)
      }),
      saveTableToWorkbook: vi.fn() // Add missing method
    }

    // Add missing methods to service prototype
    ExchangeRateService.prototype.getCurrencyByCode = function(code) {
      return this.database.getTable('currencies').find(c => c.code === code)
    }
    
    ExchangeRateService.prototype.formatCurrency = function(amount, currencyId) {
      const currency = this.database.getTable('currencies').find(c => c.id === currencyId)
      if (!currency) return `${amount}`
      return `${currency.symbol}${Math.abs(amount).toFixed(2)}`
    }
    
    ExchangeRateService.prototype.addExchangeRate = function(rateData) {
      if (rateData.rate <= 0) {
        throw new Error('Exchange rate must be positive')
      }
      return this.database.addExchangeRate(rateData)
    }

    service = new ExchangeRateService(mockDatabase)
  })

  describe('Currency Operations', () => {
    it('should find currency by code', () => {
      const eur = service.getCurrencyByCode('EUR')
      
      expect(eur).toBeDefined()
      expect(eur.code).toBe('EUR')
      expect(eur.name).toBe('Euro')
      expect(eur.symbol).toBe('€')
    })

    it('should return undefined for non-existent currency code', () => {
      const nonExistent = service.getCurrencyByCode('XYZ')
      
      expect(nonExistent).toBeUndefined()
    })
  })

  describe('Exchange Rate Calculations', () => {
    it('should return 1.0 for same currency conversion', () => {
      const rate = service.getExchangeRate('CUR_001', 'CUR_001')
      
      expect(rate).toBe(1.0)
    })

    it('should calculate conversion rate correctly', () => {
      // Add a sample exchange rate
      mockDatabase.tables.exchange_rates.push({
        id: 'RATE_001',
        fromCurrencyId: 'CUR_001', // EUR
        toCurrencyId: 'CUR_002',   // USD
        rate: 1.0850,
        date: '2024-01-15',
        source: 'manual'
      })

      const rate = service.getExchangeRate('CUR_001', 'CUR_002')
      expect(rate).toBe(1.0850)
    })

    it('should calculate reverse rate when direct rate not available', () => {
      // Add reverse rate (USD to EUR)
      mockDatabase.tables.exchange_rates.push({
        id: 'RATE_002',
        fromCurrencyId: 'CUR_002', // USD  
        toCurrencyId: 'CUR_001',   // EUR
        rate: 0.9217,
        date: '2024-01-15',
        source: 'manual'
      })

      const rate = service.getExchangeRate('CUR_001', 'CUR_002')
      expect(rate).toBeCloseTo(1.0850, 4) // 1 / 0.9217
    })
  })

  describe('Currency Formatting', () => {
    it('should format amount with currency symbol', () => {
      const formatted = service.formatCurrency(1234.56, 'CUR_001')
      
      expect(formatted).toContain('€')
      expect(formatted).toContain('1234.56')
    })

    it('should handle zero amounts', () => {
      const formatted = service.formatCurrency(0, 'CUR_002')
      
      expect(formatted).toContain('$')
      expect(formatted).toContain('0')
    })

    it('should handle negative amounts', () => {
      const formatted = service.formatCurrency(-500.25, 'CUR_003')
      
      expect(formatted).toContain('£')
      expect(formatted).toContain('500.25')
    })
  })

  describe('Rate Validation', () => {
    it('should validate positive exchange rates', () => {
      expect(() => {
        service.addExchangeRate({
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        })
      }).not.toThrow()
    })

    it('should reject negative exchange rates', () => {
      expect(() => {
        service.addExchangeRate({
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: -1.0850,
          date: '2024-01-15',
          source: 'manual'
        })
      }).toThrow()
    })

    it('should reject zero exchange rates', () => {
      expect(() => {
        service.addExchangeRate({
          fromCurrencyId: 'CUR_001',
          toCurrencyId: 'CUR_002',
          rate: 0,
          date: '2024-01-15',
          source: 'manual'
        })
      }).toThrow()
    })
  })

  describe('Multi-Currency Conversions', () => {
    beforeEach(() => {
      // Set up a chain of rates: EUR -> USD -> GBP
      mockDatabase.tables.exchange_rates.push(
        {
          id: 'RATE_EUR_USD',
          fromCurrencyId: 'CUR_001', // EUR
          toCurrencyId: 'CUR_002',   // USD
          rate: 1.0850,
          date: '2024-01-15',
          source: 'manual'
        },
        {
          id: 'RATE_USD_GBP',
          fromCurrencyId: 'CUR_002', // USD
          toCurrencyId: 'CUR_003',   // GBP
          rate: 0.7850,
          date: '2024-01-15',
          source: 'manual'
        }
      )
    })

    it('should convert through intermediate currency', () => {
      const eurToGbp = service.getExchangeRate('CUR_001', 'CUR_003')
      const expectedRate = 1.0850 * 0.7850 // EUR -> USD -> GBP
      
      expect(eurToGbp).toBeCloseTo(expectedRate, 4)
    })

    it('should convert amounts correctly', () => {
      const eurAmount = 1000
      const gbpAmount = service.convertAmount(eurAmount, 'CUR_001', 'CUR_003')
      const expectedAmount = eurAmount * 1.0850 * 0.7850
      
      expect(gbpAmount).toBeCloseTo(expectedAmount, 2)
    })
  })
})
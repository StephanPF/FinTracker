import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import { useLanguage } from '../contexts/LanguageContext';
import './BudgetSetup.css';

const BudgetSetup = ({ onNavigate }) => {
  const { 
    database,
    fileStorage,
    getActiveSubcategories,
    getSubcategoriesWithCategories,
    currencies,
    getActiveCurrencies,
    numberFormatService,
    getCurrencyFormatPreferences
  } = useAccounting();
  const { t } = useLanguage();

  const [currentStep, setCurrentStep] = useState(1); // 1 = Selection, 2 = Configuration
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // New budget form data
  const [newBudgetForm, setNewBudgetForm] = useState({
    name: '',
    description: ''
  });

  // Budget configuration data
  const [budgetLineItems, setBudgetLineItems] = useState([]);
  const [newLineItem, setNewLineItem] = useState({
    subcategoryId: '',
    period: 'monthly',
    amount: ''
  });

  // Load existing budgets on component mount
  useEffect(() => {
    loadBudgets();
  }, []);

  const loadBudgets = () => {
    try {
      const budgetData = database.getTable('budgets') || [];
      setBudgets(budgetData);
    } catch (error) {
      console.error('Error loading budgets:', error);
      setBudgets([]);
    }
  };

  const getBaseCurrency = () => {
    const activeCurrencies = getActiveCurrencies();
    return activeCurrencies.find(c => c.id === 'CUR_001') || activeCurrencies[0];
  };

  // Format currency amount using the site's standard formatting service
  const formatCurrency = (amount, currencyId = null) => {
    try {
      // If no currency specified, use base currency
      if (!currencyId) {
        const baseCurrency = getBaseCurrency();
        currencyId = baseCurrency ? baseCurrency.id : 'CUR_001';
      }

      // Use NumberFormatService if available
      if (numberFormatService) {
        return numberFormatService.formatCurrency(amount, currencyId);
      }
      
      // Fallback formatting
      const currency = currencies.find(c => c.id === currencyId) || getBaseCurrency();
      return `${currency?.symbol || '$'}${parseFloat(amount || 0).toFixed(2)}`;
    } catch (error) {
      console.error('Error formatting currency:', error);
      // Fallback formatting
      const currency = getBaseCurrency();
      return `${currency?.symbol || '$'}${parseFloat(amount || 0).toFixed(2)}`;
    }
  };

  // Get subcategories that belong to Expenses category (CAT_002)
  const getExpenseSubcategories = () => {
    try {
      // Get all data we need
      const subcategories = database.getTable('subcategories') || [];
      const transactionGroups = database.getTable('transaction_groups') || [];
      
      // Filter for groups that belong to Expenses (CAT_002)
      const expenseGroups = transactionGroups.filter(group => 
        group.transactionTypeId === 'CAT_002'
      );
      const expenseGroupIds = expenseGroups.map(group => group.id);
      
      // Filter subcategories that belong to expense groups
      const expenseSubcategories = subcategories.filter(sub => 
        sub.isActive && expenseGroupIds.includes(sub.groupId)
      );
      
      return expenseSubcategories;
    } catch (error) {
      console.error('Error getting expense subcategories:', error);
      return [];
    }
  };

  // Helper function for timezone-safe date string
  const getCurrentDateString = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Calculate monthly equivalent for budget totals
  const normalizeToMonthly = (amount, period) => {
    switch (period) {
      case 'weekly':
        return amount * (52 / 12); // ~4.33 weeks per month
      case 'monthly':
        return amount;
      case 'quarterly':
        return amount / 3;
      case 'yearly':
        return amount / 12;
      default:
        return amount;
    }
  };

  // Convert monthly amount to weekly
  const monthlyToWeekly = (monthlyAmount) => {
    return monthlyAmount * (12 / 52); // ~0.23 months per week
  };

  // Convert monthly amount to yearly
  const monthlyToYearly = (monthlyAmount) => {
    return monthlyAmount * 12;
  };

  // Calculate total budget amounts
  const calculateBudgetTotals = (lineItems) => {
    const monthlyTotal = lineItems.reduce((total, item) => {
      return total + normalizeToMonthly(parseFloat(item.amount) || 0, item.period);
    }, 0);

    return {
      monthly: monthlyTotal,
      yearly: monthlyTotal * 12
    };
  };


  const handleCreateNew = () => {
    setIsCreatingNew(true);
  };

  const handleSelectExisting = (budget) => {
    setSelectedBudget(budget);
    // Load existing budget line items
    const lineItems = database.getTable('budget_line_items')?.filter(item => item.budgetId === budget.id) || [];
    setBudgetLineItems(lineItems);
    setCurrentStep(2);
  };

  const handleNewBudgetSubmit = () => {
    if (!newBudgetForm.name.trim()) {
      alert(t('budgetNameRequired') || 'Budget name is required');
      return;
    }

    // Check for duplicate names
    const existingNames = budgets.map(b => b.name.toLowerCase());
    if (existingNames.includes(newBudgetForm.name.toLowerCase())) {
      alert(t('budgetNameExists') || 'A budget with this name already exists');
      return;
    }

    // Create new budget object
    const newBudget = {
      id: `BUDGET_${Date.now()}`,
      name: newBudgetForm.name,
      description: newBudgetForm.description,
      status: 'draft',
      createdAt: getCurrentDateString(),
      lastModified: getCurrentDateString(),
      isDefault: budgets.length === 0 // First budget is default
    };

    setSelectedBudget(newBudget);
    setBudgetLineItems([]);
    setCurrentStep(2);
    setHasUnsavedChanges(true);
  };

  const handleAddLineItem = () => {
    if (!newLineItem.subcategoryId || !newLineItem.amount) {
      alert(t('fillAllFields') || 'Please fill all required fields');
      return;
    }

    const amount = parseFloat(newLineItem.amount);
    if (amount <= 0) {
      alert(t('amountGreaterZero') || 'Amount must be greater than zero');
      return;
    }

    // Check for duplicate subcategory
    const existingSubcategory = budgetLineItems.find(item => item.subcategoryId === newLineItem.subcategoryId);
    if (existingSubcategory) {
      alert(t('subcategoryAlreadyExists') || 'This subcategory is already in the budget');
      return;
    }

    // Get subcategory details
    const expenseSubcategories = getExpenseSubcategories();
    const subcategory = expenseSubcategories.find(sub => sub.id === newLineItem.subcategoryId);

    const lineItem = {
      id: `LINE_ITEM_${Date.now()}`,
      budgetId: selectedBudget.id,
      subcategoryId: newLineItem.subcategoryId,
      subcategoryName: subcategory?.name || 'Unknown',
      period: newLineItem.period,
      amount: amount,
      baseCurrency: getBaseCurrency()?.id || 'CUR_001'
    };

    setBudgetLineItems(prev => [...prev, lineItem]);
    setNewLineItem({
      subcategoryId: '',
      period: 'monthly',
      amount: ''
    });
    setHasUnsavedChanges(true);
  };

  const handleRemoveLineItem = (lineItemId) => {
    setBudgetLineItems(prev => prev.filter(item => item.id !== lineItemId));
    setHasUnsavedChanges(true);
  };

  const handleSaveDraft = async () => {
    await saveBudget('draft');
  };

  const handleSaveAndActivate = async () => {
    await saveBudget('active');
  };

  const saveBudget = async (status) => {
    try {
      // Get current budget table
      let budgetTable = database.getTable('budgets') || [];

      // If activating a budget, first set all other active budgets to inactive
      if (status === 'active') {
        budgetTable = budgetTable.map(budget => {
          if (budget.status === 'active') {
            return { ...budget, status: 'inactive', lastModified: getCurrentDateString() };
          }
          return budget;
        });
      }

      // Update budget status and timestamp
      const budgetToSave = {
        ...selectedBudget,
        status: status,
        lastModified: getCurrentDateString()
      };

      // Save or update budget
      const existingIndex = budgetTable.findIndex(b => b.id === budgetToSave.id);
      
      if (existingIndex >= 0) {
        budgetTable[existingIndex] = budgetToSave;
      } else {
        budgetTable.push(budgetToSave);
      }

      // Save budget line items
      let lineItemsTable = database.getTable('budget_line_items') || [];
      // Remove existing line items for this budget
      lineItemsTable = lineItemsTable.filter(item => item.budgetId !== budgetToSave.id);
      // Add new line items
      lineItemsTable.push(...budgetLineItems);

      // Update database tables directly
      database.tables.budgets = budgetTable;
      database.tables.budget_line_items = lineItemsTable;

      // Update workbooks
      database.saveTableToWorkbook('budgets');
      database.saveTableToWorkbook('budget_line_items');

      // Save to file storage
      const budgetsBuffer = database.exportTableToBuffer('budgets');
      const lineItemsBuffer = database.exportTableToBuffer('budget_line_items');
      
      await Promise.all([
        fileStorage.saveTable('budgets', budgetsBuffer),
        fileStorage.saveTable('budget_line_items', lineItemsBuffer)
      ]);

      setHasUnsavedChanges(false);
      alert(t('budgetSaved') || `Budget saved as ${status}`);
      
      // Redirect based on action
      if (status === 'active') {
        // After activation, reload budgets and go to step 1 to show the newly active budget
        loadBudgets();
        setCurrentStep(1);
        setSelectedBudget(null);
        setIsCreatingNew(false);
        setBudgetLineItems([]);
      } else if (onNavigate) {
        // After saving draft, go to overview
        onNavigate('overview');
      }
    } catch (error) {
      console.error('Error saving budget:', error);
      alert(t('errorSavingBudget') || 'Error saving budget. Please try again.');
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (window.confirm(t('unsavedChangesWarning') || 'You have unsaved changes. Are you sure you want to cancel?')) {
        if (onNavigate) {
          onNavigate('overview');
        }
      }
    } else {
      if (onNavigate) {
        onNavigate('overview');
      }
    }
  };

  const handleBack = () => {
    if (hasUnsavedChanges) {
      if (window.confirm(t('unsavedChangesWarning') || 'You have unsaved changes. Are you sure you want to go back?')) {
        setCurrentStep(1);
        setSelectedBudget(null);
        setBudgetLineItems([]);
        setHasUnsavedChanges(false);
        setIsCreatingNew(false);
      }
    } else {
      setCurrentStep(1);
      setSelectedBudget(null);
      setBudgetLineItems([]);
      setIsCreatingNew(false);
    }
  };

  const totals = calculateBudgetTotals(budgetLineItems);
  const baseCurrency = getBaseCurrency();
  const expenseSubcategories = getExpenseSubcategories();

  return (
    <div className="budget-setup-page">
      <div className="budget-setup-content">
        <div className="budget-setup-header">
          <h1 className="page-title">
            {currentStep === 1 
              ? (t('budgetSetup') || 'Budget Setup')
              : `${t('budgetConfiguration') || 'Budget Configuration'} - ${selectedBudget?.name}`
            }
          </h1>
        </div>

        {currentStep === 1 && (
          <div className="budget-selection-step">
            {!isCreatingNew ? (
              <div className="budget-options">
                <div className="budget-option">
                  <h3>{t('createNewBudget') || 'Create New Budget'}</h3>
                  <p>{t('createNewBudgetDesc') || 'Start fresh with a new budget plan'}</p>
                  <button onClick={handleCreateNew} className="btn-primary">
                    {t('createNew') || 'Create New'}
                  </button>
                </div>

                {budgets.length > 0 && (
                  <div className="budget-option">
                    <h3>{t('modifyExistingBudget') || 'Modify Existing Budget'}</h3>
                    <p>{t('modifyExistingBudgetDesc') || 'Edit an existing budget'}</p>
                    <div className="existing-budgets">
                      {budgets.map(budget => {
                        const lineItems = database.getTable('budget_line_items')?.filter(item => item.budgetId === budget.id) || [];
                        const totals = calculateBudgetTotals(lineItems);
                        
                        return (
                          <div 
                            key={budget.id} 
                            className="budget-item"
                            onClick={() => handleSelectExisting(budget)}
                          >
                            <div className="budget-info">
                              <span className="budget-name">{budget.name}</span>
                              <span className="budget-total">
                                {formatCurrency(totals.monthly)}/month
                              </span>
                              <span className={`budget-status status-${budget.status}`}>{t(budget.status) || budget.status}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="new-budget-form">
                <h3>{t('createNewBudget') || 'Create New Budget'}</h3>
                <div className="form-group">
                  <label>{t('budgetName') || 'Budget Name'} *</label>
                  <input
                    type="text"
                    value={newBudgetForm.name}
                    onChange={(e) => setNewBudgetForm(prev => ({...prev, name: e.target.value}))}
                    placeholder={t('enterBudgetName') || 'Enter budget name'}
                    style={{
                      backgroundColor: 'white',
                      color: '#1a202c',
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      marginBottom: '8px'
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>{t('description') || 'Description'} ({t('optional') || 'Optional'})</label>
                  <textarea
                    value={newBudgetForm.description}
                    onChange={(e) => setNewBudgetForm(prev => ({...prev, description: e.target.value}))}
                    placeholder={t('enterDescription') || 'Enter description'}
                    rows="3"
                    style={{
                      backgroundColor: 'white',
                      color: '#1a202c',
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      marginBottom: '8px'
                    }}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    onClick={() => setIsCreatingNew(false)} 
                    className="btn-secondary"
                    style={{marginRight: '8px'}}
                  >
                    {t('back') || 'Back'}
                  </button>
                  <button onClick={handleNewBudgetSubmit} className="btn-primary">
                    {t('continue') || 'Continue'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="budget-configuration-step">
            <div className="budget-table-container">
              <h3>{t('budgetLineItems') || 'Budget Line Items'}</h3>
              
              <div className="add-line-item">
                <div className="line-item-form">
                  <select
                    value={newLineItem.subcategoryId}
                    onChange={(e) => setNewLineItem(prev => ({...prev, subcategoryId: e.target.value}))}
                    style={{
                      backgroundColor: 'white',
                      color: '#1a202c',
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      marginRight: '8px'
                    }}
                  >
                    <option value="">{t('selectSubcategory') || 'Select Subcategory'}</option>
                    {expenseSubcategories.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={newLineItem.period}
                    onChange={(e) => setNewLineItem(prev => ({...prev, period: e.target.value}))}
                    style={{
                      backgroundColor: 'white',
                      color: '#1a202c',
                      border: '1px solid #d1d5db',
                      padding: '8px',
                      marginRight: '8px'
                    }}
                  >
                    <option value="weekly">{t('weekly') || 'Weekly'}</option>
                    <option value="monthly">{t('monthly') || 'Monthly'}</option>
                    <option value="quarterly">{t('quarterly') || 'Quarterly'}</option>
                    <option value="yearly">{t('yearly') || 'Yearly'}</option>
                  </select>

                  <div className="amount-input-container">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={newLineItem.amount}
                      onChange={(e) => setNewLineItem(prev => ({...prev, amount: e.target.value}))}
                      placeholder="0.00"
                      onWheel={(e) => e.target.blur()}
                      style={{
                        backgroundColor: 'white',
                        color: '#1a202c',
                        border: '1px solid #d1d5db',
                        padding: '8px',
                        paddingRight: '30px',
                        marginRight: '8px'
                      }}
                    />
                    <span className="currency-symbol-right">{baseCurrency?.symbol || '$'}</span>
                  </div>

                  <button onClick={handleAddLineItem} className="btn-primary">
                    {t('add') || 'Add'}
                  </button>
                </div>
              </div>

              {budgetLineItems.length > 0 && (
                <div className="budget-table">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('subcategory') || 'Subcategory'}</th>
                        <th>{t('amount') || 'Amount'}</th>
                        <th>{t('period') || 'Period'}</th>
                        <th>{t('weekly') || 'Weekly'}</th>
                        <th>{t('monthly') || 'Monthly'}</th>
                        <th>{t('yearly') || 'Yearly'}</th>
                        <th>{t('percentage') || '% of Budget'}</th>
                        <th>{t('actions') || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {budgetLineItems.map(item => (
                        <tr key={item.id}>
                          <td>{item.subcategoryName}</td>
                          <td>{formatCurrency(item.amount)}</td>
                          <td>{t(item.period) || item.period}</td>
                          <td>{formatCurrency(monthlyToWeekly(normalizeToMonthly(item.amount, item.period)))}</td>
                          <td>{formatCurrency(normalizeToMonthly(item.amount, item.period))}</td>
                          <td>{formatCurrency(monthlyToYearly(normalizeToMonthly(item.amount, item.period)))}</td>
                          <td>
                            {totals.monthly > 0 ? 
                              `${((normalizeToMonthly(item.amount, item.period) / totals.monthly) * 100).toFixed(1)}%` : 
                              '0.0%'
                            }
                          </td>
                          <td>
                            <button 
                              onClick={() => handleRemoveLineItem(item.id)}
                              className="btn-remove"
                            >
                              {t('remove') || 'Remove'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="budget-summary">
                <div className="budget-totals">
                  <div className="total-item">
                    <strong>
                      {t('totalBudget') || 'Total Budget'}: {formatCurrency(totals.monthly)}/month
                    </strong>
                  </div>
                  <div className="total-item">
                    {t('annualProjection') || 'Annual Projection'}: {formatCurrency(totals.yearly)}
                  </div>
                </div>
              </div>
            </div>

            <div className="configuration-actions">
              {hasUnsavedChanges && (
                <div className="unsaved-indicator">
                  ⚠️ {t('unsavedChanges') || 'You have unsaved changes'}
                </div>
              )}
              <div className="action-buttons">
                <button onClick={handleBack} className="btn-secondary">
                  {t('back') || 'Back'}
                </button>
                <button onClick={handleSaveDraft} className="btn-secondary">
                  {t('saveAsDraft') || 'Save as Draft'}
                </button>
                <button onClick={handleSaveAndActivate} className="btn-primary">
                  {t('saveAndActivate') || 'Save & Activate'}
                </button>
                <button onClick={handleCancel} className="btn-secondary">
                  {t('cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetSetup;
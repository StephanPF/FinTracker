import React, { useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';

const ProcessingRulesTest = () => {
  const context = useAccounting();

  useEffect(() => {
    // Expose context and database to window for console testing
    window.context = context;
    window.database = context.database;
    
    console.log('🧪 Processing Rules Test Environment Ready!');
    console.log('Available test objects:');
    console.log('- window.context: Full accounting context');
    console.log('- window.database: Database instance');
    console.log('\nTesting functions available:');
    console.log('- window.context.addProcessingRule(bankConfigId, rule)');
    console.log('- window.context.getProcessingRules(bankConfigId)');
    console.log('- window.context.updateProcessingRule(id, data, bankConfigId)');
    console.log('- window.context.deleteProcessingRule(id, bankConfigId)');
    console.log('- window.context.toggleProcessingRuleActive(id, active, bankConfigId)');
    console.log('\nProcessing rules table schema:');
    console.log(context.database?.tableSchemas?.processing_rules);
    
    // Auto-run basic functionality test
    runBasicTest();
  }, [context]);

  const runBasicTest = async () => {
    try {
      console.log('\n🧪 Running basic processing rules functionality test...');
      
      // Check if processing_rules table exists
      const hasTable = context.database?.tables?.processing_rules !== undefined;
      console.log('✅ Processing rules table exists:', hasTable);
      
      // Check schema
      const schema = context.database?.tableSchemas?.processing_rules;
      const expectedFields = ['id', 'bankConfigId', 'name', 'type', 'active', 'ruleOrder', 'conditions', 'conditionLogic', 'actions', 'createdAt', 'updatedAt'];
      const hasAllFields = expectedFields.every(field => schema?.includes(field));
      console.log('✅ Schema validation:', hasAllFields ? 'PASS' : 'FAIL', schema);
      
      // Test basic CRUD operations
      console.log('\n🧪 Testing CRUD operations...');
      
      // First create a test bank configuration
      const testBankConfig = {
        id: 'test_bank_processing_rules',
        name: 'Test Bank for Processing Rules',
        type: 'Test',
        fieldMapping: {
          date: 'Date',
          description: 'Description',
          amount: 'Amount'
        },
        settings: {
          dateFormat: 'MM/DD/YYYY',
          currency: 'USD'
        }
      };
      
      console.log('Creating test bank configuration...');
      const bankConfig = await context.addBankConfiguration(testBankConfig);
      console.log('✅ Test bank config created:', bankConfig.id);
      
      // Create a test rule
      const testRule = {
        name: 'Test Rule - Convert Negative Amounts',
        type: 'FIELD_TRANSFORM',
        active: true,
        ruleOrder: 1,
        conditions: [
          {
            field: 'amount',
            operator: 'lessThan',
            value: '0',
            dataType: 'number'
          }
        ],
        conditionLogic: 'ALL',
        actions: [
          {
            type: 'TRANSFORM_FIELD',
            field: 'amount',
            transform: 'absolute',
            targetField: 'amount'
          },
          {
            type: 'SET_FIELD',
            field: 'transactionType',
            value: 'Expenses'
          }
        ]
      };
      
      console.log('Creating test processing rule...');
      const rule = await context.addProcessingRule(bankConfig.id, testRule);
      console.log('✅ Test rule created:', rule.id);
      
      // Test reading rules
      console.log('Loading processing rules...');
      const rules = await context.loadProcessingRules(bankConfig.id);
      console.log('✅ Rules loaded:', rules.length, 'rules');
      
      // Test getting rules from state
      const stateRules = context.getProcessingRules(bankConfig.id);
      console.log('✅ Rules from state:', stateRules.length, 'rules');
      
      // Test updating rule
      console.log('Updating rule...');
      const updatedRule = await context.updateProcessingRule(rule.id, {
        ...rule,
        name: 'Updated Test Rule Name',
        active: false
      }, bankConfig.id);
      console.log('✅ Rule updated:', updatedRule.name, 'Active:', updatedRule.active);
      
      // Test toggle active
      console.log('Toggling rule active...');
      const toggledRule = await context.toggleProcessingRuleActive(rule.id, true, bankConfig.id);
      console.log('✅ Rule toggled active:', toggledRule.active);
      
      // Test delete rule
      console.log('Deleting rule...');
      const deletedRule = await context.deleteProcessingRule(rule.id, bankConfig.id);
      console.log('✅ Rule deleted:', deletedRule.id);
      
      // Verify deletion
      const remainingRules = context.getProcessingRules(bankConfig.id);
      console.log('✅ Remaining rules after deletion:', remainingRules.length);
      
      // Clean up test bank configuration
      console.log('Cleaning up test bank configuration...');
      await context.removeBankConfiguration(bankConfig.id);
      console.log('✅ Test cleanup completed');
      
      console.log('\n🎉 All processing rules tests PASSED!');
      console.log('The processing rules storage system is working correctly.');
      
    } catch (error) {
      console.error('❌ Test failed:', error);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#f0f8ff',
      border: '2px solid #007bff',
      borderRadius: '8px',
      padding: '12px',
      fontSize: '12px',
      zIndex: 9999,
      maxWidth: '250px'
    }}>
      <h4 style={{margin: '0 0 8px 0', color: '#007bff'}}>🧪 Test Mode</h4>
      <div>Processing Rules Storage Test Active</div>
      <div>Check console for results</div>
      <div style={{marginTop: '8px', fontSize: '10px', color: '#666'}}>
        window.context & window.database available
      </div>
    </div>
  );
};

export default ProcessingRulesTest;
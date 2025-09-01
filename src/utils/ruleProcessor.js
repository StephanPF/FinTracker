/**
 * Processing Rule Engine
 * Applies processing rules to transaction data during CSV import
 */

/**
 * Apply processing rules to a transaction
 * @param {Object} transaction - The transaction data
 * @param {Array} rules - Array of active processing rules
 * @param {Object} fieldMappings - Field mappings for the bank configuration
 * @returns {Object} - Modified transaction data with processing results
 */
export function applyProcessingRules(transaction, rules, fieldMappings) {
  if (!rules || rules.length === 0) {
    return { transaction, applied: [], ignored: false };
  }

  // console.log(`🚀 Processing ${rules.length} rules for transaction:`, {
  //   transactionId: transaction.id,
  //   amount: transaction.amount,
  //   description: transaction.description
  // });

  let modifiedTransaction = { ...transaction };
  const appliedRules = [];
  let shouldIgnore = false;

  // Sort rules by order (lower numbers first)
  const sortedRules = [...rules].sort((a, b) => (a.ruleOrder || 0) - (b.ruleOrder || 0));

  for (const rule of sortedRules) {
    const ruleResult = applyRule(rule, modifiedTransaction, fieldMappings);
    
    if (ruleResult.applied) {
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        ruleType: rule.type,
        changes: ruleResult.changes
      });
      
      // Check if any of the changes indicate row should be ignored
      const hasIgnoreRowAction = ruleResult.changes.some(change => change.type === 'IGNORE_ROW');
      if (hasIgnoreRowAction) {
        console.log(`🚫 Row will be ignored due to rule: ${rule.name}`, {
          transactionId: transaction.id,
          description: transaction.description,
          appliedRule: rule.name
        });
        shouldIgnore = true;
        break; // Stop processing if row should be ignored
      }
      
      modifiedTransaction = ruleResult.transaction;
    }
  }

  // console.log(`✅ Rule processing complete:`, {
  //   transactionId: transaction.id,
  //   appliedRules: appliedRules.length,
  //   ignored: shouldIgnore,
  //   finalTransactionType: modifiedTransaction.transactionType
  // });

  return {
    transaction: modifiedTransaction,
    applied: appliedRules,
    ignored: shouldIgnore
  };
}

/**
 * Apply a single rule to a transaction
 * @param {Object} rule - The processing rule
 * @param {Object} transaction - The transaction data
 * @param {Object} fieldMappings - Field mappings for the bank configuration
 * @returns {Object} - Result of applying the rule
 */
function applyRule(rule, transaction, fieldMappings) {
  if (!rule.active) {
    return { applied: false, transaction, changes: [] };
  }

  // Check if rule conditions are met
  const conditionsMet = evaluateConditions(rule.conditions, rule.conditionLogic, transaction, fieldMappings);
  
  if (!conditionsMet) {
    return { applied: false, transaction, changes: [] };
  }

  // Apply actions
  let modifiedTransaction = { ...transaction };
  const changes = [];

  for (const action of rule.actions || []) {
    if (action.type === 'IGNORE_ROW') {
      return { applied: true, transaction: modifiedTransaction, changes: [{ type: 'IGNORE_ROW' }] };
    }
    
    const actionResult = applyAction(action, modifiedTransaction);
    if (actionResult.applied) {
      modifiedTransaction = actionResult.transaction;
      changes.push(actionResult.change);
    }
  }

  return {
    applied: changes.length > 0,
    transaction: modifiedTransaction,
    changes
  };
}

/**
 * Evaluate rule conditions
 * @param {Array} conditions - Array of conditions
 * @param {string} logic - 'ANY' or 'ALL'
 * @param {Object} transaction - Transaction data
 * @param {Object} fieldMappings - Field mappings
 * @returns {boolean} - Whether conditions are met
 */
function evaluateConditions(conditions, logic, transaction, fieldMappings) {
  if (!conditions || conditions.length === 0) {
    return true; // No conditions means always apply
  }

  const results = conditions.map(condition => evaluateCondition(condition, transaction, fieldMappings));
  
  if (logic === 'ALL') {
    return results.every(result => result === true);
  } else { // 'ANY' is default
    return results.some(result => result === true);
  }
}

/**
 * Evaluate a single condition
 * @param {Object} condition - The condition to evaluate
 * @param {Object} transaction - Transaction data
 * @param {Object} fieldMappings - Field mappings
 * @returns {boolean} - Whether the condition is met
 */
function evaluateCondition(condition, transaction, fieldMappings) {
  const fieldValue = getFieldValue(condition.field, transaction);
  const conditionValue = condition.value;
  const operator = condition.operator;
  const caseSensitive = condition.caseSensitive !== false; // Default to true

  // Convert values to strings for comparison, handle case sensitivity
  let fieldStr = String(fieldValue || '');
  let conditionStr = String(conditionValue || '');
  
  if (!caseSensitive) {
    fieldStr = fieldStr.toLowerCase();
    conditionStr = conditionStr.toLowerCase();
  }

  // Debug logging for condition evaluation
  // console.log(`🔍 Evaluating Condition:`, {
  //   field: condition.field,
  //   operator,
  //   fieldValue,
  //   conditionValue,
  //   fieldStr,
  //   conditionStr,
  //   transactionId: transaction.id
  // });

  let result;
  switch (operator) {
    case 'equals':
      result = fieldStr === conditionStr;
      break;
    case 'contains':
      result = fieldStr.includes(conditionStr);
      break;
    case 'startsWith':
      result = fieldStr.startsWith(conditionStr);
      break;
    case 'endsWith':
      result = fieldStr.endsWith(conditionStr);
      break;
    case 'isEmpty':
      result = !fieldValue || String(fieldValue).trim() === '';
      break;
    case 'isNotEmpty':
      result = fieldValue && String(fieldValue).trim() !== '';
      break;
    case 'greaterThan':
      result = parseFloat(fieldValue) > parseFloat(conditionValue);
      break;
    case 'lessThan':
      result = parseFloat(fieldValue) < parseFloat(conditionValue);
      break;
    case 'greaterOrEqual':
      result = parseFloat(fieldValue) >= parseFloat(conditionValue);
      break;
    case 'lessOrEqual':
      result = parseFloat(fieldValue) <= parseFloat(conditionValue);
      break;
    default:
      console.warn(`Unknown operator: ${operator}`);
      result = false;
  }

  // console.log(`📊 Condition Result: ${result}`);
  return result;
}

/**
 * Apply a single action to a transaction
 * @param {Object} action - The action to apply
 * @param {Object} transaction - Transaction data
 * @returns {Object} - Result of applying the action
 */
function applyAction(action, transaction) {
  let modifiedTransaction = { ...transaction };
  
  if (action.type === 'SET_FIELD') {
    const oldValue = getFieldValue(action.field, modifiedTransaction);
    setFieldValue(action.field, action.value, modifiedTransaction);
    
    // Debug logging
    // console.log(`🔧 SET_FIELD Rule Applied:`, {
    //   field: action.field,
    //   oldValue,
    //   newValue: action.value,
    //   transactionId: modifiedTransaction.id,
    //   fieldExists: action.field in modifiedTransaction,
    //   finalValue: modifiedTransaction[action.field]
    // });
    
    return {
      applied: true,
      transaction: modifiedTransaction,
      change: {
        type: 'SET_FIELD',
        field: action.field,
        oldValue,
        newValue: action.value
      }
    };
  }
  
  if (action.type === 'TRANSFORM_FIELD') {
    const oldValue = getFieldValue(action.field, modifiedTransaction);
    const newValue = applyTransform(oldValue, action.transform, action.parameter);
    
    // Set to target field if specified, otherwise use source field
    const targetField = action.targetField || action.field;
    setFieldValue(targetField, newValue, modifiedTransaction);
    
    return {
      applied: true,
      transaction: modifiedTransaction,
      change: {
        type: 'TRANSFORM_FIELD',
        field: action.field,
        targetField,
        transform: action.transform,
        parameter: action.parameter,
        oldValue,
        newValue
      }
    };
  }
  
  return { applied: false, transaction, change: null };
}

/**
 * Get field value from transaction
 * @param {string} fieldName - Field name
 * @param {Object} transaction - Transaction data
 * @returns {*} - Field value
 */
function getFieldValue(fieldName, transaction) {
  return transaction[fieldName];
}

/**
 * Set field value in transaction
 * @param {string} fieldName - Field name
 * @param {*} value - Value to set
 * @param {Object} transaction - Transaction data (modified in place)
 */
function setFieldValue(fieldName, value, transaction) {
  transaction[fieldName] = value;
}

/**
 * Apply transform function to a value
 * @param {*} value - Value to transform
 * @param {string} transform - Transform function name
 * @param {*} parameter - Optional parameter for transform
 * @returns {*} - Transformed value
 */
function applyTransform(value, transform, parameter) {
  if (value == null || value === '') {
    return value; // Don't transform empty values
  }

  switch (transform) {
    case 'absolute':
      return Math.abs(parseFloat(value) || 0);
    case 'negate':
      return -(parseFloat(value) || 0);
    case 'multiply':
      return (parseFloat(value) || 0) * (parseFloat(parameter) || 1);
    case 'uppercase':
      return String(value).toUpperCase();
    case 'lowercase':
      return String(value).toLowerCase();
    case 'trim':
      return String(value).trim();
    default:
      console.warn(`Unknown transform: ${transform}`);
      return value;
  }
}

export default { applyProcessingRules };
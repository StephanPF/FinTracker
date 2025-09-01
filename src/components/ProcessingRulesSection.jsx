import React, { useState, useEffect } from 'react';
import { useAccounting } from '../contexts/AccountingContext';
import RuleItem from './RuleItem';
import './ProcessingRulesSection.css';

const ProcessingRulesSection = ({ 
  bankConfigId, 
  fieldMappings = {}, 
  onCreateRule, 
  onEditRule
}) => {
  const { 
    getProcessingRules, 
    loadProcessingRules, 
    deleteProcessingRule, 
    toggleProcessingRuleActive,
    updateProcessingRuleOrder 
  } = useAccounting();
  
  const [loading, setLoading] = useState(false);
  
  // Get rules directly from context instead of local state
  const rules = bankConfigId ? getProcessingRules(bankConfigId) : [];

  useEffect(() => {
    if (bankConfigId) {
      loadRules();
    }
  }, [bankConfigId]);

  const loadRules = async () => {
    if (!bankConfigId) return;
    
    setLoading(true);
    try {
      await loadProcessingRules(bankConfigId);
    } catch (error) {
      console.error('Error loading rules:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDeleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) {
      return;
    }
    
    try {
      await deleteProcessingRule(ruleId, bankConfigId);
      // No need to call loadRules - context already updates state
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const handleToggleActive = async (ruleId, active) => {
    try {
      await toggleProcessingRuleActive(ruleId, active, bankConfigId);
      // No need to call loadRules - context already updates state
    } catch (error) {
      console.error('Error toggling rule:', error);
    }
  };

  const handleEditRule = (rule) => {
    onEditRule && onEditRule(rule);
  };

  const availableFields = Object.keys(fieldMappings).filter(key => fieldMappings[key]);

  return (
    <div className="processing-rules-section">
      <div className="rules-header">
        <div className="rules-title">
          <h4>Step 5: Processing Rules (Optional)</h4>
          <p>Create rules to automatically process transactions during import</p>
        </div>
        <button 
          type="button"
          className="btn btn-primary btn-small"
          onClick={() => onCreateRule && onCreateRule()}
          disabled={!bankConfigId}
          title={!bankConfigId ? "Save the bank configuration first to add rules" : "Add a new processing rule"}
        >
          + Add New Rule
        </button>
      </div>

      {loading && (
        <div className="rules-loading">
          <div className="loading-spinner"></div>
          <span>Loading rules...</span>
        </div>
      )}

      {!loading && rules.length === 0 && (
        <div className="rules-empty">
          <div className="empty-icon">📝</div>
          <h5>No processing rules yet</h5>
          {bankConfigId ? (
            <>
              <p>Add rules to automatically categorize transactions, transform field values, or filter rows during import.</p>
              <button 
                type="button"
                className="btn btn-secondary"
                onClick={() => onCreateRule && onCreateRule()}
              >
                Create Your First Rule
              </button>
            </>
          ) : (
            <p>Save the bank configuration first to add processing rules.</p>
          )}
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className="rules-list">
          <div className="rules-summary">
            <div className="summary-stat">
              <span className="stat-label">Total Rules:</span>
              <span className="stat-value">{rules.length}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Active:</span>
              <span className="stat-value active">{rules.filter(r => r.active).length}</span>
            </div>
            <div className="summary-stat">
              <span className="stat-label">Inactive:</span>
              <span className="stat-value inactive">{rules.filter(r => !r.active).length}</span>
            </div>
          </div>
          
          {rules.map((rule, index) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              index={index}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggleActive={handleToggleActive}
              availableFields={availableFields}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default ProcessingRulesSection;
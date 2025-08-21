import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAccounting } from '../contexts/AccountingContext';

const TodoPage = () => {
  const { t } = useLanguage();
  const { todos, addTodo: addTodoToDb, updateTodo: updateTodoInDb, deleteTodo: deleteTodoFromDb } = useAccounting();
  const [newTodo, setNewTodo] = useState('');
  const [filter, setFilter] = useState('all'); // all, pending, completed
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('medium');
  const [estimatedHours, setEstimatedHours] = useState(1);

  // No localStorage logic needed - todos come from database via AccountingContext

  const addTodo = async () => {
    if (newTodo.trim()) {
      try {
        const todoData = {
          title: newTodo,
          description: '',
          category: category || 'General',
          status: 'pending',
          priority: priority,
          estimatedHours: estimatedHours
        };
        await addTodoToDb(todoData);
        setNewTodo('');
        setCategory('');
        setPriority('medium');
        setEstimatedHours(1);
      } catch (error) {
        console.error('Error adding todo:', error);
      }
    }
  };

  const updateTodo = async (id, updates) => {
    try {
      await updateTodoInDb(id, updates);
    } catch (error) {
      console.error('Error updating todo:', error);
    }
  };

  const deleteTodo = async (id) => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      try {
        await deleteTodoFromDb(id);
      } catch (error) {
        console.error('Error deleting todo:', error);
      }
    }
  };

  const toggleStatus = async (id) => {
    const todo = todos.find(t => t.id === id);
    const newStatus = todo.status === 'pending' ? 'completed' : 'pending';
    await updateTodo(id, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : null
    });
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'pending') return todo.status === 'pending';
    if (filter === 'completed') return todo.status === 'completed';
    return true;
  });

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e53e3e';
      case 'medium': return '#f56500';
      case 'low': return '#38a169';
      default: return '#718096';
    }
  };

  const stats = {
    total: todos.length,
    pending: todos.filter(t => t.status === 'pending').length,
    completed: todos.filter(t => t.status === 'completed').length,
    totalHours: todos.reduce((sum, todo) => sum + (todo.estimatedHours || 0), 0)
  };

  return (
    <div className="todo-page">
      <div className="todo-header">
        <h1>🎯 Development TODO List</h1>
        <p>Track feature ideas and implementation tasks for Personal Finance Tracker</p>
      </div>

      <div className="todo-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">Total Ideas</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.totalHours}h</span>
          <span className="stat-label">Est. Hours</span>
        </div>
      </div>

      <div className="todo-controls">
        <div className="add-todo">
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="Add a new feature idea or task..."
            className="todo-input"
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
          />
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="Category (optional)"
            className="category-input"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="priority-input"
          >
            <option value="low">🟢 Low Priority</option>
            <option value="medium">🟡 Medium Priority</option>
            <option value="high">🔴 High Priority</option>
          </select>
          <input
            type="number"
            value={estimatedHours}
            onChange={(e) => setEstimatedHours(parseInt(e.target.value) || 1)}
            placeholder="Hours"
            className="hours-input"
            min="1"
            max="100"
          />
          <button onClick={addTodo} className="add-btn">
            ➕ Add
          </button>
        </div>

        <div className="filter-controls">
          <button 
            className={filter === 'all' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('all')}
          >
            All ({stats.total})
          </button>
          <button 
            className={filter === 'pending' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('pending')}
          >
            Pending ({stats.pending})
          </button>
          <button 
            className={filter === 'completed' ? 'filter-btn active' : 'filter-btn'}
            onClick={() => setFilter('completed')}
          >
            Done ({stats.completed})
          </button>
        </div>
      </div>

      <div className="todos-list">
        {filteredTodos.length === 0 ? (
          <div className="empty-todos">
            <p>No todos found. Add some feature ideas!</p>
          </div>
        ) : (
          filteredTodos.map(todo => (
            <div key={todo.id} className={`todo-item ${todo.status}`}>
              <div className="todo-main">
                <div className="todo-checkbox">
                  <button 
                    className={`checkbox-btn ${todo.status === 'completed' ? 'checked' : ''}`}
                    onClick={() => toggleStatus(todo.id)}
                  >
                    {todo.status === 'completed' ? '✅' : '⭕'}
                  </button>
                </div>
                
                <div className="todo-content">
                  <div className="todo-title">{todo.title}</div>
                  {todo.description && (
                    <div className="todo-description">{todo.description}</div>
                  )}
                  <div className="todo-meta">
                    <span className="todo-category">🏷️ {todo.category}</span>
                    <span 
                      className="todo-priority"
                      style={{ color: getPriorityColor(todo.priority) }}
                    >
                      ⚡ {todo.priority}
                    </span>
                    <span className="todo-hours">⏱️ {todo.estimatedHours}h</span>
                    <span className="todo-date">
                      📅 {(() => {
                        const date = new Date(todo.createdAt);
                        const day = date.getDate().toString().padStart(2, '0');
                        const month = (date.getMonth() + 1).toString().padStart(2, '0');
                        const year = date.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </span>
                  </div>
                </div>

                <div className="todo-actions">
                  <button 
                    className="action-btn delete"
                    onClick={() => deleteTodo(todo.id)}
                    title="Delete todo"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoPage;
import React from 'react';

const LogFilters = ({ filters, setFilters, logs }) => {
  const handleLevelChange = (e) => {
    setFilters(prev => ({ ...prev, level: e.target.value }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value }));
  };

  const handleTimeRangeChange = (e) => {
    setFilters(prev => ({ ...prev, timeRange: e.target.value }));
  };

  const handleSourceChange = (e) => {
    setFilters(prev => ({ ...prev, source: e.target.value }));
  };

  // Get unique sources from logs
  const uniqueSources = [...new Set(logs.map(log => log.source))].sort();

  return (
    <div className="log-filters">
      <div className="log-filter-group">
        <label htmlFor="log-level-filter">Level:</label>
        <select
          id="log-level-filter"
          value={filters.level}
          onChange={handleLevelChange}
          className="log-filter-select"
        >
          <option value="ALL">All Levels</option>
          <option value="DEBUG">Debug</option>
          <option value="INFO">Info</option>
          <option value="WARN">Warning</option>
          <option value="ERROR">Error</option>
        </select>
      </div>

      <div className="log-filter-group">
        <label htmlFor="log-search-filter">Search:</label>
        <input
          id="log-search-filter"
          type="text"
          value={filters.search}
          onChange={handleSearchChange}
          placeholder="Search messages..."
          className="log-filter-input"
        />
      </div>

      <div className="log-filter-group">
        <label htmlFor="log-time-filter">Time:</label>
        <select
          id="log-time-filter"
          value={filters.timeRange}
          onChange={handleTimeRangeChange}
          className="log-filter-select"
        >
          <option value="ALL">All Time</option>
          <option value="1h">Last Hour</option>
          <option value="6h">Last 6 Hours</option>
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
        </select>
      </div>

      <div className="log-filter-group">
        <label htmlFor="log-source-filter">Source:</label>
        <select
          id="log-source-filter"
          value={filters.source || 'ALL'}
          onChange={handleSourceChange}
          className="log-filter-select"
        >
          <option value="ALL">All Sources</option>
          {uniqueSources.map(source => (
            <option key={source} value={source}>{source}</option>
          ))}
        </select>
      </div>

      <div className="log-filter-actions">
        <button
          onClick={() => setFilters({
            level: 'ALL',
            search: '',
            timeRange: 'ALL',
            source: 'ALL'
          })}
          className="log-filter-reset"
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default LogFilters;
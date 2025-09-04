// Application-managed test reference system
// Tests are application metadata, not user data
class TestReferenceManager {
  constructor() {
    this.storageKey = 'application_test_references';
    this.testReferences = this.loadFromStorage();
  }

  // Load test references from localStorage
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Error loading test references from storage:', error);
      return [];
    }
  }

  // Save test references to localStorage
  saveToStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.testReferences));
    } catch (error) {
      console.warn('Error saving test references to storage:', error);
    }
  }

  // Generate unique ID for tests
  generateId(prefix = 'TR') {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `${prefix}_${timestamp}_${random}`;
  }

  // Add or update test reference
  addOrUpdateTestReference(testData) {
    // Check if test reference already exists by testId
    const existingIndex = this.testReferences.findIndex(tr => tr.testId === testData.testId);
    
    if (existingIndex !== -1) {
      // Update existing test reference
      const updatedTestRef = {
        ...this.testReferences[existingIndex],
        ...testData,
        updatedAt: new Date().toISOString()
      };
      this.testReferences[existingIndex] = updatedTestRef;
      this.saveToStorage();
      return updatedTestRef;
    } else {
      // Create new test reference with sequential testRef number
      const maxRef = Math.max(0, ...this.testReferences.map(tr => {
        const refNum = parseInt(tr.testRef.replace('T', ''));
        return isNaN(refNum) ? 0 : refNum;
      }));
      
      const newTestRef = {
        id: this.generateId('TR'),
        testRef: `T${(maxRef + 1).toString().padStart(3, '0')}`,
        testId: testData.testId,
        suite: testData.suite || '',
        name: testData.name || '',
        description: testData.description || '',
        expectedBehavior: testData.expectedBehavior || '',
        status: testData.status || 'pending',
        duration: testData.duration || null,
        lastRun: testData.lastRun || null,
        error: testData.error || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      this.testReferences.push(newTestRef);
      this.saveToStorage();
      return newTestRef;
    }
  }

  // Get test reference by testId
  getTestReference(testId) {
    return this.testReferences.find(tr => tr.testId === testId) || null;
  }

  // Get test reference by reference number (e.g., "T459")
  getTestReferenceByRef(testRef) {
    return this.testReferences.find(tr => tr.testRef === testRef) || null;
  }

  // Get all test references
  getAllTestReferences() {
    return this.testReferences;
  }

  // Update test status after running
  updateTestReferenceStatus(testId, status, duration = null, error = null) {
    const testRefIndex = this.testReferences.findIndex(tr => tr.testId === testId);
    if (testRefIndex === -1) return null;

    this.testReferences[testRefIndex] = {
      ...this.testReferences[testRefIndex],
      status,
      duration,
      lastRun: new Date().toISOString(),
      error,
      updatedAt: new Date().toISOString()
    };

    this.saveToStorage();
    return this.testReferences[testRefIndex];
  }

  // Clear all test references (for testing/reset)
  clearAllTestReferences() {
    this.testReferences = [];
    this.saveToStorage();
  }

  // Get test info by reference (for debugging)
  getTestInfo(testRef) {
    const test = this.getTestReferenceByRef(testRef);
    if (!test) {
      return `Test ${testRef} not found`;
    }
    
    return `${testRef}: ${test.suite} - ${test.name}
Status: ${test.status}
Description: ${test.description}
Expected: ${test.expectedBehavior}
Last Run: ${test.lastRun ? new Date(test.lastRun).toLocaleString() : 'Never'}
${test.error ? `Error: ${test.error}` : ''}`;
  }
}

// Export singleton instance
const testReferenceManager = new TestReferenceManager();

// Make test reference lookup globally available for debugging
if (typeof window !== 'undefined') {
  window.getTestInfo = (testRef) => {
    const info = testReferenceManager.getTestInfo(testRef);
    console.log(info);
    return info;
  };
  
  window.listAllTests = () => {
    const tests = testReferenceManager.getAllTestReferences();
    console.table(tests.map(t => ({
      Ref: t.testRef,
      Suite: t.suite,
      Name: t.name,
      Status: t.status,
      'Last Run': t.lastRun ? new Date(t.lastRun).toLocaleString() : 'Never'
    })));
    return tests;
  };
}

export default testReferenceManager;
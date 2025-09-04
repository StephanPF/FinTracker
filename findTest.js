// Helper script to find specific test by reference
// This can be run in the browser console to identify T078

// Function to get test info
function findTestByRef(testRef) {
  try {
    const stored = localStorage.getItem('application_test_references');
    if (!stored) {
      console.log('No test references found in localStorage');
      return null;
    }
    
    const testReferences = JSON.parse(stored);
    const test = testReferences.find(t => t.testRef === testRef);
    
    if (!test) {
      console.log(`Test ${testRef} not found`);
      return null;
    }
    
    console.log(`Found ${testRef}:`);
    console.log(`Suite: ${test.suite}`);
    console.log(`Name: ${test.name}`);
    console.log(`Test ID: ${test.testId}`);
    console.log(`Description: ${test.description}`);
    console.log(`Expected: ${test.expectedBehavior}`);
    console.log(`Status: ${test.status}`);
    console.log(`Last Run: ${test.lastRun ? new Date(test.lastRun).toLocaleString() : 'Never'}`);
    if (test.error) {
      console.log(`Error: ${test.error}`);
    }
    
    return test;
  } catch (error) {
    console.error('Error reading test references:', error);
    return null;
  }
}

// Function to list all tests around T078
function listTestsAround(targetRef, range = 5) {
  try {
    const stored = localStorage.getItem('application_test_references');
    if (!stored) return null;
    
    const testReferences = JSON.parse(stored);
    const targetNum = parseInt(targetRef.replace('T', ''));
    
    console.log(`Tests around ${targetRef}:`);
    for (let i = targetNum - range; i <= targetNum + range; i++) {
      const ref = `T${i.toString().padStart(3, '0')}`;
      const test = testReferences.find(t => t.testRef === ref);
      if (test) {
        const status = test.status === 'failed' ? '❌' : test.status === 'passed' ? '✅' : '⚪';
        console.log(`${status} ${ref}: ${test.suite} - ${test.name}`);
      }
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.findTestByRef = findTestByRef;
  window.listTestsAround = listTestsAround;
  
  // Auto-run for T078
  console.log('Looking for T078...');
  findTestByRef('T078');
  console.log('\nTests around T078:');
  listTestsAround('T078');
}
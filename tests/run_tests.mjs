import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Run all e2e tests and report results
 */
async function runTests() {
  console.log("Running all e2e tests for CDP Relay redirect handling");
  
  // Find all test files
  const testFiles = fs.readdirSync(__dirname)
    .filter(file => file.startsWith('test_') && file.endsWith('.mjs'));
  
  console.log(`Found ${testFiles.length} test files:`, testFiles);
  
  const results = {
    total: testFiles.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    details: []
  };
  
  // Run each test file
  for (const testFile of testFiles) {
    console.log(`\n========== Running test: ${testFile} ==========`);
    
    const testPath = join(__dirname, testFile);
    const startTime = Date.now();
    
    try {
      const testProcess = spawn('node', [testPath], {
        stdio: 'inherit'
      });
      
      const exitCode = await new Promise(resolve => {
        testProcess.on('close', resolve);
      });
      
      const duration = Date.now() - startTime;
      
      if (exitCode === 0) {
        console.log(`✅ Test ${testFile} passed (${duration}ms)`);
        results.passed++;
        results.details.push({
          file: testFile,
          status: 'passed',
          duration
        });
      } else {
        console.error(`❌ Test ${testFile} failed with exit code ${exitCode} (${duration}ms)`);
        results.failed++;
        results.details.push({
          file: testFile,
          status: 'failed',
          exitCode,
          duration
        });
      }
    } catch (error) {
      console.error(`❌ Error running test ${testFile}:`, error);
      results.failed++;
      results.details.push({
        file: testFile,
        status: 'error',
        error: error.message
      });
    }
  }
  
  // Print summary
  console.log("\n========== Test Summary ==========");
  console.log(`Total: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Skipped: ${results.skipped}`);
  
  // Print details
  console.log("\n========== Test Details ==========");
  for (const detail of results.details) {
    const status = detail.status === 'passed' ? '✅' : '❌';
    console.log(`${status} ${detail.file} - ${detail.status} ${detail.duration ? `(${detail.duration}ms)` : ''}`);
  }
  
  // Exit with appropriate code
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests();
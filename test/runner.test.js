import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runTestFile, formatResults, getSummary } from '../src/runner.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/cliscore-test-runner';

describe('Runner', () => {
  describe('runTestFile', () => {
    it('should run passing test', async () => {
      const content = `\`\`\`cliscore
$ echo "hello"
hello
\`\`\`
`;
      const testFile = join(TEST_DIR, 'passing.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);
      assert.equal(result.failures.length, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should detect failing test', async () => {
      const content = `\`\`\`cliscore
$ echo "hello"
goodbye
\`\`\`
`;
      const testFile = join(TEST_DIR, 'failing.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 0);
      assert.equal(result.failed, 1);
      assert.equal(result.failures.length, 1);
      assert.equal(result.failures[0].command, 'echo "hello"');
      assert.ok(result.failures[0].error);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should run multiple tests', async () => {
      const content = `\`\`\`cliscore
$ echo "test1"
test1
$ echo "test2"
test2
$ echo "test3"
wrong
\`\`\`
`;
      const testFile = join(TEST_DIR, 'multiple.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 2);
      assert.equal(result.failed, 1);
      assert.equal(result.failures.length, 1);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should handle regex patterns', async () => {
      const content = `\`\`\`cliscore
$ echo "test123"
test\\d+ (re)
\`\`\`
`;
      const testFile = join(TEST_DIR, 'regex.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should handle glob patterns', async () => {
      const content = `\`\`\`cliscore
$ echo "file123.txt"
file*.txt (glob)
\`\`\`
`;
      const testFile = join(TEST_DIR, 'glob.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should handle ellipsis', async () => {
      const content = `\`\`\`cliscore
$ printf "first\\nmiddle\\nlast"
first
...
last
\`\`\`
`;
      const testFile = join(TEST_DIR, 'ellipsis.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should include actual output in failures', async () => {
      const content = `\`\`\`cliscore
$ echo "actual"
expected
\`\`\`
`;
      const testFile = join(TEST_DIR, 'with-output.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.failed, 1);
      assert.equal(result.failures[0].actualOutput.length, 1);
      assert.equal(result.failures[0].actualOutput[0], 'actual');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should handle UTF format .t files', async () => {
      const content = `  $ echo "test"
  test
`;
      const testFile = join(TEST_DIR, 'utf.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('formatResults', () => {
    it('should format successful results', () => {
      const results = [{
        file: 'test.md',
        passed: 3,
        failed: 0,
        failures: []
      }];

      const output = formatResults(results);

      assert.match(output, /all tests passed/i);
      assert.match(output, /3/);
    });

    it('should format failed results', () => {
      const results = [{
        file: 'test.md',
        passed: 1,
        failed: 1,
        failures: [{
          command: 'echo "test"',
          lineNumber: 5,
          error: 'Output mismatch',
          actualOutput: ['wrong']
        }],
        passes: []
      }];

      const output = formatResults(results, 2); // Use verbose mode

      assert.match(output, /test\.md/);
      assert.match(output, /Line 5/);
      assert.match(output, /echo "test"/);
      assert.match(output, /Output mismatch/);
      assert.match(output, /wrong/);
    });

    it('should show pass rate', () => {
      const results = [{
        file: 'test.md',
        passed: 7,
        failed: 3,
        failures: []
      }];

      const output = formatResults(results);

      assert.match(output, /70\.0%/);
    });
  });

  describe('getSummary', () => {
    it('should calculate summary statistics', () => {
      const results = [
        { file: 'test1.md', passed: 5, failed: 1, failures: [] },
        { file: 'test2.md', passed: 3, failed: 0, failures: [] },
        { file: 'test3.md', passed: 2, failed: 2, failures: [] }
      ];

      const summary = getSummary(results);

      assert.equal(summary.totalFiles, 3);
      assert.equal(summary.filesWithFailures, 2);
      assert.equal(summary.totalPassed, 10);
      assert.equal(summary.totalFailed, 3);
      assert.equal(summary.totalTests, 13);
      assert.ok(Math.abs(summary.passRate - 76.92) < 0.1);
    });

    it('should handle all passing', () => {
      const results = [
        { file: 'test1.md', passed: 5, failed: 0, failures: [] },
        { file: 'test2.md', passed: 3, failed: 0, failures: [] }
      ];

      const summary = getSummary(results);

      assert.equal(summary.filesWithFailures, 0);
      assert.equal(summary.passRate, 100);
    });

    it('should handle empty results', () => {
      const results = [];

      const summary = getSummary(results);

      assert.equal(summary.totalFiles, 0);
      assert.equal(summary.totalTests, 0);
      assert.equal(summary.passRate, 0);
    });
  });
});

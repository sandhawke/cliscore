import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTestFile } from '../src/parser.js';
import { runTestFile } from '../src/runner.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/cliscore-test-empty-lines';

describe('Empty line handling', () => {
  describe('Parsing', () => {
    it('should preserve empty lines in output', async () => {
      const content = `\`\`\`cliscore
$ printf "line1\\n\\nline3"
line1

line3
\`\`\`
`;
      const testFile = join(TEST_DIR, 'empty-in-output.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].expectedOutput.length, 3);
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'line1');
      assert.equal(result.tests[0].expectedOutput[1].pattern, '');
      assert.equal(result.tests[0].expectedOutput[2].pattern, 'line3');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should not treat empty lines as test separators', async () => {
      const content = `\`\`\`cliscore
$ echo "first"
first

$ echo "second"
second
\`\`\`
`;
      const testFile = join(TEST_DIR, 'empty-between.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 2);
      assert.equal(result.tests[0].command, 'echo "first"');
      assert.equal(result.tests[1].command, 'echo "second"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should preserve trailing empty lines', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test


\`\`\`
`;
      const testFile = join(TEST_DIR, 'trailing-empty.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].expectedOutput.length, 3);
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'test');
      assert.equal(result.tests[0].expectedOutput[1].pattern, '');
      assert.equal(result.tests[0].expectedOutput[2].pattern, '');

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('Execution', () => {
    it('should match empty lines in output', async () => {
      const content = `\`\`\`cliscore
$ printf "line1\\n\\nline3"
line1

line3
\`\`\`
`;
      const testFile = join(TEST_DIR, 'exec-empty.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 1);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should fail if empty line is missing', async () => {
      const content = `\`\`\`cliscore
$ printf "line1\\nline2\\nline3"
line1

line3
\`\`\`
`;
      const testFile = join(TEST_DIR, 'exec-missing-empty.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 0);
      assert.equal(result.failed, 1);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should match commands without separation', async () => {
      const content = `\`\`\`cliscore
$ echo "first"
first
$ echo "second"
second
\`\`\`
`;
      const testFile = join(TEST_DIR, 'exec-no-separation.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      assert.equal(result.passed, 2);
      assert.equal(result.failed, 0);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should treat visual spacing as part of expected output', async () => {
      const content = `\`\`\`cliscore
$ echo "first"
first

$ echo "second"
second
\`\`\`
`;
      const testFile = join(TEST_DIR, 'exec-with-spacing.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runTestFile(testFile);

      // This will fail because echo "first" only outputs "first" without trailing blank line
      assert.equal(result.passed, 1);
      assert.equal(result.failed, 1);
      assert.match(result.failures[0].error, /expected more output/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });
});

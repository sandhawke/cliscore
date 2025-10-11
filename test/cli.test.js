import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'child_process';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CLI_PATH = join(__dirname, '../src/cli.js');
const TEST_DIR = '/tmp/cliscore-test-cli';

/**
 * Run the CLI and capture output
 * @param {string[]} args - CLI arguments
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
function runCLI(args) {
  return new Promise((resolve) => {
    const child = spawn('node', [CLI_PATH, ...args]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (exitCode) => {
      resolve({ stdout, stderr, exitCode });
    });
  });
}

describe('CLI', () => {
  describe('--help', () => {
    it('should display help message', async () => {
      const result = await runCLI(['--help']);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /usage/i);
      assert.match(result.stdout, /options/i);
    });
  });

  describe('basic execution', () => {
    it('should run passing test file', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test
\`\`\`
`;
      const testFile = join(TEST_DIR, 'passing.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI([testFile]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /all tests passed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should exit with error on failing test', async () => {
      const content = `\`\`\`cliscore
$ echo "actual"
expected
\`\`\`
`;
      const testFile = join(TEST_DIR, 'failing.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI([testFile]);

      assert.equal(result.exitCode, 1);
      assert.match(result.stdout, /failed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should handle multiple test files', async () => {
      const content1 = `\`\`\`cliscore
$ echo "test1"
test1
\`\`\`
`;
      const content2 = `\`\`\`cliscore
$ echo "test2"
test2
\`\`\`
`;
      const testFile1 = join(TEST_DIR, 'test1.md');
      const testFile2 = join(TEST_DIR, 'test2.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile1, content1);
      await writeFile(testFile2, content2);

      const result = await runCLI([testFile1, testFile2]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /all tests passed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('--dry-run', () => {
    it('should parse without executing', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test
\`\`\`
`;
      const testFile = join(TEST_DIR, 'dry-run.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI(['--dry-run', testFile]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /parsed/i);
      assert.match(result.stdout, /test/);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('--json', () => {
    it('should output JSON format', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test
\`\`\`
`;
      const testFile = join(TEST_DIR, 'json.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI(['--json', testFile]);

      assert.equal(result.exitCode, 0);

      const json = JSON.parse(result.stdout);
      assert.ok(json.summary);
      assert.ok(json.results);
      assert.equal(json.summary.totalPassed, 1);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should output JSON with --dry-run', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test
\`\`\`
`;
      const testFile = join(TEST_DIR, 'json-dry.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI(['--json', '--dry-run', testFile]);

      assert.equal(result.exitCode, 0);

      const json = JSON.parse(result.stdout);
      assert.ok(Array.isArray(json));
      assert.equal(json.length, 1);
      assert.ok(json[0].tests);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('--allow-lang', () => {
    it('should accept custom language identifiers', async () => {
      const content = `\`\`\`shell-session
$ echo "custom"
custom
\`\`\`
`;
      const testFile = join(TEST_DIR, 'custom-lang.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI(['--allow-lang', 'shell-session', testFile]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /all tests passed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('error handling', () => {
    it('should error on no files', async () => {
      const result = await runCLI([]);

      assert.equal(result.exitCode, 1);
      assert.match(result.stderr, /no test files/i);
    });

    it('should error on non-existent file', async () => {
      const result = await runCLI(['/nonexistent/file.md']);

      assert.equal(result.exitCode, 1);
    });

    it('should handle parse errors gracefully', async () => {
      const content = 'invalid content';
      const testFile = join(TEST_DIR, 'invalid.xyz');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI([testFile]);

      assert.equal(result.exitCode, 1);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('glob patterns', () => {
    it('should handle simple glob patterns', async () => {
      const content = `\`\`\`cliscore
$ echo "test"
test
\`\`\`
`;
      const testDir = join(TEST_DIR, 'glob-tests');
      await mkdir(testDir, { recursive: true });
      await writeFile(join(testDir, 'test1.md'), content);
      await writeFile(join(testDir, 'test2.md'), content);

      const result = await runCLI([`${testDir}/*.md`]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /all tests passed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('UTF format', () => {
    it('should handle .t files', async () => {
      const content = `  $ echo "utf test"
  utf test
`;
      const testFile = join(TEST_DIR, 'utf.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await runCLI([testFile]);

      assert.equal(result.exitCode, 0);
      assert.match(result.stdout, /all tests passed/i);

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });
});

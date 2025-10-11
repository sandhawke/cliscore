import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseTestFile } from '../src/parser.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/cliscore-test-parser';

describe('Parser', () => {
  describe('UTF format (.t files)', () => {
    it('should parse basic command and output', async () => {
      const content = `  $ echo "hello"
  hello
`;
      const testFile = join(TEST_DIR, 'basic.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].command, 'echo "hello"');
      assert.equal(result.tests[0].expectedOutput.length, 1);
      assert.equal(result.tests[0].expectedOutput[0].type, 'literal');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'hello');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse multiple commands', async () => {
      const content = `  $ echo "first"
  first

  $ echo "second"
  second
`;
      const testFile = join(TEST_DIR, 'multiple.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 2);
      assert.equal(result.tests[0].command, 'echo "first"');
      assert.equal(result.tests[1].command, 'echo "second"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse continuation lines', async () => {
      const content = `  $ echo "line1" \\
  > "line2"
  line1 line2
`;
      const testFile = join(TEST_DIR, 'continuation.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].command, 'echo "line1" \\\n"line2"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse regex patterns with (re)', async () => {
      const content = `  $ echo "test123"
  test\\d+ (re)
`;
      const testFile = join(TEST_DIR, 'regex.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'regex');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'test\\d+');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse glob patterns with (glob)', async () => {
      const content = `  $ ls
  file*.txt (glob)
`;
      const testFile = join(TEST_DIR, 'glob.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'glob');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'file*.txt');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse no-eol patterns', async () => {
      const content = `  $ echo -n "no newline"
  no newline (no-eol)
`;
      const testFile = join(TEST_DIR, 'no-eol.t');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'no-eol');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'no newline');

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('Markdown format (.md files)', () => {
    it('should parse cliscore code blocks', async () => {
      const content = `# Test Suite

\`\`\`cliscore
$ echo "hello"
hello
\`\`\`
`;
      const testFile = join(TEST_DIR, 'basic.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].command, 'echo "hello"');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'hello');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse user prompts', async () => {
      const content = `\`\`\`cliscore
alice$ echo "user"
user

alice@server$ echo "host"
host
\`\`\`
`;
      const testFile = join(TEST_DIR, 'prompts.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 2);
      assert.equal(result.tests[0].command, 'echo "user"');
      assert.equal(result.tests[1].command, 'echo "host"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should skip non-cliscore code blocks by default', async () => {
      const content = `\`\`\`javascript
console.log("skip");
\`\`\`

\`\`\`cliscore
$ echo "include"
include
\`\`\`
`;
      const testFile = join(TEST_DIR, 'mixed.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].command, 'echo "include"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should allow custom language identifiers', async () => {
      const content = `\`\`\`shell-session
$ echo "custom"
custom
\`\`\`
`;
      const testFile = join(TEST_DIR, 'custom-lang.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile, ['cliscore', 'shell-session']);

      assert.equal(result.tests.length, 1);
      assert.equal(result.tests[0].command, 'echo "custom"');

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('Enhanced syntax', () => {
    it('should parse ellipsis', async () => {
      const content = `\`\`\`cliscore
$ echo "first"
first
...
\`\`\`
`;
      const testFile = join(TEST_DIR, 'ellipsis.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput.length, 2);
      assert.equal(result.tests[0].expectedOutput[0].type, 'literal');
      assert.equal(result.tests[0].expectedOutput[1].type, 'ellipsis');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse bracketed literal text', async () => {
      const content = `\`\`\`cliscore
$ echo "[test]"
[Literal text: "[test]"]
\`\`\`
`;
      const testFile = join(TEST_DIR, 'bracketed-literal.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'literal');
      assert.equal(result.tests[0].expectedOutput[0].pattern, '[test]');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse bracketed regex', async () => {
      const content = `\`\`\`cliscore
$ echo "test123"
[Matching: /test\\d+/i]
\`\`\`
`;
      const testFile = join(TEST_DIR, 'bracketed-regex.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'regex');
      assert.equal(result.tests[0].expectedOutput[0].pattern, 'test\\d+');
      assert.equal(result.tests[0].expectedOutput[0].flags, 'i');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse bracketed glob', async () => {
      const content = `\`\`\`cliscore
$ ls
[Matching glob: *.txt]
\`\`\`
`;
      const testFile = join(TEST_DIR, 'bracketed-glob.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'glob');
      assert.equal(result.tests[0].expectedOutput[0].pattern, '*.txt');

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should parse bracketed no-eol', async () => {
      const content = `\`\`\`cliscore
$ echo -n "test"
[Output ends without end-of-line]
\`\`\`
`;
      const testFile = join(TEST_DIR, 'bracketed-no-eol.md');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(testFile, content);

      const result = await parseTestFile(testFile);

      assert.equal(result.tests[0].expectedOutput[0].type, 'no-eol');

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });
});

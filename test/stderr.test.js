import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { runTestFile } from '../src/runner.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/cliscore-test-stderr';

describe('Stderr handling', () => {
  it('should match stderr with [stderr:] syntax', async () => {
    const content = `\`\`\`cliscore
$ echo "out" && echo "err" >&2
out
[stderr: err]
\`\`\`
`;
    const testFile = join(TEST_DIR, 'stderr-basic.md');
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(testFile, content);

    const result = await runTestFile(testFile);

    assert.equal(result.passed, 1);
    assert.equal(result.failed, 0);

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should fail if stderr does not match', async () => {
    const content = `\`\`\`cliscore
$ echo "out" && echo "actual error" >&2
out
[stderr: expected error]
\`\`\`
`;
    const testFile = join(TEST_DIR, 'stderr-mismatch.md');
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(testFile, content);

    const result = await runTestFile(testFile);

    assert.equal(result.passed, 0);
    assert.equal(result.failed, 1);

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should match multiple stderr lines', async () => {
    const content = `\`\`\`cliscore
$ printf "out\\n" && printf "err1\\nerr2\\n" >&2
out
[stderr: err1]
[stderr: err2]
\`\`\`
`;
    const testFile = join(TEST_DIR, 'stderr-multiple.md');
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(testFile, content);

    const result = await runTestFile(testFile);

    assert.equal(result.passed, 1);
    assert.equal(result.failed, 0);

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should match mixed stdout and stderr', async () => {
    const content = `\`\`\`cliscore
$ echo "line1" && echo "error1" >&2 && echo "line2" && echo "error2" >&2
line1
line2
[stderr: error1]
[stderr: error2]
\`\`\`
`;
    const testFile = join(TEST_DIR, 'stderr-mixed.md');
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(testFile, content);

    const result = await runTestFile(testFile);

    assert.equal(result.passed, 1);
    assert.equal(result.failed, 0);

    await rm(TEST_DIR, { recursive: true, force: true });
  });

  it('should detect unexpected stderr', async () => {
    const content = `\`\`\`cliscore
$ echo "out" && echo "err" >&2
out
\`\`\`
`;
    const testFile = join(TEST_DIR, 'stderr-unexpected.md');
    await mkdir(TEST_DIR, { recursive: true });
    await writeFile(testFile, content);

    const result = await runTestFile(testFile);

    assert.equal(result.passed, 0);
    assert.equal(result.failed, 1);
    assert.match(result.failures[0].error, /unexpected extra/i);

    await rm(TEST_DIR, { recursive: true, force: true });
  });
});

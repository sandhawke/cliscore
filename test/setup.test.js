import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Executor } from '../src/executor.js';
import { readFile } from 'fs/promises';
import { resolve } from 'path';

describe('Setup/Teardown', () => {
  it('should source cliscore.sh if present', async () => {
    const setupScript = await readFile(
      resolve('test/fixtures/cliscore.sh'),
      'utf-8'
    );

    const executor = new Executor({ setupScript });
    await executor.start();

    // Test that setup was called
    const result = await executor.execute({
      command: 'echo $TEST_VAR',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.stdout[0], 'cliscore_test');

    executor.close();
  });

  it('should make helper functions available', async () => {
    const setupScript = await readFile(
      resolve('test/fixtures/cliscore.sh'),
      'utf-8'
    );

    const executor = new Executor({ setupScript });
    await executor.start();

    const result = await executor.execute({
      command: 'test_helper "arg1"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.stdout[0], 'Helper function called: arg1');

    executor.close();
  });

  it('should work without cliscore.sh', async () => {
    const executor = new Executor({ setupScript: '' });
    await executor.start();

    const result = await executor.execute({
      command: 'echo "no setup"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.stdout[0], 'no setup');

    executor.close();
  });

  it('should not fail if functions are not defined', async () => {
    const setupScript = '# No functions defined';

    const executor = new Executor({ setupScript });
    await executor.start();

    const result = await executor.execute({
      command: 'echo "test"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.stdout[0], 'test');

    executor.close();
  });
});

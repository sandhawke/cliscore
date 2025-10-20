import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Executor } from '../src/executor.js';

describe('Executor', () => {
  it('should start and close shell', async () => {
    const executor = new Executor();
    await executor.start();
    assert.equal(executor.shellReady, true);
    await executor.close();
    assert.equal(executor.shell, null);
  });

  it('should execute simple command', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'echo "hello"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.exitCode, 0);
    assert.equal(result.stdout.length, 1);
    assert.equal(result.stdout[0], 'hello');

    await executor.close();
  });

  it('should capture exit code', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'exit 42',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, false);
    assert.equal(result.exitCode, 42);

    await executor.close();
  });

  it('should capture stderr', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'echo "error" >&2',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.stderr.length, 1);
    assert.equal(result.stderr[0], 'error');

    await executor.close();
  });

  it('should handle multiline output', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'printf "line1\\nline2\\nline3"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.stdout.length, 3);
    assert.equal(result.stdout[0], 'line1');
    assert.equal(result.stdout[1], 'line2');
    assert.equal(result.stdout[2], 'line3');

    await executor.close();
  });

  it('should handle multiline commands', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'echo "first"\necho "second"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.ok(result.stdout.includes('first'));
    assert.ok(result.stdout.includes('second'));

    await executor.close();
  });

  it('should execute multiple commands in sequence', async () => {
    const executor = new Executor();
    await executor.start();

    const commands = [
      { command: 'echo "test1"', expectedOutput: [], lineNumber: 1 },
      { command: 'echo "test2"', expectedOutput: [], lineNumber: 2 },
      { command: 'echo "test3"', expectedOutput: [], lineNumber: 3 }
    ];

    const results = await executor.executeAll(commands);

    assert.equal(results.length, 3);
    assert.equal(results[0].stdout[0], 'test1');
    assert.equal(results[1].stdout[0], 'test2');
    assert.equal(results[2].stdout[0], 'test3');

    await executor.close();
  });

  it('should maintain environment between commands', async () => {
    const executor = new Executor();
    await executor.start();

    const result1 = await executor.execute({
      command: 'export TEST_VAR="value"',
      expectedOutput: [],
      lineNumber: 1
    });

    const result2 = await executor.execute({
      command: 'echo $TEST_VAR',
      expectedOutput: [],
      lineNumber: 2
    });

    assert.equal(result2.stdout[0], 'value');

    await executor.close();
  });

  it('should handle commands with special characters', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'echo "test with \\$special & chars"',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.match(result.stdout[0], /test with.*special.*chars/);

    await executor.close();
  });

  it('should handle empty output', async () => {
    const executor = new Executor();
    await executor.start();

    const result = await executor.execute({
      command: 'true',
      expectedOutput: [],
      lineNumber: 1
    });

    assert.equal(result.success, true);
    assert.equal(result.stdout.length, 0);

    await executor.close();
  });

  it('should generate unique markers', () => {
    const executor = new Executor();
    const marker1 = executor.generateMarker();
    const marker2 = executor.generateMarker();

    assert.notEqual(marker1, marker2);
    assert.equal(typeof marker1, 'string');
    assert.ok(marker1.length > 0);
  });

  it('should throw error if execute called before start', async () => {
    const executor = new Executor();

    await assert.rejects(
      async () => {
        await executor.execute({
          command: 'echo "test"',
          expectedOutput: [],
          lineNumber: 1
        });
      },
      /not started/i
    );
  });
});

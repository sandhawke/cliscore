/**
 * Tests for the command executor
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { executeCommand } from '../src/executor.js'

test('executeCommand - basic echo command', async () => {
  const result = await executeCommand('echo "Hello World"')

  assert.strictEqual(result.stdout.trim(), 'Hello World')
  assert.strictEqual(result.stderr, '')
  assert.strictEqual(result.exitCode, 0)
})

test('executeCommand - command with exit code', async () => {
  const result = await executeCommand('exit 1')

  assert.strictEqual(result.stdout, '')
  assert.strictEqual(result.stderr, '')
  assert.strictEqual(result.exitCode, 1)
})

test('executeCommand - command with stderr', async () => {
  const result = await executeCommand('echo "Error message" >&2')

  assert.strictEqual(result.stdout, '')
  assert.strictEqual(result.stderr.trim(), 'Error message')
  assert.strictEqual(result.exitCode, 0)
})

test('executeCommand - with working directory', async () => {
  const result = await executeCommand('pwd', { cwd: '/tmp' })

  assert.strictEqual(result.stdout.trim(), '/tmp')
  assert.strictEqual(result.stderr, '')
  assert.strictEqual(result.exitCode, 0)
})

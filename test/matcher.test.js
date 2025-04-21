/**
 * Tests for the output matcher
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { matchOutput } from '../src/matcher.js'

test('matchOutput - exact match', () => {
  const options = {
    stdout: 'hello\n',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, true)
})

test('matchOutput - exit code mismatch', () => {
  const options = {
    stdout: 'hello\n',
    stderr: '',
    exitCode: 1,
    expectedOutput: ['hello', '[0]']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, false)
})

test('matchOutput - regex match', () => {
  const options = {
    stdout: 'hello123\n',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello\\d+ (re)']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, true)
})

test('matchOutput - glob match', () => {
  const options = {
    stdout: 'hello123\n',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello* (glob)']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, true)
})

test('matchOutput - no-eol match', () => {
  const options = {
    stdout: 'hello',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello (no-eol)']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, true)
})

test('matchOutput - optional line', () => {
  const options = {
    stdout: 'hello\n',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello', 'optional line (?)']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, true)
})

test('matchOutput - extra lines in actual output', () => {
  const options = {
    stdout: 'hello\nextra\n',
    stderr: '',
    exitCode: 0,
    expectedOutput: ['hello']
  }

  const result = matchOutput(options)
  assert.strictEqual(result.matched, false)
})

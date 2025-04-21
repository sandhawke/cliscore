/**
 * Tests for the TAP formatter
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { formatTAP } from '../src/formatter.js'

test('formatTAP - successful test', () => {
  const results = {
    succeeded: true,
    commands: [
      {
        command: 'echo hello',
        expectedOutput: ['hello'],
        actualOutput: 'hello\n',
        exitCode: 0,
        match: true
      }
    ]
  }

  const output = formatTAP(results)

  assert.ok(output.includes('TAP version 13'))
  assert.ok(output.includes('ok 1 - Command executed successfully'))
  assert.ok(output.includes('# tests 1'))
  assert.ok(output.includes('# pass 1'))
  assert.ok(output.includes('# fail 0'))
})

test('formatTAP - failed test', () => {
  const results = {
    succeeded: false,
    commands: [
      {
        command: 'echo hello',
        expectedOutput: ['hello world'],
        actualOutput: 'hello\n',
        exitCode: 0,
        match: false
      }
    ]
  }

  const output = formatTAP(results)

  assert.ok(output.includes('TAP version 13'))
  assert.ok(output.includes('not ok 1 - Output did not match expected results'))
  assert.ok(output.includes('  command: |'))
  assert.ok(output.includes('    echo hello'))
  assert.ok(output.includes('  expected: |'))
  assert.ok(output.includes('    hello world'))
  assert.ok(output.includes('  actual: |'))
  assert.ok(output.includes('    hello'))
  assert.ok(output.includes('# tests 1'))
  assert.ok(output.includes('# pass 0'))
  assert.ok(output.includes('# fail 1'))
})

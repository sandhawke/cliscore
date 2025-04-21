/**
 * Tests for the test file parser
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { parseTestFile } from '../src/parser.js'

test('parseTestFile - basic command and output', () => {
  const content = `
This is a test file:

  $ echo hello
  hello
`

  const expected = {
    commands: [
      {
        command: 'echo hello',
        expectedOutput: ['hello'],
        lineInfo: {
          file: 'unknown-file',
          commandLine: 4,
          outputStartLine: 5
        }
      }
    ]
  }

  const result = parseTestFile(content)
  assert.deepStrictEqual(result, expected)
})

test('parseTestFile - multiple commands', () => {
  const content = `
Multiple commands:

  $ echo first
  first
  $ echo second
  second
`

  const expected = {
    commands: [
      {
        command: 'echo first',
        expectedOutput: ['first'],
        lineInfo: {
          file: 'unknown-file',
          commandLine: 4,
          outputStartLine: 5
        }
      },
      {
        command: 'echo second',
        expectedOutput: ['second'],
        lineInfo: {
          file: 'unknown-file',
          commandLine: 6,
          outputStartLine: 7
        }
      }
    ]
  }

  const result = parseTestFile(content)
  assert.deepStrictEqual(result, expected)
})

test('parseTestFile - multiline command', () => {
  const content = `
Multiline command:

  $ echo first && \\
  > echo second
  first
  second
`

  const expected = {
    commands: [
      {
        command: 'echo first && \\\necho second',
        expectedOutput: ['first', 'second'],
        lineInfo: {
          file: 'unknown-file',
          commandLine: 4,
          outputStartLine: 6
        }
      }
    ]
  }

  const result = parseTestFile(content)
  assert.deepStrictEqual(result, expected)
})

test('parseTestFile - custom indent', () => {
  const content = `
Custom indent:

    $ echo hello
    hello
`

  const expected = {
    commands: [
      {
        command: 'echo hello',
        expectedOutput: ['hello'],
        lineInfo: {
          file: 'unknown-file',
          commandLine: 4,
          outputStartLine: 5
        }
      }
    ]
  }

  const result = parseTestFile(content, { indent: 4 })
  assert.deepStrictEqual(result, expected)
})

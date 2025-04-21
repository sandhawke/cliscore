/**
 * Integration tests for the full cliscore workflow
 */

import { test } from 'node:test'
import assert from 'node:assert'
import { runTest } from '../index.js'

test('runTest - successful test', async () => {
  const content = `
Simple echo test:

  $ echo "Hello World"
  Hello World
`

  const result = await runTest({ content })

  assert.strictEqual(result.succeeded, true)
  assert.strictEqual(result.commands.length, 1)
  assert.strictEqual(result.commands[0].match, true)
})

test('runTest - failing test', async () => {
  const content = `
This test should fail:

  $ echo "Hello World"
  Wrong output
`

  const result = await runTest({ content })

  assert.strictEqual(result.succeeded, false)
  assert.strictEqual(result.commands.length, 1)
  assert.strictEqual(result.commands[0].match, false)
})

test('runTest - special matchers', async () => {
  const content = `
Test with special matchers:

  $ echo "random123"
  random\\d+ (re)

  $ echo "example-file.txt"
  example-*.txt (glob)

  $ printf "no newline"
  no newline (no-eol)

  $ echo "may or may not show"
  may or may not show (?)
`

  const result = await runTest({ content })
  assert.strictEqual(result.succeeded, true)
})

test('runTest - exit codes', async () => {
  const content = `
Test with exit codes:

  $ exit 2
  [2]
`

  const result = await runTest({ content })
  assert.strictEqual(result.succeeded, true)
})

import { test } from 'node:test'
import assert from 'node:assert'
import * as my from './index.js'
import dbg from 'debug'

const debug = dbg('cliscore/test')

test('first test', async () => {
  assert.strictEqual(2 + 2, 4)
})

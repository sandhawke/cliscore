/* eslint-env jest */
import * as my from './index.js'
import dbg from 'debug'

const debug = dbg('cliscore/test')

test('first test', async () => {
  expect(2 + 2).toBe(4)            
})

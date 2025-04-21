#!/usr/bin/env node

import { cli } from '../src/cli.js'

cli(process.argv.slice(2))
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('Unhandled error:', err)
    process.exit(1)
  })

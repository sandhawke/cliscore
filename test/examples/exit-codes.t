Exit code handling in .t files
=============================

This file demonstrates how to test for specific exit codes in .t files.

Successful command (implicit exit code 0):

  $ echo "Success"
  Success

Failed command with exit code 1:

  $ exit 1
  [1]

Testing grep exit codes (0 when match found, 1 when no match):

  $ echo "hello" | grep "hello"
  hello

  $ echo "hello" | grep "world"
  [1]

Testing command that fails with specific error code:

  $ (exit 2)
  [2]

  $ (exit 127)
  [127]

Testing conditional exit codes:

  $ test 10 -gt 5
  $ test 5 -gt 10
  [1]

Showing both output and exit code:

  $ (echo "Error occurred"; exit 3)
  Error occurred
  [3]

Command that writes to stderr and exits with non-zero code:

  $ (echo "Error message" >&2; exit 4)
  Error message
  [4]

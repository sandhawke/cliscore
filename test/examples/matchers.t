Special matchers in .t files
===========================

This file demonstrates the special matchers available in .t files.

Regular expression matching with (re):

  $ echo "User123"
  User\d+ (re)

  $ echo "ID: abc-456-789"
  ID: [a-z]+-\d+-\d+ (re)

Glob pattern matching with (glob):

  $ echo "test-file.txt"
  test-*.txt (glob)

  $ echo "log_20230101.log"
  log_*.log (glob)

No end-of-line matching with (no-eol):

  $ printf "Text without newline"
  Text without newline (no-eol)

Optional output with (?):

  $ echo "Sometimes this appears"
  Sometimes this appears (?)

  $ date
  Current date might vary (?)

Combining matchers:

  $ echo "Maybe ID12345"
  Maybe ID\d+ (re) (?)

Escaping special characters in glob patterns:

  $ echo "file-with-*-in-name.txt"
  file-with-\*-in-name.txt (glob)

  $ echo "file-with-?-in-name.txt"
  file-with-\?-in-name.txt (glob)

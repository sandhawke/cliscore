Complex examples of .t file features
===================================

This file demonstrates combining multiple .t file features in more complex scenarios.

Setting up a test environment:

  $ mkdir -p test_project/src test_project/docs
  $ touch test_project/src/file1.py test_project/src/file2.py
  $ touch test_project/docs/readme.md

Find command with glob matching:

  $ find test_project -type f | sort
  test_project/docs/readme.md
  test_project/src/file1.py
  test_project/src/file2.py

Creating and testing a simple script:

  $ cat > test_script.sh << 'EOF'
  > #!/bin/sh
  > if [ $# -eq 0 ]; then
  >   echo "No arguments provided" >&2
  >   exit 1
  > fi
  > echo "Arguments: $@"
  > EOF
  $ chmod +x test_script.sh

  $ ./test_script.sh
  No arguments provided
  [1]

  $ ./test_script.sh hello world
  Arguments: hello world

Using a loop with regex matching:

  $ for i in {1..3}; do
  >   echo "Processing item $i"
  > done
  Processing item 1
  Processing item 2
  Processing item 3

  $ for i in {1..5}; do
  >   echo "Random number: $RANDOM"
  > done
  Random number: \d+ (re)
  Random number: \d+ (re)
  Random number: \d+ (re)
  Random number: \d+ (re)
  Random number: \d+ (re)

Testing error conditions with stderr and exit codes:

  $ cat nonexistent_file.txt
  cat: nonexistent_file.txt: No such file or directory (re)
  [1]

Command with conditional output (might vary by environment):

  $ uname
  Linux (?)
  Darwin (?)

Testing date output with regex:

  $ date "+%Y-%m-%d"
  \d{4}-\d{2}-\d{2} (re)

Creating a file with specific content and testing:

  $ cat > config.json << 'EOF'
  > {
  >   "name": "test-app",
  >   "version": "1.0.0",
  >   "debug": true
  > }
  > EOF

  $ grep "version" config.json
  *"version": "1.0.0",* (glob)

Final cleanup with exit code check:

  $ rm -rf test_project test_script.sh config.json
  $ echo "Cleanup completed with status $?"
  Cleanup completed with status 0

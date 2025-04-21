Basic features of .t files
==========================

This file demonstrates the basic structure of .t test files.
Lines beginning with two spaces and a $ are commands to execute.
Lines beginning with two spaces without $ are expected output.
Lines without leading spaces are comments or descriptions.

Simple echo command with exact output matching:

  $ echo "Hello World"
  Hello World

Commands with no output:

  $ touch empty_file.txt
  $ mkdir test_dir

Using printf for specific output:

  $ printf "Line 1\nLine 2\nLine 3\n"
  Line 1
  Line 2
  Line 3

Checking stderr output:

  $ echo "Error message" >&2
  Error message

Checking mixed stdout and stderr (note: ordering may vary by shell):

  $ (echo "Standard output"; echo "Error output" >&2)
  Standard output
  Error output

Multi-line commands and output in .t files
==========================================

This file demonstrates multi-line command syntax using > for continuation.

Basic multi-line command:

  $ echo "First line" && \
  > echo "Second line"
  First line
  Second line

Multi-line shell script:

  $ for i in 1 2 3; do
  >   echo "Number: $i"
  > done
  Number: 1
  Number: 2
  Number: 3

Here document example:

  $ cat << EOF
  > This is line 1
  > This is line 2
  > This is line 3
  > EOF
  This is line 1
  This is line 2
  This is line 3

Multi-line command with variable:

  $ text="Hello
  > World"
  $ echo "$text"
  Hello
  World

Complex multi-line command with conditionals:

  $ if true; then
  >   echo "Condition is true"
  > else
  >   echo "Condition is false"
  > fi
  Condition is true

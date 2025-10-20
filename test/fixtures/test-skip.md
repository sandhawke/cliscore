# Test Skip Functionality

This file tests the [SKIP: reason] functionality.

## Test 1: Skip a test

```console
$ echo "This test should be skipped"
[SKIP: Testing skip functionality]
```

## Test 2: Normal test that should pass

```console
$ echo "hello"
hello
```

## Test 3: Another skipped test

```console
$ ls /nonexistent/path
[SKIP: Platform-specific test]
```

## Test 4: Another passing test

```console
$ echo "world"
world
```

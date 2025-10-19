# Verify cliscore.sh is Loading

This test file explicitly verifies that cliscore.sh is being loaded.

## Test 1: Check TEST_TMPDIR is Set

```console
$ test -n "$TEST_TMPDIR" && echo "TEST_TMPDIR is set: $TEST_TMPDIR" || echo "ERROR: TEST_TMPDIR not set"
[Matching: /^TEST_TMPDIR is set: \/tmp\/cliscore-find-demo/]
```

## Test 2: Verify We're in the Temp Directory

```console
$ pwd
[Matching: /^\/tmp\/cliscore-find-demo/]
```

## Test 3: Helper Function is Available

```console
$ type setup_test_files
[Matching: /setup_test_files is a.*function/]
```

## Test 4: Another Helper Function

```console
$ type create_files_by_ext
[Matching: /create_files_by_ext is a.*function/]
```

## Test 5: Call a Helper Function

```console
$ setup_test_files
$ ls -1 | head -3
dir1
dir2
file1.txt
```

## Test 6: Verify before_each_file Ran

The before_each_file function should have:
1. Created TEST_TMPDIR
2. Exported it
3. Changed to that directory

All confirmed by the tests above! ✓

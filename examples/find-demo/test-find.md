# Find Command Demo

This test suite demonstrates testing the `find` command while showcasing
all cliscore lifecycle functions.

Each test runs in a fresh temporary directory created by `before_each_file()`.

## Verify Fresh Start

Test that we start with an empty directory:

```console
$ # This test proves we're in a clean temp directory
$ ls -A | wc -l
0
$ # TEST_TMPDIR should be set
$ echo $TEST_TMPDIR
[Matching: /^\/tmp\/cliscore-find-demo/]
$ # And we should be inside it
$ pwd
[Matching: /^\/tmp\/cliscore-find-demo/]
```

## Basic Find Tests

Test finding files by name:

```console
$ setup_test_files
$ find . -name "*.txt" -type f | sort
./dir1/file3.txt
./dir1/subdir1/file4.txt
./file1.txt
```

Test finding directories:

```console
$ find . -name "subdir*" -type d | sort
./dir1/subdir1
./dir2/subdir2
```

## Find with Depth Limits

Test maxdepth:

```console
$ find . -maxdepth 1 -name "*.txt" -type f | sort
./file1.txt
```

Test finding at minimum depth 2 (excludes depth 1):

```console
$ find . -mindepth 2 -name "*.txt" -type f | sort
./dir1/file3.txt
./dir1/subdir1/file4.txt
```

## Find by Type

Test finding only files:

```console
$ find . -type f | wc -l
5
```

Test finding only directories (excluding .):

```console
$ find . -type d | grep -v "^\.$" | wc -l
4
```

## Using Helper Functions

Our cliscore.sh provides helper functions:

```console
$ create_files_by_ext "md" 5
$ find . -name "*.md" -type f | wc -l
5
```

## Verify Temp Directory Isolation

Confirm we're working in an isolated temp directory:

```console
$ touch should-be-cleaned-up.txt
$ ls should-be-cleaned-up.txt
should-be-cleaned-up.txt
```

This file will be automatically removed by `after_each_file()`.

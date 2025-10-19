# Intentionally Failing Tests

These tests are designed to fail, for testing error reporting.

```console
$ echo "actual output"
expected output

$ echo "test"
[Matching: /nomatch/]

$ echo "file.txt"
[Matching glob: *.doc]
```

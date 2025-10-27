# Self-Test: Failure Detection

Test that cliscore correctly detects and reports failures.

## Failing Test

```console
$ cliscore --run fixtures/failing.md
...
[Matching: /✗ 1 test/]
```

Exit code should be non-zero:

```console
$ cliscore --run fixtures/failing.md || echo "exit code: $?"
...
exit code: 1
```

## Failure Output

```console
$ cliscore --run fixtures/failing.md 2>&1 | grep -c "failed"
[Matching: /[1-9]/]
```

## Mixed Results

```console
$ cliscore --run fixtures/basic.md fixtures/failing.md
...
[Matching: /✗ 1 test/]
```

## Error Details

Failures should show expected vs actual (with -v for details):

```console
$ cliscore --run -v fixtures/failing.md 2>&1
...
[Matching: /Expected:/]
...
[Matching: /Got:/]
...
```

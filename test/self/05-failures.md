# Self-Test: Failure Detection

Test that cliscore correctly detects and reports failures.

## Failing Test

```cliscore
$ cliscore fixtures/failing.md
...
[Matching: /✗ 1 test/]
```

Exit code should be non-zero:

```cliscore
$ cliscore fixtures/failing.md || echo "exit code: $?"
...
exit code: 1
```

## Failure Output

```cliscore
$ cliscore fixtures/failing.md 2>&1 | grep -c "failed"
[Matching: /[1-9]/]
```

## Mixed Results

```cliscore
$ cliscore fixtures/basic.md fixtures/failing.md
...
[Matching: /✗ 1 test/]
```

## Error Details

Failures should show expected vs actual (with -v for details):

```cliscore
$ cliscore -v fixtures/failing.md 2>&1
...
[Matching: /Expected:/]
...
[Matching: /Got:/]
...
```

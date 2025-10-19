# Self-Test: Exit Codes

Test that cliscore handles command exit codes correctly.

## Success Exit Code

```console
$ cliscore fixtures/basic.md && echo "success"
...
success
```

## Failure Exit Code

```console
$ cliscore fixtures/failing.md || echo "failed as expected"
...
failed as expected
```

## Commands Can Have Non-Zero Exit Codes

```console
$ false || echo "caught: $?"
caught: 1
```

## Environment Persists

```console
$ export TEST_VAR=value
$ echo $TEST_VAR
value
```

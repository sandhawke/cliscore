# Self-Test: Exit Codes

Test that cliscore handles command exit codes correctly.

## Success Exit Code

```cliscore
$ cliscore fixtures/basic.md && echo "success"
...
success
```

## Failure Exit Code

```cliscore
$ cliscore fixtures/failing.md || echo "failed as expected"
...
failed as expected
```

## Commands Can Have Non-Zero Exit Codes

```cliscore
$ false || echo "caught: $?"
caught: 1
```

## Environment Persists

```cliscore
$ export TEST_VAR=value
$ echo $TEST_VAR
value
```

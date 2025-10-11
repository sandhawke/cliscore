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

The test itself can check for non-zero exits:

```cliscore
$ echo '```cliscore' > /tmp/nonzero-exit.md
$ echo '$ false || echo "caught: $?"' >> /tmp/nonzero-exit.md
$ echo 'caught: 1' >> /tmp/nonzero-exit.md
$ echo '```' >> /tmp/nonzero-exit.md
$ cliscore /tmp/nonzero-exit.md
✓ All tests passed! (1/1)
```

## Environment Persists

```cliscore
$ echo '```cliscore' > /tmp/env-persist.md
$ echo '$ export TEST_VAR=value' >> /tmp/env-persist.md
$ echo '$ echo $TEST_VAR' >> /tmp/env-persist.md
$ echo 'value' >> /tmp/env-persist.md
$ echo '```' >> /tmp/env-persist.md
$ cliscore /tmp/env-persist.md
✓ All tests passed! (2/2)
```

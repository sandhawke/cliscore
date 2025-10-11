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
$ cat > /tmp/nonzero-exit.md << 'EOF'
```cliscore
$ false || echo "caught: $?"
caught: 1
EOF
```

```cliscore
$ cliscore /tmp/nonzero-exit.md
✓ All tests passed! (1/1)
```

## Environment Persists

```cliscore
$ cat > /tmp/env-persist.md << 'EOF'
```cliscore
$ export TEST_VAR=value
$ echo $TEST_VAR
value
EOF
```

```cliscore
$ cliscore /tmp/env-persist.md
✓ All tests passed! (2/2)
```

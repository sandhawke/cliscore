# Self-Test: Empty Line Handling

Test that empty lines in output are preserved and matched correctly.

These features are thoroughly tested in test/empty-lines.test.js.
Here we just verify the behavior works end-to-end.

## Empty Lines Preserved

```cliscore
$ printf "line1\n\nline3"
line1

line3
```

## Commands Not Separated by Empty Lines

```cliscore
$ echo "first"
first
$ echo "second"
second
```

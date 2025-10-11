# Self-Test: Empty Line Handling

Test that empty lines in output are preserved and matched correctly.

## Empty Lines in Output

```cliscore
$ echo '```cliscore' > /tmp/empty-lines.md
$ echo '$ printf "line1\n\nline3"' >> /tmp/empty-lines.md
$ echo 'line1' >> /tmp/empty-lines.md
$ echo '' >> /tmp/empty-lines.md
$ echo 'line3' >> /tmp/empty-lines.md
$ echo '```' >> /tmp/empty-lines.md
$ cliscore /tmp/empty-lines.md
✓ All tests passed! (1/1)
```

## Missing Empty Line Should Fail

```cliscore
$ echo '```cliscore' > /tmp/missing-empty.md
$ echo '$ printf "line1\nline2"' >> /tmp/missing-empty.md
$ echo 'line1' >> /tmp/missing-empty.md
$ echo '' >> /tmp/missing-empty.md
$ echo 'line2' >> /tmp/missing-empty.md
$ echo '```' >> /tmp/missing-empty.md
$ cliscore /tmp/missing-empty.md
[stderr: ✗ 1 test]
```

## Multiple Empty Lines

```cliscore
$ echo '```cliscore' > /tmp/multi-empty.md
$ echo '$ printf "a\n\n\nb"' >> /tmp/multi-empty.md
$ echo 'a' >> /tmp/multi-empty.md
$ echo '' >> /tmp/multi-empty.md
$ echo '' >> /tmp/multi-empty.md
$ echo 'b' >> /tmp/multi-empty.md
$ echo '```' >> /tmp/multi-empty.md
$ cliscore /tmp/multi-empty.md
✓ All tests passed! (1/1)
```

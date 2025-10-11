# Self-Test: Empty Line Handling

Test that empty lines in output are preserved and matched correctly.

## Empty Lines in Output

```cliscore
$ cat > /tmp/empty-lines.md << 'EOF'
```cliscore
$ printf "line1\n\nline3"
line1

line3
EOF
```

```cliscore
$ cliscore /tmp/empty-lines.md
✓ All tests passed! (1/1)
```

## Missing Empty Line Should Fail

```cliscore
$ cat > /tmp/missing-empty.md << 'EOF'
```cliscore
$ printf "line1\nline2"
line1

line2
EOF
```

```cliscore
$ cliscore /tmp/missing-empty.md
[stderr: ✗ 1 test]
```

## Multiple Empty Lines

```cliscore
$ cat > /tmp/multi-empty.md << 'EOF'
```cliscore
$ printf "a\n\n\nb"
a


b
EOF
```

```cliscore
$ cliscore /tmp/multi-empty.md
✓ All tests passed! (1/1)
```

# Self-Test: Multiline Commands

Test continuation line support.

## Basic Continuation

```cliscore
$ cat > /tmp/continuation.md << 'EOF'
```cliscore
$ echo "line1" && \
> echo "line2"
line1
line2
EOF
```

```cliscore
$ cliscore /tmp/continuation.md
✓ All tests passed! (1/1)
```

## Multiple Continuations

```cliscore
$ cat > /tmp/multi-cont.md << 'EOF'
```cliscore
$ echo "a" && \
> echo "b" && \
> echo "c"
a
b
c
EOF
```

```cliscore
$ cliscore /tmp/multi-cont.md
✓ All tests passed! (1/1)
```

## UTF Format Continuation

```cliscore
$ cat > /tmp/utf-cont.t << 'EOF'
  $ echo "first" && \
  > echo "second"
  first
  second
EOF
```

```cliscore
$ cliscore /tmp/utf-cont.t
✓ All tests passed! (1/1)
```

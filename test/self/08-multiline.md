# Self-Test: Multiline Commands

Test continuation line support.

## Basic Continuation

```cliscore
$ echo '```cliscore' > /tmp/continuation.md
$ echo '$ echo "line1" && \' >> /tmp/continuation.md
$ echo '> echo "line2"' >> /tmp/continuation.md
$ echo 'line1' >> /tmp/continuation.md
$ echo 'line2' >> /tmp/continuation.md
$ echo '```' >> /tmp/continuation.md
$ cliscore /tmp/continuation.md
✓ All tests passed! (1/1)
```

## Multiple Continuations

```cliscore
$ echo '```cliscore' > /tmp/multi-cont.md
$ echo '$ echo "a" && \' >> /tmp/multi-cont.md
$ echo '> echo "b" && \' >> /tmp/multi-cont.md
$ echo '> echo "c"' >> /tmp/multi-cont.md
$ echo 'a' >> /tmp/multi-cont.md
$ echo 'b' >> /tmp/multi-cont.md
$ echo 'c' >> /tmp/multi-cont.md
$ echo '```' >> /tmp/multi-cont.md
$ cliscore /tmp/multi-cont.md
✓ All tests passed! (1/1)
```

## UTF Format Continuation

```cliscore
$ echo '  $ echo "first" && \' > /tmp/utf-cont.t
$ echo '  > echo "second"' >> /tmp/utf-cont.t
$ echo '  first' >> /tmp/utf-cont.t
$ echo '  second' >> /tmp/utf-cont.t
$ cliscore /tmp/utf-cont.t
✓ All tests passed! (1/1)
```

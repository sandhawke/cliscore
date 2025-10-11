# Self-Test: Multiline Commands

Test continuation line support.

## Basic Continuation

```cliscore
$ echo "line1" && \
> echo "line2"
line1
line2
```

## Multiple Continuations

```cliscore
$ echo "a" && \
> echo "b" && \
> echo "c"
a
b
c
```

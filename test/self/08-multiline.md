# Self-Test: Multiline Commands

Test continuation line support.

## Basic Continuation

```console
$ echo "line1" && \
> echo "line2"
line1
line2
```

## Multiple Continuations

```console
$ echo "a" && \
> echo "b" && \
> echo "c"
a
b
c
```

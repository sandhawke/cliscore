# Example Test Suite

This is an example test suite demonstrating cliscore's markdown format.

## Basic Commands

```console
$ echo "Hello from markdown"
Hello from markdown
$ pwd
[Matching: /.*]
```

## Pattern Matching

### Regular Expressions

```console
$ echo "Error: File not found"
[Matching: /Error: .* not found/]
```

### Glob Patterns

```console
$ echo "data.json"
[Matching glob: *.json]
```

## Ellipsis

```console
$ printf "first\nmiddle1\nmiddle2\nlast"
first
...
last
```

## Environment Variables

```console
$ export MY_VAR="test value"
$ echo $MY_VAR
test value
```

## User Prompts

```console
alice$ echo "user prompt"
user prompt
alice@server$ echo "user@host prompt"
user@host prompt
```

## Multiple Line Commands

```console
$ echo "line1" && \
> echo "line2" && \
> echo "line3"
line1
line2
line3
```

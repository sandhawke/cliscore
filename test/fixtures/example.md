# Example Test Suite

This is an example test suite demonstrating cliscore's markdown format.

## Basic Commands

```cliscore
$ echo "Hello from markdown"
Hello from markdown
$ pwd
[Matching: /.*]
```

## Pattern Matching

### Regular Expressions

```cliscore
$ echo "Error: File not found"
[Matching: /Error: .* not found/]
```

### Glob Patterns

```cliscore
$ echo "data.json"
[Matching glob: *.json]
```

## Ellipsis

```cliscore
$ printf "first\nmiddle1\nmiddle2\nlast"
first
...
last
```

## Environment Variables

```cliscore
$ export MY_VAR="test value"
$ echo $MY_VAR
test value
```

## User Prompts

```cliscore
alice$ echo "user prompt"
user prompt
alice@server$ echo "user@host prompt"
user@host prompt
```

## Multiple Line Commands

```cliscore
$ echo "line1" && \
> echo "line2" && \
> echo "line3"
line1
line2
line3
```

# cliscore Tutorial

Write tests that look like shell sessions.

## Basic Test (.md file)

````markdown
```cliscore
$ echo "hello"
hello
```
````

Commands start with `$` or `#`. Lines after are expected output.

## Multiple Commands

````markdown
```cliscore
$ echo "first"
first
$ echo "second"
second
```
````

New prompt = new test. No blank lines needed between tests.

## Multiline Commands

````markdown
```cliscore
$ echo "line1" && \
> echo "line2"
line1
line2
```
````

Continuation with `> `.

## Pattern Matching

### Regex
```cliscore
$ echo "test123"
test\d+ (re)
```

Or: `[Matching: /test\d+/i]` with flags.

### Glob
```cliscore
$ ls *.txt
file1.txt (glob)
```

Or: `[Matching glob: *.txt]`

### Ellipsis (skip lines)
```cliscore
$ cat file
first
...
last
```

## Stderr

```cliscore
$ command 2>&1
stdout line
[stderr: error message]
```

Stdout and stderr can be interleaved in any order.

## Empty Lines

Empty lines in output must match exactly:

```cliscore
$ printf "a\n\nb"
a

b
```

## Edge Cases

```cliscore
$ echo "[literal brackets]"
[Literal text: "[literal brackets]"]

$ echo -n "no newline"
no newline (no-eol)
```

## UTF Format (.t files)

```
  $ echo "test"
  test
```

Two-space indent for commands (`  $ `) and output (`  `).

## Setup/Teardown (cliscore.sh)

Optional file in project root:

```sh
before_each_file() {
    export MY_VAR="value"
}

after_each_file() {
    # cleanup
}

helper_function() {
    echo "usable in tests"
}
```

Functions are sourced but invisible (don't appear in output).

## Running Tests

```bash
cliscore test.md                    # single file
cliscore tests/**/*.md              # glob pattern
cliscore --fast tests/**/*.md       # parallel (8 jobs)
cliscore --jobs 4 tests/**/*.md     # parallel (4 jobs)
```

Exit code 0 = all passed, 1 = failures.

## That's It

Write shell commands. Write expected output. Run `cliscore`.

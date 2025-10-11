# Self-Test: Prompt Styles

Test different prompt styles (user@host).

## User Prompts

```cliscore
alice$ echo "user"
user
bob$ echo "another"
another
```

## User@Host Prompts

```cliscore
alice@server$ echo "remote"
remote
bob@localhost$ echo "local"
local
```

## Mixed Prompts

```cliscore
$ echo "standard"
standard
alice$ echo "user"
user
alice@host$ echo "user@host"
user@host
```

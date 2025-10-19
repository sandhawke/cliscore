# Self-Test: Prompt Styles

Test different prompt styles (user@host).

## User Prompts

```console
alice$ echo "user"
user
bob$ echo "another"
another
```

## User@Host Prompts

```console
alice@server$ echo "remote"
remote
bob@localhost$ echo "local"
local
```

## Mixed Prompts

```console
$ echo "standard"
standard
alice$ echo "user"
user
alice@host$ echo "user@host"
user@host
```

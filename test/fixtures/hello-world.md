# My Test Suite

```bash
$ echo "hello world"
hello world
```

```shell
$ # by default we run in /bin/sh which doesn't have $RANDOM
$ bash -c 'echo $RANDOM'
[Matching: /\d+/]
```

```console
$ df
Filesystem     1K-blocks      Used Available Use% Mounted on
...
[Matching: /^tmpfs\s*/]
...
```

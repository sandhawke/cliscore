This is the spec for cliscore, a new unix command line tool. 

## Goals

Our primary goal with cliscore is to help AI coding tools create the software we want. With cliscore, we focus on the external behavior of programs with command-line interfaces (CLIs). Internal behavior is tested only by adding features which expose it to the outside.

The basic goal is to have tests which are easy as possible for the users to read and understand, so they can confirm the tests actually express the desired behavior of the program.

## Strategy

We use tests that look like shell sessions, with unnecessary details left out.

There is an existing test format designed like this, the mercurial (hg) unified test format (utf), which was also implemented by cram. cliscore can run utf tests, but we extend the format in a few ways:

1. We accept markdown files, looking for tests in triple backtick fenced code blocks. By default, the language on the triple backticks must be "cliscore", but cliscore can be configured to allow other language idenfiers, such as "shell-session" or "bash". The recommended configuration is shell-session code blocks, but that is not the default because we want to reduce the risk of cliscore running a shell-session which is not safe to run.

2. We accept prompts like alice$ and alice@host$ to simplify writing tests for multiuser and cross-host software.

3. In addition to utf's "(re)" convention for allowing regular expressions in tests, we support a syntax that makes sense to English readers without explanation.

4. We support a test setup and teardown mechanism

In general, cliscore operated by parsing each test file into a connected sequence of tests. Each test in the sequence is a command and a description of its acceptable output. cliscore runs the sequence of tests by opening a pipe to a shell, an executing each command followed by an echo of a statistically-unique end marker (structured to include the command exist status) to each of stdout and stderr. Meanwhile, cliscore reads stdout and stderr, looking for the end markers, and matches the output to the description that was part of the test.

We accept .t files from utf, but also .cliscore and .md.

Prompts end in '$ ' or '# '.

Continuation prompts are /\s*> /

cliscore --json --dry-run just outputs json expressing all the details of the tests it parsed.

Conceptually, cliscore could run each of the test files it finds in parallel.

urf format:

    All tests use the .t file extension.

    Lines beginning with two spaces, a dollar sign, and a space are run in the shell.

    Lines beginning with two spaces, a greater than sign, and a space allow multi-line commands.

    All other lines beginning with two spaces are considered command output.

    Output lines ending with a space and the keyword (re) are matched as Perl-compatible regular expressions.

    Lines ending with a space and the keyword (glob) are matched with a glob-like syntax. The only special characters supported are * and ?. Both characters can be escaped using \, and the backslash can be escaped itself.

    Output lines ending with either of the above keywords are always first matched literally with actual command output.

    Lines ending with a space and the keyword (no-eol) will match actual output that doesn't end in a newline.

    Actual output lines containing unprintable characters are escaped and suffixed with a space and the keyword (esc). Lines matching unprintable output must also contain the keyword.

    Anything else is a comment.

In .md files, cliscore needs triple backtick fenced code blocks.

In .cliscore files, cliscore accepts either format.

In the output expression, cliscore looks for lines '...' and lines in brackets. In brackets we have some special mean structues:
* [Literal text: "[something in square brackets]"]
* [Matching glob: some expr*]
* [Matching: some re]
* [Output ends without end-of-line]

The text '...' (without the quotes) means zero or more lines

The re may optionally have starting and ending slashes, in which case it may be trailed with flags, exactly as in ECMAScript.


## Coming soon

A way to specify the execution environment in general, and with specific set up and tear town.

Options for running in a Container, on a TTY, over ssh to a host, etc.

The user and host options like prompt 'alice$'.


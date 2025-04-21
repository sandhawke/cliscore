This is the spec for cliscore, guiding development.

`cliscore` is a CLI tool for running tests of software from the command line. It is also a node.js library, suitable for using inside other node.js software.

The test format is compatible with cram and mercurial's unified test format, both documented in nearby files.

The program takes filenames as arguments, which must be .t files, and runs each one like cram does. The output format is TAP.

As a library, cliscore exports an async function to run a test file, given the file contents in a string, what dir to execute in (default to cwd), env to pass in, callback points for output as it happens, and eventually resolves when the test is complete. Maybe include a way to terminate it cleanly and clean up? Final result should have lots of details.


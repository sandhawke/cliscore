/**
 * cliscore - A test runner for command-line interfaces
 *
 * This module provides the main API for cliscore, a test runner that extends
 * the Mercurial unified test format (UTF) to support markdown files and
 * enhanced output matching.
 *
 * @module cliscore
 */

export { parseTestFile } from './parser.js';
export { matchOutput } from './matcher.js';
export { Executor } from './executor.js';
export { runTestFile, runTestFiles, formatResults, getSummary } from './runner.js';

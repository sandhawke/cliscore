import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { matchOutput } from '../src/matcher.js';

describe('Matcher', () => {
  describe('Literal matching', () => {
    it('should match exact text', () => {
      const stdout = ['hello world'];
      const stderr = [];
      const expected = [{ type: 'literal', pattern: 'hello world' }];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });

    it('should fail on mismatch', () => {
      const stdout = ['hello world'];
      const stderr = [];
      const expected = [{ type: 'literal', pattern: 'goodbye world' }];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, false);
      assert.match(result.error, /mismatch/i);
    });

    it('should match multiple lines', () => {
      const stdout = ['line1', 'line2', 'line3'];
      const stderr = [];
      const expected = [
        { type: 'literal', pattern: 'line1' },
        { type: 'literal', pattern: 'line2' },
        { type: 'literal', pattern: 'line3' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });
  });

  describe('Regex matching', () => {
    it('should match with simple regex', () => {
      const actual = ['test123'];
      const expected = [{ type: 'regex', pattern: 'test\\d+' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should match with regex flags', () => {
      const actual = ['TEST123'];
      const expected = [{ type: 'regex', pattern: 'test\\d+', flags: 'i' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should fail on regex non-match', () => {
      const actual = ['test'];
      const expected = [{ type: 'regex', pattern: 'test\\d+' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
    });

    it('should handle complex regex patterns', () => {
      const actual = ['Error: File not found'];
      const expected = [{ type: 'regex', pattern: 'Error: .* not found' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });
  });

  describe('Glob matching', () => {
    it('should match with asterisk wildcard', () => {
      const actual = ['file123.txt'];
      const expected = [{ type: 'glob', pattern: 'file*.txt' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should match with question mark wildcard', () => {
      const actual = ['file1.txt'];
      const expected = [{ type: 'glob', pattern: 'file?.txt' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should handle escaped wildcards', () => {
      const actual = ['file*.txt'];
      const expected = [{ type: 'glob', pattern: 'file\\*.txt' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should fail on glob non-match', () => {
      const actual = ['file.doc'];
      const expected = [{ type: 'glob', pattern: '*.txt' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
    });
  });

  describe('Ellipsis matching', () => {
    it('should match zero lines', () => {
      const actual = ['first', 'last'];
      const expected = [
        { type: 'literal', pattern: 'first' },
        { type: 'ellipsis' },
        { type: 'literal', pattern: 'last' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should match multiple lines', () => {
      const actual = ['first', 'middle1', 'middle2', 'last'];
      const expected = [
        { type: 'literal', pattern: 'first' },
        { type: 'ellipsis' },
        { type: 'literal', pattern: 'last' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should match at the end', () => {
      const actual = ['first', 'second', 'third'];
      const expected = [
        { type: 'literal', pattern: 'first' },
        { type: 'ellipsis' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should fail if pattern after ellipsis not found', () => {
      const actual = ['first', 'second'];
      const expected = [
        { type: 'literal', pattern: 'first' },
        { type: 'ellipsis' },
        { type: 'literal', pattern: 'notfound' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
      assert.match(result.error, /after ellipsis/i);
    });
  });

  describe('Mixed patterns', () => {
    it('should handle literal and regex together', () => {
      const actual = ['Starting...', 'Progress: 50%', 'Done!'];
      const expected = [
        { type: 'literal', pattern: 'Starting...' },
        { type: 'regex', pattern: 'Progress: \\d+%' },
        { type: 'literal', pattern: 'Done!' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should handle ellipsis with various patterns', () => {
      const actual = [
        'Header',
        'line1',
        'line2',
        'Footer: 100'
      ];
      const expected = [
        { type: 'literal', pattern: 'Header' },
        { type: 'ellipsis' },
        { type: 'regex', pattern: 'Footer: \\d+' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });
  });

  describe('Error cases', () => {
    it('should detect missing output', () => {
      const actual = ['line1'];
      const expected = [
        { type: 'literal', pattern: 'line1' },
        { type: 'literal', pattern: 'line2' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
      assert.match(result.error, /expected more/i);
    });

    it('should detect extra output', () => {
      const actual = ['line1', 'line2', 'line3'];
      const expected = [
        { type: 'literal', pattern: 'line1' }
      ];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
      assert.match(result.error, /unexpected extra output/i);
    });

    it('should handle empty expectations', () => {
      const actual = [];
      const expected = [];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should handle invalid regex', () => {
      const actual = ['test'];
      const expected = [{ type: 'regex', pattern: '[invalid(' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, false);
      assert.match(result.error, /invalid regex/i);
    });
  });

  describe('No-EOL matching', () => {
    it('should match no-eol with pattern', () => {
      const actual = ['no newline'];
      const expected = [{ type: 'no-eol', pattern: 'no newline' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });

    it('should match no-eol without pattern', () => {
      const actual = ['anything'];
      const expected = [{ type: 'no-eol' }];

      const result = matchOutput(actual, [], expected);

      assert.equal(result.success, true);
    });
  });

  describe('Stderr matching', () => {
    it('should match stderr lines', () => {
      const stdout = ['normal output'];
      const stderr = ['error message'];
      const expected = [
        { type: 'literal', pattern: 'normal output' },
        { type: 'literal', pattern: 'error message', stream: 'stderr' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });

    it('should distinguish between stdout and stderr', () => {
      const stdout = ['output'];
      const stderr = ['error'];
      const expected = [
        { type: 'literal', pattern: 'output' },
        { type: 'literal', pattern: 'error', stream: 'stderr' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });

    it('should fail if stderr expected but not present', () => {
      const stdout = ['output'];
      const stderr = [];
      const expected = [
        { type: 'literal', pattern: 'error', stream: 'stderr' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, false);
      assert.match(result.error, /expected more stderr/i);
    });

    it('should allow matching only stderr', () => {
      const stdout = [];
      const stderr = ['stderr line'];
      const expected = [
        { type: 'literal', pattern: 'stderr line', stream: 'stderr' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });

    it('should handle mixed stdout and stderr with ellipsis', () => {
      const stdout = ['start', 'middle', 'end'];
      const stderr = ['error1', 'error2'];
      const expected = [
        { type: 'literal', pattern: 'start' },
        { type: 'ellipsis' },
        { type: 'literal', pattern: 'error2', stream: 'stderr' }
      ];

      const result = matchOutput(stdout, stderr, expected);

      assert.equal(result.success, true);
    });
  });
});

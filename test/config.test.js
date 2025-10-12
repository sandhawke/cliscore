import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig, mergeConfig } from '../src/config.js';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

const TEST_DIR = '/tmp/cliscore-test-config';

describe('Config', () => {
  describe('loadConfig', () => {
    it('should load valid config', async () => {
      const config = {
        allowedLanguages: ['cliscore', 'bash'],
        jobs: 4
      };
      const configPath = join(TEST_DIR, 'cliscore.json');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(configPath, JSON.stringify(config));

      const loaded = await loadConfig(configPath);

      assert.deepEqual(loaded.allowedLanguages, ['cliscore', 'bash']);
      assert.equal(loaded.jobs, 4);

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should return empty config if file does not exist', async () => {
      const loaded = await loadConfig('/nonexistent/cliscore.json');

      assert.deepEqual(loaded, {});
    });

    it('should throw on invalid JSON', async () => {
      const configPath = join(TEST_DIR, 'invalid.json');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(configPath, 'invalid json{');

      await assert.rejects(
        async () => await loadConfig(configPath),
        /invalid cliscore\.json/i
      );

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should validate config structure', async () => {
      const config = { allowedLanguages: 'not-an-array' };
      const configPath = join(TEST_DIR, 'bad-config.json');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(configPath, JSON.stringify(config));

      await assert.rejects(
        async () => await loadConfig(configPath),
        /must be an array/i
      );

      await rm(TEST_DIR, { recursive: true, force: true });
    });

    it('should validate jobs is positive integer', async () => {
      const config = { jobs: -1 };
      const configPath = join(TEST_DIR, 'bad-jobs.json');
      await mkdir(TEST_DIR, { recursive: true });
      await writeFile(configPath, JSON.stringify(config));

      await assert.rejects(
        async () => await loadConfig(configPath),
        /positive integer/i
      );

      await rm(TEST_DIR, { recursive: true, force: true });
    });
  });

  describe('mergeConfig', () => {
    it('should use defaults when no config or CLI options', () => {
      const merged = mergeConfig({}, { allowedLanguages: ['cliscore'] });

      assert.deepEqual(merged.allowedLanguages, ['cliscore']);
      assert.equal(merged.jobs, 1);
    });

    it('should apply config file over defaults', () => {
      const config = {
        allowedLanguages: ['shell-session', 'bash'],
        jobs: 4
      };
      const merged = mergeConfig(config, { allowedLanguages: ['cliscore'] });

      assert.deepEqual(merged.allowedLanguages, ['shell-session', 'bash']);
      assert.equal(merged.jobs, 4);
    });

    it('should apply CLI options over config file', () => {
      const config = {
        allowedLanguages: ['shell-session'],
        jobs: 4
      };
      const cliOptions = {
        allowedLanguages: ['cliscore', 'bash'],
        jobs: 8
      };
      const merged = mergeConfig(config, cliOptions);

      assert.deepEqual(merged.allowedLanguages, ['cliscore', 'bash']);
      assert.equal(merged.jobs, 8);
    });

    it('should handle fast flag in config', () => {
      const config = { fast: true };
      const merged = mergeConfig(config, { allowedLanguages: ['cliscore'] });

      assert.equal(merged.jobs, 8);
    });

    it('should prioritize CLI over config fast flag', () => {
      const config = { fast: true };
      const cliOptions = {
        allowedLanguages: ['cliscore'],
        jobs: 2
      };
      const merged = mergeConfig(config, cliOptions);

      assert.equal(merged.jobs, 2);
    });

    it('should preserve default languages if not specified', () => {
      const config = { jobs: 4 };
      const merged = mergeConfig(config, { allowedLanguages: ['cliscore'] });

      assert.deepEqual(merged.allowedLanguages, ['cliscore']);
    });

    it('should apply shell from config', () => {
      const config = { shell: '/bin/bash' };
      const merged = mergeConfig(config, { allowedLanguages: ['cliscore'] });

      assert.equal(merged.shell, '/bin/bash');
    });

    it('should apply shell from CLI over config', () => {
      const config = { shell: '/bin/bash' };
      const cliOptions = {
        allowedLanguages: ['cliscore'],
        shell: '/bin/zsh'
      };
      const merged = mergeConfig(config, cliOptions);

      assert.equal(merged.shell, '/bin/zsh');
    });

    it('should use default shell if not specified', () => {
      const merged = mergeConfig({}, { allowedLanguages: ['cliscore'] });

      assert.equal(merged.shell, '/bin/sh');
    });
  });
});

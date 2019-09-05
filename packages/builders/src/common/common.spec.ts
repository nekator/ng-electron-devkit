import { BuilderContext } from '@angular-devkit/architect';
import { JsonObject, normalize } from '@angular-devkit/core';
import { Logger } from '@angular-devkit/core/src/logger';
import { join } from 'path';
import { buildWebpackConfig, compileElectronEntryPoint, getElectronMainEntryPoint } from './common';

describe('common', () => {
  const sampleProjectDir = join(__dirname, '..', '..', '..', '..', 'sample');
  const electronSampleProjectDir = join(sampleProjectDir, 'src', 'electron');
  let context: Partial<BuilderContext>;

  beforeEach(async () => {
    context = {
      workspaceRoot: sampleProjectDir,
      logger: {
        createChild(name: string): Logger {
          return new (this.constructor as typeof Logger)(name);
        },
        debug(message: string, metadata?: JsonObject): void {
          console.debug(message);
        },
        error(message: string, metadata?: JsonObject): void {
          console.error(message);
        },
        fatal(message: string, metadata?: JsonObject): void {
          console.exception(message);
        },
        info(message: string, metadata?: JsonObject): void {
          console.info(message);
        },
        log(level: 'debug' | 'info' | 'warn' | 'error' | 'fatal', message: string, metadata?: JsonObject): void {
          if (level === 'fatal') {
            console.exception(message);
          } else {
            console[level](message);
          }
        },
        warn(message: string, metadata?: JsonObject): void {
          console.warn(message);
        }
      }
    };
  });

  it('should compile electron main process code', async () => {
    const result = await compileElectronEntryPoint(
      context,
      {
        electronPlatforms: 'mac,win,linux',
        electronProjectDir: electronSampleProjectDir,
        electronTSConfig: join(electronSampleProjectDir, 'tsconfig.json')
      },
      __dirname
    ).toPromise();
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should create a webpack config for electron', async () => {
    const result = buildWebpackConfig({});
    expect(result).toBeDefined();
    expect(result).toEqual({
      target: 'electron-renderer',
      node: {
        __dirname: false
      }
    });
  });

  it('should return electron main entry point', async () => {
    const result = getElectronMainEntryPoint(normalize(electronSampleProjectDir));
    expect(result).toBeDefined();
    expect(result).toBe('index.js');
  });
});

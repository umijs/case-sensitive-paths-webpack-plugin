import path from 'path';
import { type Stats, type StatsCompilation, webpack } from 'webpack';
import Plugin from '../src';

let stats: Stats;
let jsonStats: StatsCompilation;

beforeAll(async () => {
  const config = require('../example/webpack.config');

  // replace plugin to source module to collect coverage
  config.plugins = [new Plugin()];
  config.context = path.join(__dirname, '../example');

  // trigger webpack compilation
  await new Promise<void>((resolve) => {
    webpack(config).run((_, sts) => {
      stats = sts!;
      jsonStats = sts!.toJson();
      resolve();
    });
  });
});

test('should has errors', () => {
  expect(stats.hasErrors()).toBeTruthy();
  expect(jsonStats.errors).toHaveLength(6);
  expect(
    jsonStats.errors!.every((err) =>
      err.message.includes('CaseSensitivePathsPlugin'),
    ),
  ).toBeTruthy();
});

test('should check same-level modules', () => {
  expect(
    jsonStats.errors!.find((err) => err.message.includes('`other.js`')),
  ).not.toBeUndefined();
});

test('should check css modules', () => {
  expect(
    jsonStats.errors!.find((err) => err.message.includes('`other.css`')),
  ).not.toBeUndefined();
});

test('should check sub-level modules', () => {
  expect(
    jsonStats.errors!.find((err) => err.message.includes('Child/index.js`')),
  ).not.toBeUndefined();
  expect(
    jsonStats.errors!.find((err) => err.message.includes('Child/Son/A.js`')),
  ).not.toBeUndefined();
  expect(
    jsonStats.errors!.find((err) => err.message.includes('Child/Son/B.js`')),
  ).not.toBeUndefined();
});

test('should check paths with # correctly', () => {
  expect(
    jsonStats.errors!.find((err) => err.message.includes('`hash.js`')),
  ).not.toBeUndefined();
});

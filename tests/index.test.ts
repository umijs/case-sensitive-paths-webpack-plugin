import path from 'path';
import webpack, {
  type StatsError,
  type Stats,
  type StatsCompilation,
} from 'webpack';
import Plugin from '../src';

let stats: Stats;
let jsonStats: StatsCompilation;

/**
 * get error message both for webpack 4.x & 5.x
 */
function getErrMsg(err: StatsError) {
  return err.message || (err as unknown as string);
}

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
      getErrMsg(err).includes('CaseSensitivePathsPlugin'),
    ),
  ).toBeTruthy();
});

test('should check same-level modules', () => {
  expect(
    jsonStats.errors!.find((err) => getErrMsg(err).includes('`other.js`')),
  ).not.toBeUndefined();
});

test('should check css modules', () => {
  expect(
    jsonStats.errors!.find((err) => getErrMsg(err).includes('`other.css`')),
  ).not.toBeUndefined();
});

test('should check sub-level modules', () => {
  expect(
    jsonStats.errors!.find((err) =>
      /Child(\/|\\)index.js/.test(getErrMsg(err)),
    ),
  ).not.toBeUndefined();
  expect(
    jsonStats.errors!.find((err) => /Son(\/|\\)A.js/.test(getErrMsg(err))),
  ).not.toBeUndefined();
  expect(
    jsonStats.errors!.find((err) => /Son(\/|\\)B.js/.test(getErrMsg(err))),
  ).not.toBeUndefined();
});

test('should check paths with # correctly', () => {
  expect(
    jsonStats.errors!.find((err) => getErrMsg(err).includes('`hash.js`')),
  ).not.toBeUndefined();
});

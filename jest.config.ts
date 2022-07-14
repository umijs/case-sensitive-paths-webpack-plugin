import { createConfig } from '@umijs/test';

export default {
  ...createConfig() as any,
  collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};

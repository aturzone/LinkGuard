import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/test'],
    moduleNameMapper: {
        '^@engine/(.*)$': '<rootDir>/src/engine/$1',
        '^@services/(.*)$': '<rootDir>/src/services/$1',
        '^@models/(.*)$': '<rootDir>/src/engine/models/$1',
        '^@data/(.*)$': '<rootDir>/src/engine/data/$1',
    },
    transform: {
        '^.+\\.ts$': ['ts-jest', {
            tsconfig: 'tsconfig.test.json',
        }],
    },
    setupFiles: ['<rootDir>/test/setup.ts'],
    collectCoverageFrom: [
        'src/engine/**/*.ts',
        'src/services/**/*.ts',
        '!src/**/*.model.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 80,
            functions: 90,
            lines: 90,
            statements: 90,
        },
    },
};

export default config;

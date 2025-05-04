module.exports = {
    preset: 'ts-jest',
    globals: {
        "ts-jest": {
            isolatedModules: true
        }
    },
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.(spec|test).[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
    collectCoverage: true,
    coverageDirectory: 'coverage',
    coverageReporters: ['text', 'lcov', 'json-summary'],
};
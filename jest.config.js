module.exports = {
    preset: 'ts-jest',
    globals: {
        "ts-jest": {
            isolatedModules: true
        }
    },
    testEnvironment: 'node',
    testMatch: ['**/tests/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
};
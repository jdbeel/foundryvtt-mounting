// SPDX-FileCopyrightText: 2022 Johannes Loher
// SPDX-FileCopyrightText: 2022 David Archibald
//
// SPDX-License-Identifier: MIT

module.exports = {
    parser: '@typescript-eslint/parser',

    parserOptions: {
        ecmaVersion: 2020,
        extraFileExtensions: ['.cjs', '.mjs'],
        sourceType: 'module',
        project: './tsconfig.eslint.json',
    },

    env: {
        browser: true,
    },

    extends: ['plugin:@typescript-eslint/recommended', 'plugin:jest/recommended', 'plugin:prettier/recommended'],

    plugins: ['@typescript-eslint', 'jest'],

    rules: {
        '@typescript-eslint/ban-ts-comment': 'off',
    },

    overrides: [
        {
            files: ['./*.cjs'],
            rules: {
                '@typescript-eslint/no-var-requires': 'off',
            },
        },
    ],
};

// @ts-check
import pluginQuery from '@tanstack/eslint-plugin-query'
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt(
  ...pluginQuery.configs['flat/recommended'],
  {
    files: ['app/components/ui/**/*.vue'],
    rules: { 'vue/require-default-prop': 'off' },
  },
  {
    files: ['**/*.js', '**/*.ts', '**/*.vue'],
    rules: {
      'vue/multi-word-component-names': 'off',
      'no-console': ['error', { allow: ['info', 'warn', 'trace', 'error'] }],
      'vue/html-self-closing': [
        'error',
        {
          html: { void: 'always', normal: 'always', component: 'always' },
          svg: 'always',
          math: 'always',
        },
      ],
    },
  },
)

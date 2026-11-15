import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

const jsxImportUsage = {
  rules: {
    'no-unused-imports': {
      meta: {
        type: 'problem',
        schema: [],
        messages: { unused: "'{{name}}' is imported but never used." },
      },
      create(context) {
        const jsxBindings = new Set();
        let containsJsx = false;

        function resolve(name, node) {
          let scope = context.sourceCode.getScope(node);
          while (scope) {
            const binding = scope.set.get(name);
            if (binding) return binding;
            scope = scope.upper;
          }
          return null;
        }

        function markJsxTag(name, node) {
          if (name.type === 'JSXIdentifier') {
            if (/^[A-Z]/.test(name.name)) {
              const binding = resolve(name.name, node);
              if (binding) jsxBindings.add(binding);
            }
            return;
          }
          if (name.type === 'JSXMemberExpression') markJsxTag(name.object, node);
        }

        return {
          JSXElement() {
            containsJsx = true;
          },
          JSXFragment() {
            containsJsx = true;
          },
          JSXOpeningElement(node) {
            markJsxTag(node.name, node);
          },
          'Program:exit'(program) {
            const pending = [context.sourceCode.scopeManager.globalScope];
            while (pending.length) {
              const scope = pending.pop();
              if (!scope) continue;
              pending.push(...scope.childScopes);
              for (const binding of scope.variables) {
                if (!binding.defs.some((definition) => definition.type === 'ImportBinding'))
                  continue;
                if (binding.references.some((reference) => reference.isRead())) continue;
                if (jsxBindings.has(binding)) continue;
                if (containsJsx && binding.name === 'React') continue;
                context.report({
                  node: binding.identifiers[0] || program,
                  messageId: 'unused',
                  data: { name: binding.name },
                });
              }
            }
          },
        };
      },
    },
  },
};

export default [
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'jsx-import-usage': jsxImportUsage,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'jsx-import-usage/no-unused-imports': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.jsx'],
    rules: {
      // Core ESLint doesn't count component names used in JSX tags as references.
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['cypress/e2e/**/*.cy.js'],
    languageOptions: {
      globals: {
        cy: 'readonly',
        Cypress: 'readonly',
        describe: 'readonly',
        expect: 'readonly',
        it: 'readonly',
      },
    },
  },
];

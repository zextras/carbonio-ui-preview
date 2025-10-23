# Jest to Vitest Migration Guide

## Migration Summary

This project has been successfully migrated from Jest to Vitest. All 80 tests are passing with equivalent coverage (~87%).

## Changes Overview

### Configuration Files

#### Added
- `vitest.config.ts` - Main Vitest configuration
- `src/tests/vitest-setup.ts` - Global test setup with mocks and polyfills

#### Removed
- `jest.config.ts` - Replaced by vitest.config.ts
- `babel.config.jest.cjs` - No longer needed (Vite handles transpilation)
- `src/tests/jest-setup.ts` - Replaced by vitest-setup.ts

#### Modified
- `package.json` - Updated test scripts and dependencies
- `tsconfig.json` - Added Vitest types
- `src/tests/jsdom-extended.ts` - Updated for Vitest environment API
- `src/tests/utils.tsx` - Removed Jest-specific code
- All `*.test.tsx` files - Updated `jest.*` to `vi.*` API calls

## Key API Changes

| Jest API | Vitest API |
|----------|-----------|
| `jest.fn()` | `vi.fn()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.advanceTimersByTime()` | `vi.advanceTimersByTime()` |

## NPM Scripts

```json
{
  "test": "vitest run",              // Run tests once
  "test:watch": "vitest",            // Run tests in watch mode
  "test:ui": "vitest --ui",          // Open Vitest UI
  "test:coverage": "vitest run --coverage"  // Generate coverage report
}
```

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Coverage Reports

Coverage reports are generated in the `coverage/` directory with the following formats:
- Text output (console)
- Cobertura XML (for CI/CD)
- LCOV (for tools like Codecov)

## Notable Changes

### Polyfills Added
- `Promise.withResolvers` for pdfjs-dist compatibility
- Global fetch APIs (ReadableStream, TextEncoder, etc.) for jsdom

### Mock Configuration
- `react-pdf` mock configured with `vi.mock()` in setup file
- IntersectionObserver mock updated to work as a constructor
- All window mocks (matchMedia, scrollIntoView, etc.) updated to use `vi.fn()`

### Timer Handling
- Tests using fake timers must explicitly call `vi.useFakeTimers()`
- Real timers used by default for user-event operations
- Some tests toggle between fake and real timers as needed

## Benefits

1. **Faster execution** - Native ESM support, no transpilation needed
2. **Better developer experience** - Built-in UI, better error messages
3. **Smaller dependency tree** - Removed ~102 packages
4. **Modern tooling** - Active development, TypeScript-first
5. **Simplified configuration** - No Babel configuration needed

## Troubleshooting

### If tests fail after pulling changes:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install
```

### If coverage reports are missing:
```bash
# Ensure coverage package is installed
npm install --save-dev @vitest/coverage-v8
```

### If mocks aren't working:
- Ensure `vi.mock()` calls are at the top level (not inside tests)
- Check that mock files in `__mocks__/` are being resolved
- Verify setup file is configured in `vitest.config.ts`

## CI/CD Considerations

- Test command remains: `npm test`
- Coverage output location: `coverage/`
- Coverage formats: cobertura.xml, lcov.info
- Exit code behavior: Same as Jest (0 for pass, 1 for fail)

## Additional Resources

- [Vitest Documentation](https://vitest.dev/)
- [Migration from Jest](https://vitest.dev/guide/migration.html)
- [Vitest API Reference](https://vitest.dev/api/)

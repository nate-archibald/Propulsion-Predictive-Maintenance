import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

// ── Templated configuration (resolved by `databricks apps init`) ────────────
const APP_CONFIG = {
  name: 'nathan-a-qx-predictive',
  plugins: [
  ],
} as const;

interface PluginPage {
  navLabel: string;
  path: string;
  expectedTexts: string[];
}

const PLUGIN_PAGES: Record<string, PluginPage> = {
  analytics: {
    navLabel: 'Analytics',
    path: '/analytics',
    expectedTexts: ['SQL Query Result', 'Sales Data Filter'],
  },
  lakebase: {
    navLabel: 'Lakebase',
    path: '/lakebase',
    expectedTexts: ['Todo List'],
  },
  genie: {
    navLabel: 'Genie',
    path: '/genie',
    expectedTexts: ['Ask questions about your data using Databricks AI/BI Genie'],
  },
};

const enabledPages = Object.entries(PLUGIN_PAGES).filter(
  ([key]) => APP_CONFIG.plugins.includes(key),
);

// ── Tests ───────────────────────────────────────────────────────────────────

let testArtifactsDir: string;
let consoleLogs: string[] = [];
let consoleErrors: string[] = [];
let pageErrors: string[] = [];
let failedRequests: string[] = [];

test('smoke test - app loads and displays home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByTestId('app-title')).toBeVisible();
  await expect(page.getByTestId('hero-heading')).toBeVisible();
  await expect(page.getByTestId('metric-active-defects')).toBeVisible();
  await expect(page.getByTestId('ata-hotspot-chart')).toBeVisible();
});

test('smoke test - defects page loads', async ({ page }) => {
  await page.goto('/defects');
  await expect(page.getByTestId('defects-heading')).toBeVisible();
  await expect(page.getByTestId('defects-search-input')).toBeVisible();
  await expect(page.getByTestId('defects-table')).toBeVisible();
});

test('smoke test - parts page loads', async ({ page }) => {
  await page.goto('/parts');
  await expect(page.getByTestId('parts-heading')).toBeVisible();
  await expect(page.getByTestId('parts-search-input')).toBeVisible();
  await expect(page.getByTestId('parts-table')).toBeVisible();
});

test('smoke test - engines page loads', async ({ page }) => {
  await page.goto('/engines');
  await expect(page.getByTestId('engines-heading')).toBeVisible();
  await expect(page.getByTestId('engines-search-input')).toBeVisible();
});

test('smoke test - spares page loads', async ({ page }) => {
  await page.goto('/spares');
  await expect(page.getByTestId('spares-heading')).toBeVisible();
  await expect(page.getByTestId('spares-table')).toBeVisible();
});

test('smoke test - reliability page loads', async ({ page }) => {
  await page.goto('/reliability');
  await expect(page.getByTestId('reliability-heading')).toBeVisible();
  await expect(page.getByTestId('top-ata-delay')).toBeVisible();
});

// ── Lifecycle hooks ─────────────────────────────────────────────────────────

test.beforeEach(async ({ page }) => {
  consoleLogs = [];
  consoleErrors = [];
  pageErrors = [];
  failedRequests = [];

  // Create temp directory for test artifacts
  testArtifactsDir = join(process.cwd(), '.smoke-test');
  mkdirSync(testArtifactsDir, { recursive: true });

  // Capture console logs and errors (including React errors)
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();

    // Skip empty lines and formatting placeholders
    if (!text.trim() || /^%[osd]$/.test(text.trim())) {
      return;
    }

    // Get stack trace for errors if available
    const location = msg.location();
    const locationStr = location.url ? ` at ${location.url}:${location.lineNumber}:${location.columnNumber}` : '';

    consoleLogs.push(`[${type}] ${text}${locationStr}`);

    // Separately track error messages (React errors appear here)
    if (type === 'error') {
      consoleErrors.push(`${text}${locationStr}`);
    }
  });

  // Capture page errors with full stack trace
  page.on('pageerror', (error) => {
    const errorDetails = `Page error: ${error.message}\nStack: ${error.stack || 'No stack trace available'}`;
    pageErrors.push(errorDetails);
    // Also log to console for immediate visibility
    console.error('Page error detected:', errorDetails);
  });

  // Capture failed requests
  page.on('requestfailed', (request) => {
    failedRequests.push(`Failed request: ${request.url()} - ${request.failure()?.errorText}`);
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const testName = testInfo.title.replace(/ /g, '-').toLowerCase();
  // Always capture artifacts, even if test fails
  const screenshotPath = join(testArtifactsDir, `${testName}-app-screenshot.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const logsPath = join(testArtifactsDir, `${testName}-console-logs.txt`);
  const allLogs = [
    '=== Console Logs ===',
    ...consoleLogs,
    '\n=== Console Errors (React errors) ===',
    ...consoleErrors,
    '\n=== Page Errors ===',
    ...pageErrors,
    '\n=== Failed Requests ===',
    ...failedRequests,
  ];
  writeFileSync(logsPath, allLogs.join('\n'), 'utf-8');

  console.log(`Screenshot saved to: ${screenshotPath}`);
  console.log(`Console logs saved to: ${logsPath}`);
  if (consoleErrors.length > 0) {
    console.log('Console errors detected:', consoleErrors);
  }
  if (pageErrors.length > 0) {
    console.log('Page errors detected:', pageErrors);
  }
  if (failedRequests.length > 0) {
    console.log('Failed requests detected:', failedRequests);
  }

  await page.close();
});

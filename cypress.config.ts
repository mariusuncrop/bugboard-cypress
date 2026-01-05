import { defineConfig } from 'cypress';

export default defineConfig({
  /**
   * Cypress 16 split configuration in two. Anything not secret goes in
   * `expose` and is read synchronously with `Cypress.expose('key')`; secrets
   * go in `env` and are only reachable through the chainable `cy.env([...])`,
   * which keeps them out of the config dump and the runner UI.
   *
   * Most Cypress material still says `Cypress.env()` — that was removed in 16.
   */
  expose: {
    apiUrl: process.env.API_URL ?? 'http://localhost:4000',
    adminEmail: process.env.ADMIN_EMAIL ?? 'admin@bugboard.dev',
    memberEmail: process.env.MEMBER_EMAIL ?? 'dev@bugboard.dev',
    project: process.env.PROJECT ?? 'WEB',
  },

  env: {
    adminPassword: process.env.ADMIN_PASSWORD ?? 'Password123!',
    memberPassword: process.env.MEMBER_PASSWORD ?? 'Password123!',
  },

  e2e: {
    baseUrl: process.env.BASE_URL ?? 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts',
    fixturesFolder: 'cypress/fixtures',
    viewportWidth: 1280,
    viewportHeight: 900,
    video: false,
    screenshotOnRunFailure: true,
    // Retries in CI only: locally a flake should be seen, not smoothed over.
    retries: { runMode: 2, openMode: 0 },
    defaultCommandTimeout: 6000,
    requestTimeout: 10000,
    setupNodeEvents(on) {
      // Accessibility violations are printed to the terminal, where a headless
      // run can actually be read; the browser console is not much help in CI.
      on('task', {
        log(message: string) {
          // eslint-disable-next-line no-console
          console.log(message);
          return null;
        },
      });
    },
  },
});

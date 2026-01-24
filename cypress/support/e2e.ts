import './accessibility';
import './commands';

/**
 * The app is a single-page React application. A rejected promise from a
 * cancelled fetch — which happens whenever a test navigates while a request is
 * still going — would otherwise fail the test for something no user would ever
 * notice.
 */
Cypress.on('uncaught:exception', (error) => {
  if (/ResizeObserver loop|Failed to fetch|NetworkError/i.test(error.message)) return false;
  return true;
});

before(() => {
  // One reset for the whole run, not one per test: specs create and clean up
  // their own data, so resetting between them would only slow things down and
  // wipe fixtures other specs are still using.
  cy.resetDatabase();
});

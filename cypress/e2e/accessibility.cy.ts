import { uniqueTitle } from '../support/api';

/**
 * Automated checks catch roughly a third of accessibility defects, so a green
 * run is a floor rather than a pass mark. Scoped to WCAG 2.1 A and AA, which is
 * the bar most teams are actually held to.
 */
const WCAG = { runOnly: { type: 'tag' as const, values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } };

describe('accessibility', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  const scan = () => {
    cy.injectAxe();
    cy.checkAccessibility(undefined, WCAG);
  };

  it('the home page has no detectable violations', () => {
    cy.visit('/');
    cy.getByTestId('home-page').should('be.visible');
    scan();
  });

  it('the project list has no detectable violations', () => {
    cy.visit('/projects');
    cy.getByTestId('project-list').should('be.visible');
    scan();
  });

  it('the board has no detectable violations', () => {
    cy.visitProject('/board');
    cy.getByTestId('board').should('be.visible');
    scan();
  });

  it('the issue list has no detectable violations', () => {
    cy.visitProject('/issues');
    cy.getByTestId('issues-table').should('be.visible');
    scan();
  });

  it('an issue page has no detectable violations', () => {
    cy.visitProject('/issues/WEB-1');
    cy.getByTestId('issue-detail').should('be.visible');
    scan();
  });

  it('the create form has no detectable violations', () => {
    cy.visitProject('/issues/new');
    cy.getByTestId('issue-form').should('be.visible');
    scan();
  });

  it('the confirmation dialog is announced as a modal and takes focus', () => {
    cy.seedIssue({ title: uniqueTitle('Dialog check') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('delete-issue').click();

      cy.getByTestId('confirm-dialog').should('have.attr', 'role', 'dialog').and('have.attr', 'aria-modal', 'true');
      cy.getByTestId('confirm-accept').should('be.focused');
      cy.removeIssue(issue.key);
    });
  });

  it('the login form works from the keyboard alone', () => {
    cy.logout();
    cy.visit('/login');

    // cy.press dispatches a real browser key event, so focus moves the way it
    // does for a person. There is no cy.tab(); that lives in a plugin.
    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'data-testid', 'login-email').type('admin@bugboard.dev');

    cy.press(Cypress.Keyboard.Keys.TAB);
    cy.focused().should('have.attr', 'data-testid', 'login-password').type('Password123!{enter}');

    cy.getByTestId('home-page').should('be.visible');
  });

  it('the dark theme has no detectable violations either', () => {
    // Worth its own test: the default runner theme is not guaranteed, and the
    // dark palette has different colours rather than an automatic inversion —
    // its danger button was the one place white text stopped being readable.
    cy.visitProject('/issues/WEB-1');
    cy.getByTestId('issue-detail').should('be.visible');
    cy.window().then((win) => win.localStorage.setItem('bugboard.theme', 'dark'));
    cy.reload();
    cy.get('html').should('have.attr', 'data-theme', 'dark');

    scan();

    cy.window().then((win) => win.localStorage.setItem('bugboard.theme', 'light'));
  });
});

import { emailFor } from '../support/config';

/**
 * The only spec that drives the login form. Everywhere else uses cy.session via
 * cy.login, which restores a cached session instead of retyping credentials.
 */
describe('signing in', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('signs in and lands on the home page', () => {
    cy.getByTestId('login-email').type(emailFor('admin'));
    cy.env(['adminPassword']).then(({ adminPassword }) => {
      cy.getByTestId('login-password').type(adminPassword, { log: false });
    });
    cy.getByTestId('login-submit').click();

    cy.location('pathname').should('eq', '/');
    cy.getByTestId('home-page').should('be.visible');
    cy.getByTestId('user-menu-name').should('have.text', 'Ada Whitfield');
  });

  it('validates both fields without calling the API', () => {
    cy.intercept('POST', '**/api/auth/login').as('login');

    cy.getByTestId('login-submit').click();

    cy.getByTestId('error-email').should('have.text', 'Email is required.');
    cy.getByTestId('error-password').should('have.text', 'Password is required.');
    // Nothing should have been sent; give it a moment to prove it.
    cy.wait(250);
    cy.get('@login.all').should('have.length', 0);
  });

  it('rejects a malformed email before submitting', () => {
    cy.getByTestId('login-email').type('not-an-email');
    cy.getByTestId('login-password').type('whatever');
    cy.getByTestId('login-submit').click();

    cy.getByTestId('error-email').should('have.text', 'Enter a valid email address.');
  });

  it('surfaces the server message for a wrong password', () => {
    cy.getByTestId('login-email').type(emailFor('admin'));
    cy.getByTestId('login-password').type('definitely-not-it');
    cy.getByTestId('login-submit').click();

    cy.getByTestId('login-error').should('have.text', 'Invalid email or password.').and('have.attr', 'role', 'alert');
  });

  it('disables the button while the request is in flight', () => {
    cy.intercept('POST', '**/api/auth/login', (request) => {
      // Let the real request through, but hold the response back long enough
      // to observe the in-flight state.
      request.continue((response) => {
        response.setDelay(800);
      });
    }).as('login');

    cy.getByTestId('login-email').type(emailFor('admin'));
    cy.env(['adminPassword']).then(({ adminPassword }) => {
      cy.getByTestId('login-password').type(adminPassword, { log: false });
    });
    cy.getByTestId('login-submit').click();

    cy.getByTestId('login-submit').should('be.disabled').and('contain.text', 'Signing in');
    cy.wait('@login');
  });

  it('reports a network failure instead of hanging', () => {
    cy.intercept('POST', '**/api/auth/login', { forceNetworkError: true });

    cy.getByTestId('login-email').type(emailFor('admin'));
    cy.getByTestId('login-password').type('Password123!');
    cy.getByTestId('login-submit').click();

    cy.getByTestId('login-error').should('contain.text', 'Could not reach the server');
  });

  it('fills the form from a demo account button', () => {
    cy.getByTestId(`demo-account-${emailFor('admin')}`).click();

    cy.getByTestId('login-email').should('have.value', emailFor('admin'));
    cy.getByTestId('login-submit').click();
    cy.getByTestId('home-page').should('be.visible');
  });
});

describe('protected routes', () => {
  it('sends an anonymous visitor to the login page', () => {
    cy.visit('/projects/web/issues');

    cy.location('pathname').should('eq', '/login');
  });

  it('returns the visitor to the page they asked for', () => {
    cy.visit('/projects/web/dashboard');
    cy.location('pathname').should('eq', '/login');

    cy.getByTestId('login-email').type(emailFor('admin'));
    cy.getByTestId('login-password').type('Password123!');
    cy.getByTestId('login-submit').click();

    cy.location('pathname').should('eq', '/projects/web/dashboard');
  });

  it('sends a tampered token back to the login page', () => {
    cy.visit('/login');
    cy.window().then((win) => win.localStorage.setItem('bugboard.token', 'tampered.token.value'));

    cy.visit('/projects/web/board');

    cy.location('pathname').should('eq', '/login');
  });
});

describe('signing out', () => {
  it('clears the session and locks the app again', () => {
    cy.login('admin');
    cy.visit('/');

    cy.getByTestId('user-menu').click();
    cy.getByTestId('logout-button').click();

    cy.location('pathname').should('eq', '/login');
    cy.window().its('localStorage.bugboard\\.token').should('not.exist');

    cy.visit('/projects/web/board');
    cy.location('pathname').should('eq', '/login');
  });
});

import { api, createIssue, deleteIssue, project, resetDatabase, tokenFor } from './api';
import type { Issue, IssueInput, Persona } from './types';

/**
 * Signs in by putting a token where the app expects it, cached by cy.session.
 *
 * The login form is exercised properly in auth.cy.ts. Everywhere else, driving
 * it first would test the same three fields a hundred times and slow every
 * spec down for nothing.
 */
Cypress.Commands.add('login', (persona: Persona = 'admin') => {
  cy.session(
    ['bugboard', persona],
    () => {
      tokenFor(persona).then((token) => {
        // localStorage belongs to an origin, so the app has to be loaded first.
        cy.visit('/login');
        cy.window().then((win) => win.localStorage.setItem('bugboard.token', token));
      });
    },
    {
      validate() {
        cy.window().then((win) => expect(win.localStorage.getItem('bugboard.token')).to.be.a('string'));
      },
      cacheAcrossSpecs: true,
    },
  );
});

Cypress.Commands.add('logout', () => {
  cy.window().then((win) => win.localStorage.removeItem('bugboard.token'));
});

/** The app tags everything a test needs with data-testid; this is the only selector specs use. */
Cypress.Commands.add('getByTestId', (testId: string, options?: Partial<Cypress.Loggable>) =>
  cy.get(`[data-testid="${testId}"]`, options),
);

Cypress.Commands.add(
  'findByTestId',
  { prevSubject: 'element' },
  (subject: JQuery<HTMLElement>, testId: string) => cy.wrap(subject).find(`[data-testid="${testId}"]`),
);

Cypress.Commands.add('apiRequest', (method: Cypress.HttpMethod, path: string, body?: unknown, persona?: Persona) =>
  api(method, path, body, persona),
);

Cypress.Commands.add('seedIssue', (input: IssueInput, projectKey?: string, persona?: Persona) =>
  createIssue(input, projectKey ?? project(), persona),
);

Cypress.Commands.add('removeIssue', (key: string) => deleteIssue(key));

Cypress.Commands.add('resetDatabase', () => resetDatabase());

/** Opens a page inside a project without every spec assembling the URL itself. */
Cypress.Commands.add('visitProject', (suffix = '/board', projectKey = project()) =>
  cy.visit(`/projects/${projectKey.toLowerCase()}${suffix}`),
);

/**
 * Asserts every match carries the same attribute value, and keeps retrying.
 *
 * The obvious `cy.get(...).each()` snapshots the elements first and then walks
 * them, so a list that refetches underneath — which every filter here does —
 * fails on a stale element. `should()` with a callback re-queries and retries
 * the whole assertion instead.
 */
Cypress.Commands.add('assertEveryAttribute', (selector: string, attribute: string, value: string) => {
  cy.get(selector).should(($elements) => {
    expect($elements.length, `${selector} matched something`).to.be.greaterThan(0);
    $elements.each((_, element) => {
      expect(element.getAttribute(attribute), `${selector} [${attribute}]`).to.eq(value);
    });
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      login(persona?: Persona): Chainable<void>;
      logout(): Chainable<void>;
      getByTestId(testId: string, options?: Partial<Loggable>): Chainable<JQuery<HTMLElement>>;
      findByTestId(testId: string): Chainable<JQuery<HTMLElement>>;
      apiRequest<T = unknown>(
        method: HttpMethod,
        path: string,
        body?: unknown,
        persona?: Persona,
      ): Chainable<Response<T>>;
      seedIssue(input: IssueInput, projectKey?: string, persona?: Persona): Chainable<Issue>;
      removeIssue(key: string): Chainable<Response<unknown>>;
      resetDatabase(): Chainable<Response<unknown>>;
      visitProject(suffix?: string, projectKey?: string): Chainable<AUTWindow>;
      assertEveryAttribute(selector: string, attribute: string, value: string): Chainable<JQuery<HTMLElement>>;
    }
  }
}

export {};

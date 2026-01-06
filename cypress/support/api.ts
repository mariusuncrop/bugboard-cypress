import { apiUrl, emailFor, passwordFor, project } from './config';
import type { Issue, IssueInput, Persona, Project } from './types';

/** Tokens are cached per persona so arranging state costs one login, not one per call. */
const tokens = new Map<Persona, string>();

export function tokenFor(persona: Persona): Cypress.Chainable<string> {
  const cached = tokens.get(persona);
  if (cached) return cy.wrap(cached, { log: false });

  return passwordFor(persona)
    .then((password) =>
      cy.request({
        method: 'POST',
        url: `${apiUrl()}/api/auth/login`,
        body: { email: emailFor(persona), password },
      }),
    )
    .then((response) => {
      const token = response.body.token as string;
      tokens.set(persona, token);
      return token;
    });
}

/**
 * An authenticated request straight to the API.
 *
 * Arranging state over HTTP keeps a spec about the behaviour it is actually
 * testing: creating an issue through the form takes seconds and fails in ways
 * that have nothing to do with the assertion underneath.
 */
export function api<T = unknown>(
  method: Cypress.HttpMethod,
  path: string,
  body?: unknown,
  persona: Persona = 'admin',
): Cypress.Chainable<Cypress.Response<T>> {
  return tokenFor(persona).then((token) =>
    cy.request<T>({
      method,
      url: `${apiUrl()}${path}`,
      body: body as Cypress.RequestBody,
      headers: { Authorization: `Bearer ${token}` },
      failOnStatusCode: false,
    }),
  );
}

export { project };

export function createIssue(
  input: IssueInput,
  projectKey = project(),
  persona: Persona = 'admin',
): Cypress.Chainable<Issue> {
  return api<{ issue: Issue }>('POST', `/api/projects/${projectKey}/issues`, { type: 'bug', ...input }, persona).then(
    (response) => {
      expect(response.status, `created an issue in ${projectKey}`).to.eq(201);
      return response.body.issue;
    },
  );
}

/** Cleanup: the response is passed through so a caller can assert on it if it cares. */
export function deleteIssue(key: string) {
  return api('DELETE', `/api/issues/${key}`);
}

export function getProject(key: string): Cypress.Chainable<Project> {
  return api<{ project: Project }>('GET', `/api/projects/${key}`).then((response) => response.body.project);
}

/** Restores the app's deterministic seed fixture. */
export function resetDatabase() {
  return cy.request('POST', `${apiUrl()}/api/test/reset`).then((response) => {
    // Tokens outlive a reset in principle, but the users are rebuilt, so drop
    // them rather than reasoning about whether they still resolve.
    tokens.clear();
    return response;
  });
}

/** A title no other spec could collide with, and one a human can trace back. */
export const uniqueTitle = (prefix: string) =>
  `${prefix} ${Cypress._.random(1e6, 1e7 - 1).toString(36)}${Date.now().toString(36).slice(-4)}`;

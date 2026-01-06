import type { Persona } from './types';

/** Non-secret configuration, readable synchronously. */
export const apiUrl = (): string => Cypress.expose('apiUrl');
export const project = (): string => Cypress.expose('project');
export const emailFor = (persona: Persona): string =>
  Cypress.expose(persona === 'admin' ? 'adminEmail' : 'memberEmail');

/** Passwords live in `env`, so they only come back through a command. */
export const passwordFor = (persona: Persona): Cypress.Chainable<string> =>
  cy.env([persona === 'admin' ? 'adminPassword' : 'memberPassword']).then(
    (values) => Object.values(values)[0] as string,
  );

import type { AxeResults, ElementContext, Result, RunOptions } from 'axe-core';

/**
 * Runs axe-core inside the application window.
 *
 * cypress-axe would normally do this, but it has no release supporting Cypress
 * 16 — its peer range stops at 15, so `npm ci` refuses to install. Driving
 * axe-core directly is a handful of lines, works on any Cypress version, and
 * removes a dependency that has to keep up with two projects at once.
 */
Cypress.Commands.add('injectAxe', () => {
  cy.readFile('node_modules/axe-core/axe.min.js', { log: false }).then((source: string) => {
    cy.window({ log: false }).then((win) => {
      win.eval(source);
    });
  });
});

/** Prints each violation with the element it is on: "3 violations found" is not actionable. */
function report(violations: Result[]): void {
  const lines = violations.flatMap((violation) => [
    `${violation.id} (${violation.impact}) × ${violation.nodes.length}: ${violation.help}`,
    ...violation.nodes.map((node) => `    ${node.target.join(' ')}\n      ${node.failureSummary ?? ''}`),
  ]);
  cy.task('log', lines.join('\n'), { log: false });
}

Cypress.Commands.add('checkAccessibility', (context?: ElementContext, options?: RunOptions) => {
  cy.window({ log: false }).then((win) =>
    // @ts-expect-error axe is attached to the window by the injection above.
    cy.wrap(win.axe.run(context ?? win.document, options ?? {}), { log: false, timeout: 20_000 }),
  ).then((results) => {
    const { violations } = results as unknown as AxeResults;
    if (violations.length > 0) report(violations);

    expect(
      violations.length,
      `accessibility violations: ${violations.map((violation) => violation.id).join(', ') || 'none'}`,
    ).to.equal(0);
  });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      injectAxe(): Chainable<void>;
      checkAccessibility(context?: ElementContext, options?: RunOptions): Chainable<void>;
    }
  }
}

export {};

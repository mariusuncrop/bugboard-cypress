import { uniqueTitle } from '../support/api';

describe('the issue list', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('pages through ten issues at a time', () => {
    cy.visitProject('/issues?sort=createdAt&order=asc');

    cy.get('[data-testid^="issue-row-"]').should('have.length', 10);
    cy.getByTestId('pagination-prev').should('be.disabled');
    cy.getByTestId('pagination-info').should('contain.text', 'Page 1 of');

    cy.get('[data-testid^="issue-row-"]')
      .then(($rows) => Cypress._.map($rows.toArray(), (row) => row.dataset.issueKey))
      .then((firstPage) => {
        cy.getByTestId('pagination-next').click();
        cy.getByTestId('pagination-info').should('contain.text', 'Page 2 of');

        cy.get('[data-testid^="issue-row-"]').should(($rows) => {
          const secondPage = Cypress._.map($rows.toArray(), (row) => row.dataset.issueKey);
          expect(Cypress._.intersection(firstPage, secondPage), 'pages must not repeat').to.be.empty;
        });
      });
  });

  it('keeps the page in the URL for the back button', () => {
    cy.visitProject('/issues');
    cy.getByTestId('pagination-next').click();
    cy.location('search').should('contain', 'page=2');

    cy.go('back');

    cy.location('search').should('not.contain', 'page=2');
    cy.getByTestId('pagination-info').should('contain.text', 'Page 1 of');
  });

  it('searches by title', () => {
    cy.seedIssue({ title: uniqueTitle('Searchable row') }).then((issue) => {
      cy.visitProject('/issues');

      cy.getByTestId('issues-search').type(issue.title);

      cy.get('[data-testid^="issue-row-"]').should('have.length', 1);
      cy.getByTestId(`issue-row-${issue.key}`).should('contain.text', issue.title);
      cy.removeIssue(issue.key);
    });
  });

  it('says so when nothing matches', () => {
    cy.visitProject('/issues');

    cy.getByTestId('issues-search').type('zzz-nothing-matches-this-zzz');

    cy.getByTestId('issues-empty').should('have.text', 'No issues match these filters.');
    cy.getByTestId('issues-table').should('not.exist');
  });

  it('filters by status', () => {
    cy.visitProject('/issues');

    cy.getByTestId('filter-status').select('done');

    cy.assertEveryAttribute('[data-testid="issues-table"] [data-testid="status-badge"]', 'data-status', 'done');
  });

  it('combines several filters, all of them in the URL', () => {
    cy.visitProject('/issues');

    cy.getByTestId('filter-status').select('done');
    cy.getByTestId('filter-type').select('task');

    cy.location('search').should('contain', 'status=done').and('contain', 'type=task');
    cy.assertEveryAttribute('[data-testid="issues-table"] [data-testid="type-badge"]', 'data-type', 'task');
  });

  it('restores filters from the URL', () => {
    cy.visitProject('/issues?priority=critical');

    cy.getByTestId('filter-priority').should('have.value', 'critical');
    cy.assertEveryAttribute(
      '[data-testid="issues-table"] [data-testid="priority-badge"]',
      'data-priority',
      'critical',
    );
  });

  it('narrows by label, and a second label widens the result', () => {
    const label = `cy-${Cypress._.random(1e5, 1e6 - 1).toString(36)}`;
    const other = `cy-${Cypress._.random(1e5, 1e6 - 1).toString(36)}`;

    cy.seedIssue({ title: uniqueTitle('First label'), labels: [label] }).then((first) => {
      cy.seedIssue({ title: uniqueTitle('Second label'), labels: [other] }).then((second) => {
        cy.visitProject('/issues');

        cy.getByTestId(`label-filter-${label}`).click();
        cy.get('[data-testid^="issue-row-"]').should('have.length', 1);

        cy.getByTestId(`label-filter-${other}`).click();
        cy.get('[data-testid^="issue-row-"]').should('have.length', 2);

        cy.removeIssue(first.key);
        cy.removeIssue(second.key);
      });
    });
  });

  it('assigns a row in place', () => {
    cy.seedIssue({ title: uniqueTitle('Assign from the list') }).then((issue) => {
      cy.visitProject('/issues');
      cy.getByTestId('issues-search').type(issue.title);

      cy.getByTestId(`assign-${issue.key}`).select('usr_qa');

      cy.getByTestId('toast').should('contain.text', 'assigned to Priya Natarajan');
      cy.getByTestId(`assign-${issue.key}`).should('have.value', 'usr_qa');
      cy.removeIssue(issue.key);
    });
  });

  it('reports a failed request rather than showing an empty table', () => {
    cy.intercept('GET', '**/issues?*', { statusCode: 500, body: {} }).as('issues');

    cy.visitProject('/issues');

    cy.getByTestId('toast').should('contain.text', 'Could not load issues.');
  });

  it('shows a loading state before the rows arrive', () => {
    cy.intercept('GET', '**/issues?*', (request) => {
      request.continue((response) => {
        response.setDelay(600);
      });
    });

    cy.visitProject('/issues');

    cy.getByTestId('issues-loading').should('be.visible');
    cy.getByTestId('issues-table').should('be.visible');
    cy.getByTestId('issues-loading').should('not.exist');
  });
});

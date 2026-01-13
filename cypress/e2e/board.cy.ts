import { uniqueTitle } from '../support/api';

describe('the board', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('renders every column with a count matching its cards', () => {
    cy.visitProject('/board');

    for (const status of ['backlog', 'todo', 'in_progress', 'in_review', 'done']) {
      cy.getByTestId(`column-${status}`)
        .find('[data-issue-key]')
        .then((cards) => {
          cy.getByTestId(`column-count-${status}`).should('have.text', String(cards.length));
        });
    }
  });

  it('shows a card with its key, title and priority', () => {
    cy.apiRequest<{ issue: { key: string; title: string; priority: string } }>('GET', '/api/issues/WEB-1').then(
      ({ body }) => {
        cy.visitProject('/board');

        cy.getByTestId(`issue-card-${body.issue.key}`).within(() => {
          cy.getByTestId('issue-card-key').should('have.text', body.issue.key);
          cy.getByTestId('issue-card-title').should('have.text', body.issue.title);
          cy.getByTestId('priority-badge').should('have.attr', 'data-priority', body.issue.priority);
        });
      },
    );
  });

  it('moves a card to another column', () => {
    cy.seedIssue({ title: uniqueTitle('Moving card') }).then((issue) => {
      cy.intercept('POST', `**/api/issues/${issue.key}/move`).as('move');
      cy.visitProject('/board');

      cy.getByTestId(`move-${issue.key}`).select('in_progress');

      cy.wait('@move').its('response.statusCode').should('eq', 200);
      cy.getByTestId('toast').should('contain.text', `${issue.key} moved to In progress`);
      cy.getByTestId('column-in_progress').findByTestId(`issue-card-${issue.key}`).should('be.visible');
      cy.getByTestId('column-backlog').find(`[data-testid="issue-card-${issue.key}"]`).should('not.exist');

      cy.removeIssue(issue.key);
    });
  });

  it('keeps a move after a reload', () => {
    cy.seedIssue({ title: uniqueTitle('Durable move') }).then((issue) => {
      cy.visitProject('/board');
      cy.getByTestId(`move-${issue.key}`).select('in_review');
      cy.getByTestId('column-in_review').findByTestId(`issue-card-${issue.key}`).should('be.visible');

      cy.reload();

      cy.getByTestId('column-in_review').findByTestId(`issue-card-${issue.key}`).should('be.visible');
      cy.removeIssue(issue.key);
    });
  });

  it('assigns a card without leaving the board', () => {
    cy.seedIssue({ title: uniqueTitle('Needs an owner') }).then((issue) => {
      cy.visitProject('/board');

      cy.getByTestId(`assign-${issue.key}`).select('usr_dev');

      cy.getByTestId('toast').should('contain.text', 'assigned to Marco Reyes');
      cy.apiRequest<{ issue: { assigneeId: string } }>('GET', `/api/issues/${issue.key}`)
        .its('body.issue.assigneeId')
        .should('eq', 'usr_dev');
      cy.removeIssue(issue.key);
    });
  });

  it('changes priority from the card', () => {
    cy.seedIssue({ title: uniqueTitle('Wrong priority') }).then((issue) => {
      cy.visitProject('/board');

      cy.getByTestId(`priority-${issue.key}`).select('critical');

      cy.getByTestId(`issue-card-${issue.key}`)
        .findByTestId('priority-badge')
        .should('have.attr', 'data-priority', 'critical');
      cy.removeIssue(issue.key);
    });
  });

  it('filters to one person with the assignee chips', () => {
    cy.visitProject('/board');

    cy.getByTestId('assignee-chip-usr_dev').click();

    cy.getByTestId('assignee-chip-usr_dev').should('have.attr', 'aria-pressed', 'true');
    cy.assertEveryAttribute('[data-testid="board"] [data-testid="avatar"]', 'data-user-id', 'usr_dev');
  });

  it('searches the board', () => {
    cy.seedIssue({ title: uniqueTitle('Findable on the board') }).then((issue) => {
      cy.visitProject('/board');

      cy.getByTestId('board-search').type(issue.title);

      cy.location('search').should('contain', 'q=');
      cy.getByTestId('board').find('[data-issue-key]').should('have.length', 1);
      cy.getByTestId(`issue-card-${issue.key}`).should('be.visible');
      cy.removeIssue(issue.key);
    });
  });

  it('filters by type', () => {
    cy.visitProject('/board');

    cy.getByTestId('board-filter-type').select('task');

    cy.assertEveryAttribute('[data-testid="board"] [data-testid="type-badge"]', 'data-type', 'task');
  });

  it('opens an issue from its card', () => {
    cy.seedIssue({ title: uniqueTitle('Clickable card') }).then((issue) => {
      cy.visitProject('/board');

      cy.getByTestId(`issue-card-${issue.key}`).findByTestId('issue-card-title').click();

      cy.location('pathname').should('eq', `/projects/web/issues/${issue.key}`);
      cy.removeIssue(issue.key);
    });
  });
});

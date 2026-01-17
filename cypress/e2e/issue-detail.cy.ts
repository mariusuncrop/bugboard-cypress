import { uniqueTitle } from '../support/api';
import { daysFromToday } from '../support/dates';

describe('an issue', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('shows what the API holds for it', () => {
    cy.apiRequest<{ issue: { key: string; title: string; status: string; priority: string } }>(
      'GET',
      '/api/issues/WEB-1',
    ).then(({ body }) => {
      cy.visitProject('/issues/WEB-1');

      cy.getByTestId('issue-key').should('have.text', body.issue.key);
      cy.getByTestId('issue-title').should('have.text', body.issue.title);
      cy.getByTestId('issue-status-select').should('have.value', body.issue.status);
      cy.getByTestId('issue-priority-select').should('have.value', body.issue.priority);
    });
  });

  it('changes status, priority and assignee', () => {
    cy.seedIssue({ title: uniqueTitle('Editable') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('issue-status-select').select('in_review');
      cy.getByTestId('toast').should('contain.text', 'Status updated.');

      cy.getByTestId('issue-priority-select').select('critical');
      cy.getByTestId('issue-assignee-select').select('Marco Reyes');
      cy.getByTestId('issue-assignee').should('contain.text', 'Marco Reyes');

      cy.apiRequest<{ issue: { status: string; priority: string; assigneeId: string } }>(
        'GET',
        `/api/issues/${issue.key}`,
      ).then(({ body }) => {
        expect(body.issue).to.include({ status: 'in_review', priority: 'critical', assigneeId: 'usr_dev' });
      });

      cy.removeIssue(issue.key);
    });
  });

  it('adds a comment and clears the box', () => {
    cy.seedIssue({ title: uniqueTitle('Worth discussing') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);
      cy.getByTestId('comment-list').should('contain.text', 'No comments yet.');

      cy.getByTestId('comment-body').type('Reproduced on the latest build.');
      cy.getByTestId('comment-submit').click();

      cy.getByTestId('toast').should('contain.text', 'Comment added.');
      cy.getByTestId('comment-list').should('contain.text', 'Reproduced on the latest build.');
      cy.getByTestId('comment-body').should('have.value', '');
      cy.removeIssue(issue.key);
    });
  });

  it('rejects a comment that is too short', () => {
    cy.seedIssue({ title: uniqueTitle('Short comment') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('comment-body').type('x');
      cy.getByTestId('comment-submit').click();

      cy.getByTestId('error-comment').should('have.text', 'A comment needs at least 2 characters.');
      cy.removeIssue(issue.key);
    });
  });

  it('sets a deadline, coloured by how close it is', () => {
    cy.seedIssue({ title: uniqueTitle('With a deadline') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);
      cy.getByTestId('issue-side').find('[data-testid="due-badge"]').should('not.exist');

      cy.getByTestId('issue-due-on').type(daysFromToday(2));

      cy.getByTestId('issue-side')
        .findByTestId('due-badge')
        .should('have.attr', 'data-due-state', 'soon')
        .and('have.text', '2d left');
      cy.removeIssue(issue.key);
    });
  });

  it('shows a not-found page for a key that does not exist', () => {
    cy.visitProject('/issues/WEB-999999');

    cy.getByTestId('issue-not-found').should('be.visible').and('contain.text', 'WEB-999999');
  });

  it('confirms before deleting, and can be cancelled', () => {
    cy.seedIssue({ title: uniqueTitle('Nearly deleted') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('delete-issue').click();
      cy.getByTestId('confirm-dialog').should('be.visible').and('have.attr', 'aria-modal', 'true');
      cy.getByTestId('confirm-cancel').click();

      cy.getByTestId('confirm-dialog').should('not.exist');
      cy.apiRequest('GET', `/api/issues/${issue.key}`).its('status').should('eq', 200);
      cy.removeIssue(issue.key);
    });
  });

  it('deletes and returns to the list', () => {
    cy.seedIssue({ title: uniqueTitle('Going away') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('delete-issue').click();
      cy.getByTestId('confirm-accept').click();

      cy.location('pathname').should('eq', '/projects/web/issues');
      cy.apiRequest('GET', `/api/issues/${issue.key}`).its('status').should('eq', 404);
    });
  });
});

describe('an issue as a member', () => {
  beforeEach(() => {
    cy.login('member');
  });

  it('cannot delete, and is told why', () => {
    cy.seedIssue({ title: uniqueTitle('Member view') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('delete-issue').should('not.exist');
      cy.getByTestId('delete-issue-hint').should('have.text', 'Only admins can delete issues.');
      cy.removeIssue(issue.key);
    });
  });
});

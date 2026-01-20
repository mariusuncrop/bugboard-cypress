import { uniqueTitle } from '../support/api';
import { daysFromToday } from '../support/dates';

describe('the home page', () => {
  it('is where signing in lands you', () => {
    cy.login('admin');
    cy.visit('/');

    cy.getByTestId('home-page').should('be.visible');
    cy.contains('h1', 'Hello, Ada').should('be.visible');
  });

  it('agrees with itself', () => {
    cy.login('admin');
    cy.visit('/');

    cy.getByTestId('home-projects')
      .find('li[data-testid^="home-project-"]')
      .then(($rows) => {
        cy.getByTestId('home-stat-projects').find('.stat__value').should('have.text', String($rows.length));
      });
  });

  it('links on to the full project list', () => {
    cy.login('admin');
    cy.visit('/');

    cy.getByTestId('home-all-projects').click();

    cy.location('pathname').should('eq', '/projects');
  });
});

describe('the home page as a member', () => {
  beforeEach(() => {
    cy.login('member');
  });

  it('lists only the projects they are on', () => {
    cy.visit('/');

    cy.getByTestId('home-project-WEB').should('be.visible');
    cy.getByTestId('home-project-MOB').should('not.exist');
  });

  it('shows their work and nobody else’s', () => {
    cy.seedIssue({ title: uniqueTitle('Marco’s own'), assigneeId: 'usr_dev' }).then((mine) => {
      cy.seedIssue({ title: uniqueTitle('Priya’s own'), assigneeId: 'usr_qa' }).then((theirs) => {
        cy.visit('/');

        cy.getByTestId(`home-issue-${mine.key}`).should('be.visible');
        cy.getByTestId(`home-issue-${theirs.key}`).should('not.exist');

        cy.removeIssue(mine.key);
        cy.removeIssue(theirs.key);
      });
    });
  });

  it('puts the soonest deadline first', () => {
    cy.visit('/');

    cy.getByTestId('home-assigned-list')
      .find('[data-testid="due-badge"]')
      .then(($badges) => {
        const dates = Cypress._.map($badges.toArray(), (badge) => badge.dataset.dueOn ?? '');
        expect(dates, 'soonest first').to.deep.equal([...dates].sort());
      });
  });

  it('opens an assigned issue in its own project', () => {
    cy.seedIssue({ title: uniqueTitle('Openable from home'), assigneeId: 'usr_dev' }).then((issue) => {
      cy.visit('/');

      cy.getByTestId(`home-issue-${issue.key}`).findByTestId('home-issue-key').click();

      cy.location('pathname').should('eq', `/projects/web/issues/${issue.key}`);
      cy.removeIssue(issue.key);
    });
  });
});

describe('what the home page reflects', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('shows newly assigned work, coloured by urgency', () => {
    cy.seedIssue({
      title: uniqueTitle('Freshly mine'),
      assigneeId: 'usr_admin',
      dueOn: daysFromToday(-2),
    }).then((issue) => {
      cy.visit('/');

      cy.getByTestId(`home-issue-${issue.key}`)
        .findByTestId('due-badge')
        .should('have.attr', 'data-due-state', 'overdue');
      cy.removeIssue(issue.key);
    });
  });

  it('drops an issue off the list once it is done', () => {
    cy.seedIssue({ title: uniqueTitle('About to finish'), assigneeId: 'usr_admin' }).then((issue) => {
      cy.visit('/');
      cy.getByTestId(`home-issue-${issue.key}`).should('be.visible');

      cy.apiRequest('PATCH', `/api/issues/${issue.key}`, { status: 'done' });
      cy.visit('/');

      cy.getByTestId(`home-issue-${issue.key}`).should('not.exist');
      cy.removeIssue(issue.key);
    });
  });
});

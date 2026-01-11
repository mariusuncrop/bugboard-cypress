import { project } from '../support/config';

describe('the project list', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('shows every project to an admin', () => {
    cy.visit('/projects');

    cy.getByTestId('project-list').should('be.visible');
    for (const key of ['WEB', 'API', 'MOB']) {
      cy.getByTestId(`project-card-${key}`).should('be.visible');
    }
    cy.getByTestId('new-project-button').should('be.visible');
  });

  it('counts what is in each project', () => {
    cy.apiRequest<{ project: { issueCount: number; memberCount: number } }>('GET', '/api/projects/MOB').then(
      ({ body }) => {
        cy.visit('/projects');
        cy.getByTestId('project-card-MOB')
          .findByTestId('project-card-counts')
          .should('contain.text', `${body.project.issueCount} issues`)
          .and('contain.text', `${body.project.memberCount} members`);
      },
    );
  });

  it('opens a project on its board', () => {
    cy.visit('/projects');

    cy.getByTestId('project-card-API').findByTestId('project-card-name').click();

    cy.location('pathname').should('eq', '/projects/api/board');
    cy.getByTestId('board').should('be.visible');
  });
});

describe('the project list as a member', () => {
  beforeEach(() => {
    cy.login('member');
  });

  it('hides projects they are not on', () => {
    cy.visit('/projects');

    cy.getByTestId('project-card-WEB').should('exist');
    cy.getByTestId('project-card-MOB').should('not.exist');
  });

  it('offers no way to create one', () => {
    cy.visit('/projects');

    cy.getByTestId('new-project-button').should('not.exist');
  });

  it('turns them away from a project they cannot see', () => {
    cy.visit('/projects/mob/settings');

    cy.getByTestId('project-not-found').should('be.visible');
  });

  it('redirects them away from the create page', () => {
    cy.visit('/projects/new');

    cy.location('pathname').should('eq', '/projects');
  });
});

describe('creating a project', () => {
  const key = () => `C${Cypress._.random(1e5, 1e6 - 1).toString(36).toUpperCase()}`;

  beforeEach(() => {
    cy.login('admin');
  });

  it('creates one and opens its board', () => {
    const projectKey = key();
    cy.visit('/projects/new');

    cy.getByTestId('project-key').type(projectKey);
    cy.getByTestId('project-name').type('Made by Cypress');
    cy.getByTestId('project-submit').click();

    cy.getByTestId('toast').should('contain.text', `${projectKey} created.`);
    cy.location('pathname').should('eq', `/projects/${projectKey.toLowerCase()}/board`);
  });

  it('refuses a key that could not prefix an issue', () => {
    cy.visit('/projects/new');

    cy.getByTestId('project-key').type('1');
    cy.getByTestId('project-name').type('Bad key project');
    cy.getByTestId('project-submit').click();

    cy.getByTestId('error-key').should('contain.text', '2 to 6 letters or digits');
    cy.location('pathname').should('eq', '/projects/new');
  });

  it('surfaces a duplicate key rejected by the server', () => {
    cy.visit('/projects/new');

    cy.getByTestId('project-key').type(project());
    cy.getByTestId('project-name').type('Clashing project');
    cy.getByTestId('project-submit').click();

    cy.getByTestId('error-key').should('contain.text', 'already in use');
  });
});

describe('managing members', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('adds someone and then removes them', () => {
    const projectKey = `M${Cypress._.random(1e5, 1e6 - 1).toString(36).toUpperCase()}`;
    cy.apiRequest('POST', '/api/projects', { key: projectKey, name: 'Membership through the UI' });

    cy.visit(`/projects/${projectKey.toLowerCase()}/settings`);
    cy.getByTestId('member-list').find('[data-testid^="member-usr_"]').should('have.length', 1);

    cy.getByTestId('member-select').select('usr_qa');
    cy.getByTestId('add-member-button').click();

    cy.getByTestId('toast').should('contain.text', 'Member added.');
    cy.getByTestId('member-usr_qa').should('be.visible');

    cy.getByTestId('remove-member-usr_qa').click();
    cy.getByTestId('confirm-accept').click();

    cy.getByTestId('member-usr_qa').should('not.exist');
  });

  it('warns that removing someone unassigns their work', () => {
    const projectKey = `H${Cypress._.random(1e5, 1e6 - 1).toString(36).toUpperCase()}`;
    cy.apiRequest('POST', '/api/projects', {
      key: projectKey,
      name: 'Handover',
      memberIds: ['usr_qa'],
    });
    cy.seedIssue({ title: 'Work needing a new owner', assigneeId: 'usr_qa' }, projectKey);

    cy.visit(`/projects/${projectKey.toLowerCase()}/settings`);
    cy.getByTestId('remove-member-usr_qa').click();
    cy.getByTestId('confirm-accept').click();

    cy.getByTestId('toast').should('contain.text', '1 issue left unassigned');
  });
});

describe('the header project picker', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('is available on pages belonging to no project', () => {
    cy.visit('/');

    cy.getByTestId('project-switcher').should('be.visible');
    cy.getByTestId('project-select').should('have.value', '');
  });

  it('jumps straight to a board', () => {
    cy.visit('/');

    cy.getByTestId('project-select').select('MOB');

    cy.location('pathname').should('eq', '/projects/mob/board');
  });

  it('keeps you on the same kind of page when switching', () => {
    cy.visitProject('/issues');

    cy.getByTestId('project-select').select('API');

    cy.location('pathname').should('eq', '/projects/api/issues');
  });
});

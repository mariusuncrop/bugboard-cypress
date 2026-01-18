import { uniqueTitle } from '../support/api';

describe('attachments', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('uploads a file and lists it against the issue', () => {
    cy.seedIssue({ title: uniqueTitle('Needs evidence') }).then((issue) => {
      cy.intercept('POST', `**/issues/${issue.key}/attachments`).as('upload');
      cy.visitProject(`/issues/${issue.key}`);
      cy.getByTestId('attachment-list').should('contain.text', 'Nothing attached yet.');

      cy.getByTestId('attachment-input').selectFile('cypress/fixtures/repro-steps.txt');

      cy.wait('@upload').its('response.statusCode').should('eq', 201);
      cy.getByTestId('toast').should('contain.text', 'repro-steps.txt uploaded.');
      cy.getByTestId('attachment-repro-steps.txt').should('be.visible');
      cy.removeIssue(issue.key);
    });
  });

  it('uploads several files dropped onto the card', () => {
    cy.seedIssue({ title: uniqueTitle('Dropped on') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('attachment-dropzone').selectFile(
        ['cypress/fixtures/repro-steps.txt', 'cypress/fixtures/rows.csv'],
        { action: 'drag-drop' },
      );

      cy.getByTestId('attachment-repro-steps.txt').should('be.visible');
      cy.getByTestId('attachment-rows.csv').should('be.visible');
      cy.removeIssue(issue.key);
    });
  });

  it('highlights the drop zone only while files are over it', () => {
    cy.seedIssue({ title: uniqueTitle('Hover target') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);
      cy.getByTestId('attachment-dropzone').should('have.attr', 'data-active', 'false');

      // The zone only reacts to a drag that carries files, so the transfer has
      // to hold one — an empty DataTransfer reports no types at all.
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(new File(['hovering'], 'hovering.txt', { type: 'text/plain' }));

      cy.getByTestId('attachment-dropzone').trigger('dragenter', { dataTransfer });

      cy.getByTestId('attachment-dropzone').should('have.attr', 'data-active', 'true');

      cy.getByTestId('attachment-dropzone').trigger('dragleave');
      cy.getByTestId('attachment-dropzone').should('have.attr', 'data-active', 'false');
      cy.removeIssue(issue.key);
    });
  });

  it('refuses a file over the size limit before sending it', () => {
    cy.seedIssue({ title: uniqueTitle('Too big') }).then((issue) => {
      cy.intercept('POST', '**/attachments').as('upload');
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('attachment-input').selectFile({
        contents: Cypress.Buffer.alloc(3 * 1024 * 1024, 'a'),
        fileName: 'too-big.txt',
        mimeType: 'text/plain',
      });

      cy.getByTestId('toast').should('contain.text', 'The limit is 2.0 MB.');
      cy.get('@upload.all').should('have.length', 0);
      cy.removeIssue(issue.key);
    });
  });

  it('refuses an unsupported file type', () => {
    cy.seedIssue({ title: uniqueTitle('Wrong type') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);

      cy.getByTestId('attachment-input').selectFile({
        contents: Cypress.Buffer.from('MZ'),
        fileName: 'installer.exe',
        mimeType: 'application/x-msdownload',
      });

      cy.getByTestId('toast').should('contain.text', 'not a supported file type');
      cy.removeIssue(issue.key);
    });
  });

  it('removes an attachment again', () => {
    cy.seedIssue({ title: uniqueTitle('Temporary evidence') }).then((issue) => {
      cy.visitProject(`/issues/${issue.key}`);
      cy.getByTestId('attachment-input').selectFile('cypress/fixtures/rows.csv');
      cy.getByTestId('attachment-rows.csv').should('be.visible');

      cy.getByTestId('remove-attachment-rows.csv').click();

      cy.getByTestId('attachment-list').should('contain.text', 'Nothing attached yet.');
      cy.removeIssue(issue.key);
    });
  });
});

describe('attaching while creating an issue', () => {
  beforeEach(() => {
    cy.login('admin');
  });

  it('files an issue with a file already on it', () => {
    const title = uniqueTitle('Filed with evidence');
    cy.visitProject('/issues/new');

    cy.getByTestId('issue-title').type(title);
    cy.getByTestId('issue-attachment-input').selectFile('cypress/fixtures/repro-steps.txt');
    cy.getByTestId('pending-attachment-repro-steps.txt').should('be.visible');
    cy.getByTestId('issue-submit').click();

    cy.getByTestId('toast').should('contain.text', 'created with 1 file attached');
    cy.getByTestId('attachment-repro-steps.txt').should('be.visible');

    cy.getByTestId('issue-key')
      .invoke('text')
      .then((key) => cy.removeIssue(key));
  });

  it('drops a chosen file before submitting', () => {
    const title = uniqueTitle('Changed my mind');
    cy.visitProject('/issues/new');

    cy.getByTestId('issue-title').type(title);
    cy.getByTestId('issue-attachment-input').selectFile('cypress/fixtures/rows.csv');
    cy.getByTestId('remove-pending-rows.csv').click();

    cy.getByTestId('pending-attachments-empty').should('be.visible');
    cy.getByTestId('issue-submit').click();

    cy.getByTestId('attachment-list').should('contain.text', 'Nothing attached yet.');
    cy.getByTestId('issue-key')
      .invoke('text')
      .then((key) => cy.removeIssue(key));
  });
});

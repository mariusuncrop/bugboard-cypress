# BugBoard end-to-end tests — Cypress

Cypress suite covering [BugBoard](https://github.com/mariusuncrop/bugboard-app): sign-in, projects and membership,
the board, the issue list, an issue's own page, attachments, the home page, and accessibility.

```
82 tests · 8 specs · ~36s headless · Chrome, Firefox and Electron in CI
```

There is a [Playwright suite](https://github.com/mariusuncrop/bugboard-e2e) for the same app. This one is not a
translation of it — the two tools pull in different directions, and writing Cypress the way Playwright wants to be
written produces something worse than either. What that means in practice is in
[Cypress on its own terms](#cypress-on-its-own-terms) below.

## Running it

The suite drives a live instance, so start the app first:

```bash
git clone https://github.com/mariusuncrop/bugboard-app
cd bugboard-app && npm install && npm run dev
```

Then here:

```bash
npm install
npm run cy:open        # pick specs and watch them run
npm run cy:run         # headless, the whole suite
npm run test:firefox   # or a specific browser
```

Point it elsewhere with `BASE_URL` and `API_URL`, or copy
[cypress.env.json.example](cypress.env.json.example) to `cypress.env.json`.

## Cypress on its own terms

### `cy.session` instead of a saved storage file

`cy.login()` wraps [`cy.session`](cypress/support/commands.ts), which caches the browser state under a key and
restores it for every later test — including across spec files. It signs in over the API and writes the token, so
no spec but `auth.cy.ts` touches the login form. The `validate` callback means a session that has gone stale is
rebuilt rather than silently reused.

### `cy.intercept` for the things a request-level assertion cannot see

Three different jobs, all of them awkward without it:

```ts
cy.intercept('POST', '**/api/auth/login').as('login');   // assert it was never sent
cy.intercept('GET', '**/issues?*', (req) => {            // hold a response back
  req.continue((res) => res.setDelay(600));
});
cy.intercept('GET', '**/issues?*', { statusCode: 500 }); // make the server fail
```

That is how the suite covers a loading state, a failed request, and client-side validation that must not reach the
API — none of which a passing request would ever reveal.

### Cypress 16 removed `Cypress.env()`

Most Cypress material still tells you to use it. In 16 it is gone, split in two:

- **`expose`** in the config for anything not secret, read synchronously with `Cypress.expose('apiUrl')`
- **`env`** for secrets, reachable only through the chainable `cy.env(['adminPassword'])`

[`cypress/support/config.ts`](cypress/support/config.ts) is the whole adaptation: URLs and emails are exposed,
passwords are not, so they stay out of the config dump and the runner UI.

### `.should()` with a callback, never `.each()`

The obvious way to assert every row matches something is `cy.get(...).each()`. That snapshots the elements and then
walks them, so a list refetching underneath — which every filter in this app does — fails on an element that no
longer exists. `cy.assertEveryAttribute` uses `should()` with a callback instead, which re-queries and retries the
whole assertion.

### Arranging over the API

Anything a test needs but is not testing is created with `cy.seedIssue` or `cy.apiRequest`, both of which go
straight to the API with a cached token. Creating an issue through the form takes seconds and fails in ways that
have nothing to do with the assertion underneath.

### One reset for the whole run

The app has a reset endpoint, and it is tempting to call it before every test. Specs create and clean up their own
data instead, so a reset between them would only slow the run down and wipe fixtures another spec is still using.

## What it found

The dark theme's danger button was white on `#f87171` — **2.76:1**, against the 4.5:1 small text needs.

It is worth being precise about why this suite caught it and the Playwright one did not: Cypress runs Electron,
which defaulted to dark mode here, while Playwright's default context is light. Nobody had aimed a scan at the dark
palette, and the dark theme is a different set of colours rather than an automatic inversion. Running a second tool
did not find it — running in a different colour scheme did. So there is now a test that scans the dark theme
deliberately, rather than leaving it to whichever browser the runner happens to launch.

## Layout

```
cypress/
  e2e/            One spec per area
  support/
    commands.ts   cy.login, cy.getByTestId, cy.seedIssue, cy.assertEveryAttribute
    api.ts        Authenticated requests, with the token cached per persona
    config.ts     Cypress 16's expose/env split, in one place
    dates.ts      Dates relative to today, never hard-coded
  fixtures/       Files the upload specs attach
```

## Continuous integration

[.github/workflows/e2e.yml](.github/workflows/e2e.yml) checks out the app, starts it, and runs the suite across
Chrome, Firefox and Electron via `cypress-io/github-action`. Screenshots and video are kept on failure.

## Licence

[MIT](LICENSE)

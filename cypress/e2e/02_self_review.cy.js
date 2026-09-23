describe('2. Self-Review Lifecycle (Sprint 1)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('2.1 Manager assigns a self-review with valid details', () => {
    // Intercept eligible users API so Cypress waits for asynchronous data fetch
    cy.intercept('GET', '**/api/users/eligible*').as('getEligible');

    // 1. Log in as Team Manager (Sarah Fernando)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // 2. Navigate to Assign Reviews
    cy.visit(`${VERCEL_URL}/assign-reviews`);
    cy.wait('@getEligible');
    cy.contains('Assign Reviews').should('be.visible');

    // 3. Ensure "Self Review" is selected
    cy.get('select').first().select('self_review');

    // 4. Select an eligible employee from the recipient dropdown
    cy.get('select').eq(1).then(($select) => {
      const enabledOptions = $select.find('option:not([disabled])').filter((_, el) => el.value !== '');
      if (enabledOptions.length > 0) {
        cy.wrap($select).select(enabledOptions.first().val());
        // 5. Submit assignment
        cy.get('button[type="submit"]').contains('Assign Self Review').click();
        // 6. Verify success confirmation message
        cy.contains(/assigned successfully|Self-review assigned/i, { timeout: 8000 }).should('be.visible');
      } else {
        // If all employees already have an assigned self-review for this cycle
        cy.get('p').contains(/All eligible/i).should('be.visible');
      }
    });
  });

  it('2.2 Validate missing self-review target (blocks submission)', () => {
    cy.intercept('GET', '**/api/users/eligible*').as('getEligible');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/assign-reviews`);
    cy.wait('@getEligible');

    cy.get('select').first().select('self_review');

    // Submit without selecting target employee
    cy.get('button[type="submit"]').contains('Assign Self Review').click();

    // Verify validation alert is displayed
    cy.contains(/select an? employee|Please select/i).should('be.visible');
  });

  it('2.3 Employee opens assigned self-review and submits completion', () => {
    cy.intercept('GET', '**/api/tasks/my-tasks*').as('getMyTasks');

    // Log in as Employee (Kavith Perera)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('kavith.perera@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/my-tasks`);
    cy.wait('@getMyTasks');
    cy.contains('My Tasks').should('be.visible');

    // If there is an active review task, open and submit it
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Start Form"), button:contains("Continue Draft")').length > 0) {
        cy.get('button').contains(/Start Form|Continue Draft/).first().click();

        // Fill review response fields
        cy.get('#techSkills').clear().type('Demonstrated strong problem-solving skills, completed automated test suites, and met sprint deliverables.');
        cy.get('#commRating').select('Meets Expectations');
        cy.get('#growthAreas').clear().type('Continue enhancing automated test coverage and cross-team collaboration.');

        cy.get('button[type="submit"]').contains('Submit Review').click();

        // Verify Altrium-styled green success message appears
        cy.contains('Review submitted successfully.', { timeout: 8000 }).should('be.visible');

        // Verify returns to My Tasks with Completed status
        cy.contains('My Tasks', { timeout: 10000 }).should('be.visible');
        cy.contains('Completed').should('be.visible');
      }
    });
  });

  it('2.4 Manager views completed self-reviews in Review Table', () => {
    cy.intercept('GET', '**/api/reviews/subordinates*').as('getSubordinates');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/review-table`);
    cy.wait('@getSubordinates');

    // Verify Review Table loads with table data
    cy.contains('Self & peer review records').should('be.visible');
    cy.contains('Review completion and content').should('be.visible');
    cy.get('table').should('be.visible');
  });
});

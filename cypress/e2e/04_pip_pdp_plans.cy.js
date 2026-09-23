describe('4. PIP and PDP Plan Lifecycle (Sprint 2)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('4.1 Manager assigns a valid PIP plan to a direct report', () => {
    cy.intercept('GET', '**/api/plans/eligible-recipients*').as('getEligibleRecipients');

    // 1. Log in as Team Manager (Sarah Fernando)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // 2. Navigate to Assign PIP / PDP
    cy.visit(`${VERCEL_URL}/assign-plan`);
    cy.wait('@getEligibleRecipients');
    cy.contains('Assign PIP / PDP').should('be.visible');

    // 3. Click "Performance Improvement Plan (PIP)" card
    cy.get('#plan-type-pip').click();

    // 4. Select an eligible recipient from dropdown
    cy.get('select').then(($select) => {
      const opts = $select.find('option:not([disabled])').filter((_, el) => el.value !== '');
      if (opts.length > 0) {
        cy.wrap($select).select(opts.first().val());

        // 5. Enter Plan Title (>= 10 chars, >= 2 words)
        cy.get('input[type="text"]').clear().type('Automated Testing Framework Improvement Plan');

        // 6. Enter Plan Instructions (>= 30 chars)
        cy.get('textarea').clear().type('Complete comprehensive unit and integration test coverage across all assigned microservices modules.');

        // 7. Submit PIP Plan
        cy.get('button[type="submit"]').click();

        // 8. Verify success message
        cy.contains(/successfully assigned|Plan Assigned Successfully/i, { timeout: 8000 }).should('be.visible');
      } else {
        cy.log('All eligible recipients currently assigned for this cycle.');
      }
    });
  });

  it('4.2 Input validation rejects short or gibberish plan title (< 10 chars)', () => {
    cy.intercept('GET', '**/api/plans/eligible-recipients*').as('getEligibleRecipients');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/assign-plan`);
    cy.wait('@getEligibleRecipients');

    // Click PIP card
    cy.get('#plan-type-pip').click();

    // Select recipient
    cy.get('select').then(($select) => {
      const opts = $select.find('option:not([disabled])').filter((_, el) => el.value !== '');
      if (opts.length > 0) {
        cy.wrap($select).select(opts.first().val());

        // Enter invalid short title (< 10 chars)
        cy.get('input[type="text"]').clear().type('Short');

        // Enter instructions
        cy.get('textarea').clear().type('Detailed expected outcome instructions for the performance improvement plan.');

        // Submit form
        cy.get('button[type="submit"]').click();

        // Verify validation error is displayed
        cy.contains(/at least 10 characters long|meaningful/i).should('be.visible');
      }
    });
  });

  it('4.3 Manager views active plans in Assigned Plans table', () => {
    cy.intercept('GET', '**/api/plans/assigned*').as('getAssignedPlans');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/assigned-plans`);
    cy.wait('@getAssignedPlans');

    cy.contains('Assigned PIP & PDP Plans').should('be.visible');
    cy.contains('PIP Plans').should('be.visible');
    cy.contains('PDP Plans').should('be.visible');
  });
});

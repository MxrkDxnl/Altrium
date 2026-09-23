describe('3. 360 Peer Review Workflow (Sprint 1 & 2)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('3.1 Manager assigns 2 distinct peer reviewers for an employee', () => {
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

    // 3. Switch Review Type to "Peer Review"
    cy.get('select').first().select('peer_review');
    cy.wait('@getEligible');

    // Verify "Select Peer Type" is disabled, auto-selected to same_level, and shows "Within Team Members"
    cy.get('select').eq(1).should('be.disabled');
    cy.get('select').eq(1).should('have.value', 'same_level');
    cy.get('select').eq(1).find('option').should('have.length', 1);
    cy.get('select').eq(1).find('option').should('contain', 'Within Team Members');

    // 4. Select an eligible subject to be reviewed
    cy.get('select').eq(2).then(($subjectSelect) => {
      const availableOptions = $subjectSelect.find('option:not([disabled])').filter((_, el) => el.value !== '');

      if (availableOptions.length > 0) {
        const selectedVal = availableOptions.first().val();
        cy.wrap($subjectSelect).select(selectedVal);
        cy.wait('@getEligible');

        // 5. Select Reviewer 1
        cy.get('select').eq(3).find('option').filter((_, el) => el.value !== '').then(($r1Opts) => {
          if ($r1Opts.length > 0) {
            cy.get('select').eq(3).select($r1Opts.first().val());

            // 6. Select Reviewer 2 (auto-excludes Reviewer 1)
            cy.get('select').eq(4).find('option').filter((_, el) => el.value !== '').then(($r2Opts) => {
              if ($r2Opts.length > 0) {
                cy.get('select').eq(4).select($r2Opts.first().val());

                // 7. Submit Peer Review Assignment
                cy.get('button[type="submit"]').contains('Assign Review').click();
                cy.contains(/Peer reviews assigned successfully|assigned successfully/i, { timeout: 8000 }).should('be.visible');
              }
            });
          }
        });
      } else {
        // If all employees already have peer reviewers assigned
        cy.log('All subjects currently assigned for this cycle.');
      }
    });
  });

  it('3.2 Verify Reviewer 2 dropdown prevents duplicate selection of Reviewer 1', () => {
    cy.intercept('GET', '**/api/users/eligible*').as('getEligible');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/assign-reviews`);
    cy.wait('@getEligible');

    cy.get('select').first().select('peer_review');
    cy.wait('@getEligible');

    cy.get('select').eq(2).then(($subjectSelect) => {
      const availableOptions = $subjectSelect.find('option:not([disabled])').filter((_, el) => el.value !== '');
      if (availableOptions.length > 0) {
        cy.wrap($subjectSelect).select(availableOptions.first().val());
        cy.wait('@getEligible');

        // Select first reviewer
        cy.get('select').eq(3).find('option').filter((_, el) => el.value !== '').then(($r1Opts) => {
          if ($r1Opts.length > 0) {
            const r1Val = $r1Opts.first().val();
            cy.get('select').eq(3).select(r1Val);

            // Verify Reviewer 2 dropdown does NOT include the value chosen in Reviewer 1
            cy.get('select').eq(4).find(`option[value="${r1Val}"]`).should('not.exist');
          }
        });
      }
    });
  });

  it('3.3 Appointed peer reviewer opens assigned peer review and submits feedback', () => {
    cy.intercept('GET', '**/api/tasks/my-tasks*').as('getMyTasks');

    // Log in as employee (Kavith Perera)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('kavith.perera@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/my-tasks`);
    cy.wait('@getMyTasks');
    cy.contains('My Tasks').should('be.visible');

    // Check if there is an active peer review task
    cy.get('body').then(($body) => {
      if ($body.find('button:contains("Start Form"), button:contains("Continue Draft")').length > 0) {
        cy.get('button').contains(/Start Form|Continue Draft/).first().click();

        // Fill out review
        cy.get('#techSkills').clear().type('Great code quality, adheres strictly to standards, and excellent collaboration during pair programming.');
        cy.get('#commRating').select('Exceeds Expectations');
        cy.get('#commNotes').clear().type('Always clear and responsive in standups and code reviews.');
        cy.get('#growthAreas').clear().type('Could take on more architecture design leadership.');

        cy.get('button[type="submit"]').contains('Submit Review').click();

        // Verify Altrium-styled green success message appears
        cy.contains('Review submitted successfully.', { timeout: 8000 }).should('be.visible');

        // Verify returns to My Tasks with Completed status
        cy.contains('My Tasks', { timeout: 10000 }).should('be.visible');
        cy.contains('Completed').should('be.visible');
      }
    });
  });

  it('3.4 Manager views completed peer reviews with confidentiality', () => {
    cy.intercept('GET', '**/api/reviews/subordinates*').as('getSubordinates');

    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/review-table`);
    cy.wait('@getSubordinates');

    // Verify Review Table loads with table data and confidentiality badge
    cy.contains('Self & peer review records').should('be.visible');
    cy.contains('Confidential manager access').should('be.visible');
  });

  it('3.5 Verify peer type dropdown remains enabled for Department Manager with multiple options', () => {
    cy.intercept('GET', '**/api/users/eligible*').as('getEligible');

    // Log in as Department Manager (Dinesh Jayawardena)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('dinesh.it@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/assign-reviews`);
    cy.wait('@getEligible');

    cy.get('select').first().select('peer_review');
    cy.wait('@getEligible');

    // Verify "Select Peer Type" dropdown for Department Manager has multiple options and is NOT disabled
    cy.get('select').eq(1).should('not.be.disabled');
    cy.get('select').eq(1).find('option').should('have.length.gt', 1);
  });
});


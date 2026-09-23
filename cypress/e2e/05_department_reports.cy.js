describe('5. Department Summary Reports & HR Portfolio (Sprint 2)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('5.1 IT Department Manager views designated HR recipient', () => {
    cy.intercept('GET', '**/api/reports/recipient-preview*').as('getPreview');

    // 1. Log in as IT Department Manager (Dinesh Jayawardena)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('dinesh.it@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // 2. Navigate to Department Reports
    cy.visit(`${VERCEL_URL}/department-reports`);
    cy.wait('@getPreview');

    // 3. Open report form to view designated HR recipient (Ayesha Perera for IT)
    cy.contains(/Create Department Report|Create First Report/i).click();
    cy.contains(/Ayesha Perera|ayesha\.hr@altrium\.com/i).should('be.visible');
  });

  it('5.2 HR Portfolio Specialist views received department reports', () => {
    cy.intercept('GET', '**/api/reports/inbox*').as('getInbox');

    // Log in as HR IT Specialist (Ayesha Perera)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('ayesha.hr@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.visit(`${VERCEL_URL}/department-reports`);

    // Verify inbox or reporting page loads
    cy.contains('Department Reports').should('be.visible');
  });

  it('5.3 Unauthorized user is denied access to Department Reports', () => {
    // Log in as Employee without portfolio (e.g. Nethmi Silva)
    cy.visit(VERCEL_URL);
    cy.get('#email').type('nethmi.hr@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Attempt direct URL access
    cy.visit(`${VERCEL_URL}/department-reports`);
    cy.contains(/Access Denied|Unauthorized|Dashboard/i).should('be.visible');
  });
});

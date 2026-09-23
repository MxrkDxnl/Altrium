describe('6. Member Management & Access Control Guarding (Sprint 2)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('6.1 Non-admin employee is blocked from accessing /members', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('kavith.perera@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Attempt direct URL access to /members
    cy.visit(`${VERCEL_URL}/members`);
    cy.url().should('not.include', '/members');
    cy.contains('Dashboard').should('be.visible');
  });

  it('6.2 Non-admin manager is blocked from accessing /employee-passwords', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('sarah.software@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Attempt direct URL access to /employee-passwords
    cy.visit(`${VERCEL_URL}/employee-passwords`);
    cy.url().should('not.include', '/employee-passwords');
    cy.contains('Dashboard').should('be.visible');
  });

  it('6.3 Company Executive Manager views organization dashboard & company portfolio', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('anura.company@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.contains(/Operational Manager|Company Manager|Executive/i).should('be.visible');
  });
});

describe('1. Authentication and RBAC Guarding (Sprint 1)', () => {
  const VERCEL_URL = 'https://performance-tracker-opal.vercel.app';

  it('1.1 Valid login with correct credentials', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('dinesh.it@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    // Verify redirected to Dashboard
    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');
    cy.contains('Department Manager').should('be.visible');
  });

  it('1.2 Invalid login credentials display error', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('dinesh.it@altrium.com');
    cy.get('#password').type('wrongpassword');
    cy.get('button[type="submit"]').click();

    cy.contains('Invalid email or password').should('be.visible');
  });

  it('1.3 Password length validation (< 8 characters)', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('dinesh.it@altrium.com');
    cy.get('#password').type('1234');
    cy.get('button[type="submit"]').click();

    cy.contains('Password must contain 8-12 characters.').should('be.visible');
  });

  it('1.4 Role-based navigation guarding (Employee)', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('kavith.perera@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Employee allowed navigation links
    cy.get('nav').within(() => {
      cy.contains('Dashboard').should('be.visible');
      cy.contains('My Tasks').should('be.visible');
      cy.contains('History').should('be.visible');
      cy.contains('Profile Page').should('be.visible');

      // Manager restricted links must NOT be visible to employee
      cy.contains('Assign Reviews').should('not.exist');
      cy.contains('Assign PIP / PDP').should('not.exist');
      cy.contains('Review Table').should('not.exist');
      cy.contains('Assigned Plans').should('not.exist');
      cy.contains('Manage Members').should('not.exist');
    });
  });

  it('1.5 Direct URL navigation guarding for restricted routes', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('kavith.perera@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains('Dashboard', { timeout: 10000 }).should('be.visible');

    // Attempt direct access to admin/manager route
    cy.visit(`${VERCEL_URL}/members`);
    // Should safely redirect to Home / Dashboard
    cy.url().should('not.include', '/members');
    cy.contains('Dashboard').should('be.visible');
  });
});

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

  it('6.4 Admin Add New Member automatically assigns Reporting Manager based on role, department, and team', () => {
    cy.visit(VERCEL_URL);
    cy.get('#email').type('admin@altrium.com');
    cy.get('#password').type('12345678');
    cy.get('button[type="submit"]').click();

    cy.contains(/Dashboard|Member Management|Administrator/i, { timeout: 10000 }).should('be.visible');

    // Navigate to /members
    cy.visit(`${VERCEL_URL}/members`);
    cy.contains('Member Management', { timeout: 10000 }).should('be.visible');

    // Click Add New Member
    cy.contains('button', 'Add New Member').click();
    cy.contains('h2', 'Add New Member').should('be.visible');

    // 1. By default, Employee + IT + Software Development is selected.
    // Verify Sarah Fernando is automatically selected and the field is disabled
    cy.contains('Reporting Manager').should('be.visible');
    cy.contains('Automatically assigned based on role, department, and team.').should('be.visible');
    cy.get('select:disabled').should('contain', 'Sarah Fernando');

    // 2. Change team to Quality Assurance -> automatically switches to Kasun Bandara
    cy.contains('label', 'Team').parent().find('select').select('Quality Assurance');
    cy.get('select:disabled').should('contain', 'Kasun Bandara');

    // 3. Change role to Team Manager for IT -> automatically reports to Department Manager (Danushka Jayawardena)
    cy.contains('label', 'Role').parent().find('select').select('team_manager');
    cy.get('select:disabled').should('contain', 'Danushka Jayawardena');

    // 4. Change role to Administrator -> Top Level / Direct (disabled, None)
    cy.contains('label', 'Role').parent().find('select').select('admin');
    cy.get('select:disabled').should('contain', 'None (Top Level / Direct)');

    // 5. Change role back to Employee + IT + Software Development, fill required fields, and submit
    cy.contains('label', 'Role').parent().find('select').select('employee');
    cy.contains('label', 'Department').parent().find('select').select('IT');
    cy.contains('label', 'Team').parent().find('select').select('Software Development');
    cy.get('select:disabled').should('contain', 'Sarah Fernando');

    const uniqueId = Date.now().toString().slice(-4);
    const testName = `Auto Manager User ${uniqueId}`;
    const testEmail = `auto.mgr.${uniqueId}@altrium.com`;

    cy.contains('label', 'Full Name').parent().find('input').type(testName);
    cy.contains('label', 'Email Address').parent().find('input').type(testEmail);
    cy.contains('label', 'Temporary Password').parent().find('input').type('TempPassword123!');

    // Submit the form
    cy.contains('button', 'Create Member').click();

    // Verify success notification and new member in list with Sarah Fernando as manager
    cy.contains(`Member "${testName}" added successfully.`, { timeout: 10000 }).should('be.visible');
    cy.contains(testName).should('be.visible');
  });
});


const crew = [
  { id: 1, name: 'Ana Vega', role: 'commander', avatar: 'AV', mission_day: 90 },
  { id: 2, name: 'Leo Soler', role: 'crew', avatar: 'LS', mission_day: 90 },
  { id: 3, name: 'Inés Vidal', role: 'crew', avatar: 'IV', mission_day: 90 },
  { id: 4, name: 'Noa Ríos', role: 'crew', avatar: 'NR', mission_day: 90 },
];

const overview = {
  mission_day: 90,
  environment: 'spacecraft_in_transit',
  comms_delay_s: 720,
  crew: crew.map((person) => ({
    id: person.id,
    name: person.name,
    role: person.role,
    avatar: person.avatar,
    overall: 'green',
    active_alert_count: 0,
    checkin_done_today: false,
  })),
};

function stubBootstrap() {
  cy.intercept('GET', '**/health', {
    statusCode: 200,
    body: { status: 'ok', database: 'up', timestamp: new Date().toISOString() },
  }).as('health');
  cy.intercept('GET', '**/api/astronauts', { statusCode: 200, body: crew }).as('astronauts');
  cy.intercept('GET', '**/api/crew/overview', { statusCode: 200, body: overview }).as('overview');
}

function visitCrew() {
  stubBootstrap();
  cy.visit('/');
  cy.wait('@health');
  cy.wait('@astronauts');
  cy.wait('@overview');
  cy.contains('h1', 'Crew health').should('be.visible');
}

describe('SOMA main user flows', () => {
  it('loads the crew dashboard and opens the emergency guide without a PIN', () => {
    visitCrew();

    cy.get('[aria-label="Emergency"]').click();
    cy.get('[role="dialog"][aria-label="Emergency guide"]').should('be.visible');
    cy.contains('h1', 'Who needs help?').should('be.visible');
    cy.contains('button', 'Not sure who').click();
    cy.contains('h1', 'What’s happening?').should('be.visible');
    cy.intercept('POST', '**/api/emergency', (request) => {
      request.reply({
        statusCode: 201,
        body: { event: { id: request.body.id, startedAt: new Date().toISOString() } },
      });
    }).as('createEmergency');
    cy.intercept('POST', '**/api/emergency/*/steps', {
      statusCode: 201,
      body: { step: { id: 'step-1' } },
    }).as('appendEmergencyStep');
    cy.contains('button', 'Chest pain').click();
    cy.wait('@createEmergency').then(({ request }) => {
      expect(request.body.scenario).to.equal('chest_pain');
      expect(request.body.id).to.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });
    cy.contains('h1', 'Is the person responsive?').should('be.visible');
    cy.contains('button', 'Yes').click();
    cy.wait('@appendEmergencyStep');
    cy.contains('h1', 'Stop activity and call the CMO').should('be.visible');
    cy.get('[aria-label="Minimise the emergency guide"]').click();
    cy.get('[role="dialog"][aria-label="Emergency guide"]').should('not.exist');
  });

  it('navigates to environment, medical support and reference sources', () => {
    visitCrew();

    cy.get('[aria-label="Environment"]').click();
    cy.contains('h1', 'Environment').should('be.visible');

    cy.get('[aria-label="Ground support"]').click();
    cy.contains('h1', 'Ground support').should('be.visible');

    cy.intercept('GET', '**/api/sources', { statusCode: 200, body: [] }).as('sources');
    cy.get('[aria-label="Reference library"]').click();
    cy.wait('@sources');
    cy.contains('h1', 'Reference library').should('be.visible');
  });

  it('rejects an incorrect profile PIN with a visible message', () => {
    visitCrew();
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 401,
      body: { error: { code: 'WRONG_PIN', message: 'The PIN is incorrect.' } },
    }).as('login');

    cy.get('[aria-label="Open Ana Vega (code required)"]').click();
    [1, 1, 1, 1].forEach((digit) => cy.get('.keypad').contains('button', String(digit)).click());
    cy.wait('@login');
    cy.get('[role="status"]').should('contain.text', 'The PIN is incorrect.');
  });

  it('unlocks a profile and loads its private health status and check-ins', () => {
    visitCrew();
    cy.intercept('POST', '**/api/auth/login', {
      statusCode: 200,
      body: {
        token: 'e2e-session-token',
        astronaut: { id: 1, name: 'Ana Vega', role: 'commander', avatar: 'AV' },
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      },
    }).as('login');
    cy.intercept('GET', '**/api/astronauts/1/status', {
      statusCode: 200,
      body: { astronaut: crew[0], mission_day: 90, systems: [], active_alerts: [] },
    }).as('status');
    cy.intercept('GET', '**/api/astronauts/1/checkins?days=30', {
      statusCode: 200,
      body: [],
    }).as('checkins');
    cy.intercept('GET', '**/api/astronauts/1/routine', { statusCode: 200, body: [] }).as('routine');
    cy.intercept('GET', '**/api/crew/alerts', { statusCode: 200, body: [] }).as('crewAlerts');

    cy.get('[aria-label="Open Ana Vega (code required)"]').click();
    [1, 1, 1, 1].forEach((digit) => cy.get('.keypad').contains('button', String(digit)).click());

    cy.wait('@login');
    cy.wait('@status');
    cy.wait('@checkins');
    cy.contains('h1', 'Ana Vega').should('be.visible');
    cy.wait('@routine');
    cy.wait('@crewAlerts');
  });
});

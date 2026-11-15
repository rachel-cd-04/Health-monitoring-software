const API_URL = Cypress.expose('apiUrl');
const checkinDay = new Date();
checkinDay.setUTCHours(0, 0, 0, 0);
const day = checkinDay.toISOString();

const emergencyId = '00000000-0000-4000-8000-000000000071';
const stepId = '00000000-0000-4000-8000-000000000072';

function authenticateAstronaut() {
  return cy
    .request('POST', `${API_URL}/api/auth/login`, { astronaut_id: 1, pin: '1111' })
    .its('body.token');
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

describe('Supabase-backed flows (dedicated test project only)', () => {
  it('loads the real crew and unlocks the commander profile', () => {
    cy.visit('/');
    cy.contains('h1', 'Crew health').should('be.visible');
    cy.get('[aria-label="Open Ana Vega (code required)"]').click();
    [1, 1, 1, 1].forEach((digit) => cy.get('.keypad').contains('button', String(digit)).click());
    cy.contains('h1', 'Ana Vega').should('be.visible');
    cy.contains('h3', 'Mission routine').should('be.visible');
    cy.get('.back-link').contains('Crew').click();
    cy.contains('h1', 'Crew health').should('be.visible');
    cy.contains('h3', 'Crew alerts').should('be.visible');
  });

  it('replays a check-in without creating a second row for the same astronaut and day', () => {
    authenticateAstronaut().then((token) => {
      const headers = authHeaders(token);
      const checkin = {
        astronaut_id: 1,
        day,
        heart_rate: 72,
        bp_systolic: 118,
        bp_diastolic: 76,
        blood_sugar: 92,
        temperature: 36.6,
        sleep_hours: 7,
        mood: 4,
        fatigue: 2,
        exercise_min: 90,
        source: 'simulated',
      };

      cy.request({ method: 'POST', url: `${API_URL}/api/checkins`, headers, body: checkin }).then(
        ({ body: first }) => {
          cy.request({
            method: 'POST',
            url: `${API_URL}/api/checkins`,
            headers,
            body: checkin,
          }).then(({ body: replay }) => {
            expect(replay.checkin.id).to.equal(first.checkin.id);
            cy.request({
              url: `${API_URL}/api/astronauts/1/checkins?days=30`,
              headers,
            }).then(({ body: checkins }) => {
              const sameDay = checkins.filter((item) => item.day.slice(0, 10) === day.slice(0, 10));
              expect(sameDay).to.have.length(1);
            });
          });
        },
      );
    });
  });

  it('replays an emergency and its step using stable IDs without duplicates', () => {
    const incident = {
      id: emergencyId,
      patient_id: 1,
      reporter_id: 1,
      scenario: 'other',
      started_at: '2030-01-01T12:00:00.000Z',
    };
    const step = {
      id: stepId,
      step_id: 'cypress-e2e-repeatable-step',
      answer: 'Repeatable test step',
      ts: '2030-01-01T12:01:00.000Z',
    };
    const endedAt = '2030-01-01T12:02:00.000Z';

    cy.request({ method: 'POST', url: `${API_URL}/api/emergency`, body: incident })
      .then(({ body: first }) =>
        cy
          .request({ method: 'POST', url: `${API_URL}/api/emergency`, body: incident })
          .then(({ body: replay }) => {
            expect(replay.event.id).to.equal(first.event.id);
          }),
      )
      .then(() =>
        cy.request({
          method: 'POST',
          url: `${API_URL}/api/emergency/${emergencyId}/steps`,
          body: step,
        }),
      )
      .then(({ body: first }) =>
        cy
          .request({
            method: 'POST',
            url: `${API_URL}/api/emergency/${emergencyId}/steps`,
            body: step,
          })
          .then(({ body: replay }) => {
            expect(replay.step.id).to.equal(first.step.id);
          }),
      )
      .then(() => cy.request(`${API_URL}/api/emergency/${emergencyId}/summary`))
      .then(({ body }) => {
        expect(body.timeline.filter((item) => item.id === stepId)).to.have.length(1);
        return cy.request({
          method: 'PATCH',
          url: `${API_URL}/api/emergency/${emergencyId}/close`,
          body: { ended_at: endedAt },
        });
      })
      .then(() =>
        cy.request({
          method: 'PATCH',
          url: `${API_URL}/api/emergency/${emergencyId}/close`,
          body: { ended_at: endedAt },
        }),
      );
  });
});

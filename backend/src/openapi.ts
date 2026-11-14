const json = (schema: Record<string, unknown>, description = 'JSON response') => ({
  description,
  content: { 'application/json': { schema } },
});

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const errorResponse = (description = 'Request failed') => json(ref('Error'), description);
const secured = [{ bearerAuth: [] }];

export const openapi: Record<string, unknown> = {
  openapi: '3.0.3',
  info: {
    title: 'Astro Health Monitor API',
    version: '1.0.0',
    description: 'Backend API for the synthetic astronaut health-monitoring demo. Values and thresholds are illustrative and not diagnostic.',
  },
  servers: [{ url: '/', description: 'Local backend' }],
  tags: [
    { name: 'Health', description: 'Operational health' },
    { name: 'Auth', description: 'Profile PIN authentication' },
    { name: 'Astronauts', description: 'Private measurements, check-ins, status and routines' },
    { name: 'Crew', description: 'Privacy-safe crew views' },
    { name: 'Alerts', description: 'Alert acknowledgement' },
    { name: 'Emergency', description: 'PIN-free emergency workflow' },
    { name: 'Radiation', description: 'Simulated radiation context' },
    { name: 'Sources', description: 'NASA and mission reference sources' },
    { name: 'Assistant', description: 'Optional bounded LLM assistant (OpenAI-compatible API, NVIDIA NIM by default)' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    parameters: {
      AstronautId: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      ItemId: { name: 'item_id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      AlertId: { name: 'id', in: 'path', required: true, schema: { type: 'integer', minimum: 1 } },
      EventId: { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
    },
    schemas: {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'The request body is invalid.' },
              details: { type: 'object', additionalProperties: true },
            },
          },
        },
      },
      Astronaut: {
        type: 'object',
        required: ['id', 'name', 'role', 'mission_day'],
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Ana Vega' },
          role: { type: 'string', enum: ['crew', 'commander'] },
          avatar: { type: 'string', nullable: true, example: 'AV' },
          mission_day: { type: 'integer', nullable: true, example: 90 },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['astronaut_id', 'pin'],
        properties: {
          astronaut_id: { type: 'integer', minimum: 1, example: 1 },
          pin: { type: 'string', pattern: '^\\d{4}$', example: '1111' },
        },
      },
      LoginResponse: {
        type: 'object',
        required: ['token', 'astronaut', 'expires_at'],
        properties: {
          token: { type: 'string' },
          astronaut: { $ref: '#/components/schemas/Astronaut' },
          expires_at: { type: 'string', format: 'date-time' },
        },
      },
      MeasurementRequest: {
        type: 'object',
        required: ['astronaut_id', 'indicator', 'value', 'unit', 'source'],
        properties: {
          astronaut_id: { type: 'integer', minimum: 1, example: 1 },
          indicator: { type: 'string', enum: ['heart_rate', 'bp_systolic', 'bp_diastolic', 'blood_sugar', 'temperature', 'exercise_min', 'sleep_hours', 'mood', 'fatigue'] },
          value: { type: 'number', example: 72 },
          unit: { type: 'string', example: 'bpm' },
          ts: { type: 'string', format: 'date-time' },
          source: { type: 'string', enum: ['manual', 'simulated', 'sensor'] },
          mission_phase: { type: 'string', enum: ['pre', 'in_flight', 'post'] },
        },
      },
      CheckinRequest: {
        type: 'object',
        required: ['astronaut_id', 'day', 'source'],
        properties: {
          astronaut_id: { type: 'integer', minimum: 1, example: 1 },
          day: { type: 'string', format: 'date', example: '2026-11-14' },
          sleep_hours: { type: 'number', minimum: 0, maximum: 24 },
          mood: { type: 'integer', minimum: 1, maximum: 5 },
          fatigue: { type: 'integer', minimum: 1, maximum: 5 },
          source: { type: 'string', enum: ['manual', 'simulated'] },
        },
      },
      Alert: {
        type: 'object',
        properties: {
          id: { type: 'string', example: '42' },
          astronaut_id: { type: 'integer' },
          rule_id: { type: 'string', example: 'C-02' },
          rule_version: { type: 'integer', example: 1 },
          indicator: { type: 'string' },
          value: { type: 'number', nullable: true },
          level: { type: 'string', enum: ['amber', 'red'] },
          message: { type: 'string' },
          actions: { type: 'array', items: { type: 'string' } },
          who_acts: { type: 'array', items: { type: 'string', enum: ['self', 'crew', 'ground'] } },
          source: { $ref: '#/components/schemas/Source', nullable: true },
          ts: { type: 'string', format: 'date-time' },
          active: { type: 'boolean' },
          illustrative: { type: 'boolean', example: true },
        },
      },
      Source: {
        type: 'object',
        required: ['id', 'agency', 'title', 'url'],
        properties: {
          id: { type: 'string', example: 'nasa-risk-cardio' },
          agency: { type: 'string', example: 'NASA' },
          title: { type: 'string' },
          url: { type: 'string', format: 'uri' },
          doc_type: { type: 'string', nullable: true },
          accessed_on: { type: 'string', format: 'date', nullable: true },
        },
      },
      RoutineItem: {
        type: 'object',
        required: ['id', 'item', 'due_at', 'done', 'overdue'],
        properties: {
          id: { type: 'string', example: '1' },
          item: { type: 'string', example: 'Daily check-in' },
          due_at: { type: 'string', format: 'date-time' },
          done: { type: 'boolean' },
          overdue: { type: 'boolean' },
        },
      },
      EmergencyRequest: {
        type: 'object',
        required: ['scenario'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          patient_id: { type: 'integer', minimum: 1 },
          reporter_id: { type: 'integer', minimum: 1 },
          scenario: { type: 'string', enum: ['chest_pain', 'collapsed', 'breathing', 'bleeding', 'other'] },
          started_at: { type: 'string', format: 'date-time' },
        },
      },
      EmergencyStepRequest: {
        type: 'object',
        required: ['id', 'step_id'],
        properties: {
          id: { type: 'string', format: 'uuid' },
          step_id: { type: 'string', example: 'check_breathing' },
          answer: { type: 'string' },
          ts: { type: 'string', format: 'date-time' },
          vital_indicator: { type: 'string' },
          vital_value: { type: 'number' },
        },
      },
      CrewOverview: {
        type: 'object',
        properties: {
          mission_day: { type: 'integer', nullable: true },
          environment: { type: 'string', example: 'space_station' },
          comms_delay_s: { type: 'number', example: 1 },
          crew: { type: 'array', items: { type: 'object', properties: {
            id: { type: 'integer' }, name: { type: 'string' }, role: { type: 'string' }, avatar: { type: 'string', nullable: true },
            overall: { type: 'string', enum: ['green', 'amber', 'red', 'grey'] }, active_alert_count: { type: 'integer' },
          } } },
        },
      },
      AssistantRequest: {
        type: 'object',
        required: ['message'],
        additionalProperties: false,
        description: 'MOD-01: no astronaut_id. Private data of the logged-in astronaut is unlocked by the optional bearer token.',
        properties: {
          message: { type: 'string', minLength: 1, maxLength: 2000 },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API and database health',
        responses: {
          '200': json({ type: 'object', properties: { status: { type: 'string', example: 'ok' }, database: { type: 'string', example: 'up' }, timestamp: { type: 'string', format: 'date-time' } } }),
          '503': json({ type: 'object', properties: { status: { type: 'string', example: 'degraded' }, database: { type: 'string', example: 'down' }, timestamp: { type: 'string', format: 'date-time' } } }),
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Authenticate a seeded astronaut profile',
        requestBody: { required: true, content: { 'application/json': { schema: ref('LoginRequest') } } },
        responses: { '200': json(ref('LoginResponse')), '400': errorResponse(), '401': errorResponse('Wrong PIN'), '429': errorResponse('PIN temporarily locked') },
      },
    },
    '/api/astronauts': {
      get: { tags: ['Astronauts'], summary: 'List public crew profiles', responses: { '200': json({ type: 'array', items: ref('Astronaut') }) } },
    },
    '/api/measurements': {
      post: {
        tags: ['Astronauts'], security: secured, summary: 'Record a measurement and evaluate rules',
        requestBody: { required: true, content: { 'application/json': { schema: ref('MeasurementRequest') } } },
        responses: { '201': json({ type: 'object', properties: { measurement: { type: 'object' }, alerts: { type: 'array', items: ref('Alert') } } }), '400': errorResponse(), '401': errorResponse(), '403': errorResponse(),
        },
      },
    },
    '/api/checkins': {
      post: {
        tags: ['Astronauts'], security: secured, summary: 'Create or update a daily check-in',
        requestBody: { required: true, content: { 'application/json': { schema: ref('CheckinRequest') } } },
        responses: { '201': json({ type: 'object', properties: { checkin: { type: 'object' }, alerts: { type: 'array', items: ref('Alert') } } }), '400': errorResponse(), '401': errorResponse(), '403': errorResponse() },
      },
    },
    '/api/astronauts/{id}/status': {
      get: { tags: ['Astronauts'], security: secured, summary: 'Read private health status', parameters: [{ $ref: '#/components/parameters/AstronautId' }], responses: { '200': json({ type: 'object' }), '401': errorResponse(), '403': errorResponse(), '404': errorResponse() } },
    },
    '/api/astronauts/{id}/history': {
      get: {
        tags: ['Astronauts'], security: secured, summary: 'Read indicator history and baseline',
        parameters: [{ $ref: '#/components/parameters/AstronautId' }, { name: 'indicator', in: 'query', required: true, schema: { type: 'string' } }, { name: 'days', in: 'query', schema: { type: 'integer', enum: [7, 30, 180], default: 7 } }],
        responses: { '200': json({ type: 'object', properties: { indicator: { type: 'string' }, unit: { type: 'string', nullable: true }, points: { type: 'array', items: { type: 'object' } }, baseline: { type: 'object' }, alert_markers: { type: 'array', items: { type: 'object' } }, events: { type: 'array', items: { type: 'object' } } } }), '400': errorResponse(), '401': errorResponse(), '403': errorResponse() },
      },
    },
    '/api/astronauts/{id}/routine': {
      get: { tags: ['Astronauts'], security: secured, summary: 'List routine items', parameters: [{ $ref: '#/components/parameters/AstronautId' }], responses: { '200': json({ type: 'array', items: ref('RoutineItem') }), '401': errorResponse(), '403': errorResponse() } },
    },
    '/api/astronauts/{id}/routine/{item_id}': {
      patch: {
        tags: ['Astronauts'], security: secured, summary: 'Mark a routine item complete or incomplete',
        parameters: [{ $ref: '#/components/parameters/AstronautId' }, { $ref: '#/components/parameters/ItemId' }],
        requestBody: { required: true, content: { 'application/json': { schema: { type: 'object', required: ['done'], properties: { done: { type: 'boolean' } } } } } },
        responses: { '200': json(ref('RoutineItem')), '400': errorResponse(), '401': errorResponse(), '403': errorResponse(), '404': errorResponse() },
      },
    },
    '/api/crew/overview': {
      get: { tags: ['Crew'], summary: 'Read privacy-safe crew overview', responses: { '200': json(ref('CrewOverview')) } },
    },
    '/api/crew/alerts': {
      get: { tags: ['Crew'], security: secured, summary: 'Read other astronauts active alerts (commander only)', responses: { '200': json({ type: 'array', items: { type: 'object', properties: { astronaut_id: { type: 'integer' }, name: { type: 'string' }, level: { type: 'string' }, title: { type: 'string' }, ts: { type: 'string', format: 'date-time' } } } }), '401': errorResponse(), '403': errorResponse() } },
    },
    '/api/alerts/{id}/acknowledge': {
      patch: { tags: ['Alerts'], security: secured, summary: 'Acknowledge one own active alert', parameters: [{ $ref: '#/components/parameters/AlertId' }], responses: { '200': json({ type: 'object', properties: { alert: ref('Alert') } }), '401': errorResponse(), '404': errorResponse() } },
    },
    '/api/emergency': {
      post: { tags: ['Emergency'], summary: 'Open an emergency without authentication', requestBody: { required: true, content: { 'application/json': { schema: ref('EmergencyRequest') } } }, responses: { '201': json({ type: 'object', properties: { event: { type: 'object' } } }), '400': errorResponse(), '429': errorResponse() } },
    },
    '/api/emergency/{id}/context': {
      get: { tags: ['Emergency'], summary: 'Read emergency-only patient context', parameters: [{ $ref: '#/components/parameters/EventId' }], responses: { '200': json({ type: 'object' }), '404': errorResponse(), '429': errorResponse() } },
    },
    '/api/emergency/{id}/steps': {
      post: { tags: ['Emergency'], summary: 'Append an idempotent emergency step', parameters: [{ $ref: '#/components/parameters/EventId' }], requestBody: { required: true, content: { 'application/json': { schema: ref('EmergencyStepRequest') } } }, responses: { '201': json({ type: 'object', properties: { step: { type: 'object' } } }), '400': errorResponse(), '404': errorResponse(), '429': errorResponse() } },
    },
    '/api/emergency/{id}/close': {
      patch: { tags: ['Emergency'], summary: 'Close an emergency', parameters: [{ $ref: '#/components/parameters/EventId' }], requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { ended_at: { type: 'string', format: 'date-time' } } } } } }, responses: { '200': json({ type: 'object', properties: { event: { type: 'object' } } }), '404': errorResponse(), '429': errorResponse() } },
    },
    '/api/emergency/{id}/summary': {
      get: { tags: ['Emergency'], summary: 'Generate an illustrative emergency summary', parameters: [{ $ref: '#/components/parameters/EventId' }], responses: { '200': json({ type: 'object', properties: { event: { type: 'object' }, timeline: { type: 'array', items: { type: 'object' } }, vitals: { type: 'array', items: { type: 'object' } }, text: { type: 'string' } } }), '404': errorResponse(), '429': errorResponse() } },
    },
    '/api/radiation/events': {
      get: { tags: ['Radiation'], summary: 'List simulated radiation events', responses: { '200': json({ type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, ts: { type: 'string', format: 'date-time' }, doseMsv: { type: 'number', nullable: true }, doseRateUsvH: { type: 'number', nullable: true }, radiationType: { type: 'string', nullable: true }, location: { type: 'string', nullable: true }, instrument: { type: 'string', nullable: true }, eventType: { type: 'string', nullable: true }, source: { type: 'string' } } } }) } },
    },
    '/api/sources': {
      get: { tags: ['Sources'], summary: 'List NASA and mission reference sources', responses: { '200': json({ type: 'array', items: ref('Source') }) } },
    },
    '/api/assistant/chat': {
      post: { tags: ['Assistant'], security: [{}, { bearerAuth: [] }], summary: 'Ask the bounded LLM agentic assistant (public; optional token unlocks own private data — MOD-01)', requestBody: { required: true, content: { 'application/json': { schema: ref('AssistantRequest') } } }, responses: { '200': json({ type: 'object', properties: { answer: { type: 'string' }, sources: { type: 'array', items: ref('Source') }, data_used: { type: 'array', items: { type: 'string' } }, caution: { type: 'string' }, mode: { type: 'string', enum: ['agentic'] }, scope: { type: 'string', enum: ['public', 'private'] } } }), '400': errorResponse(), '401': errorResponse('Invalid or expired token'), '429': errorResponse('Rate limit exceeded'), '503': errorResponse('LLM provider unavailable (AI_UNAVAILABLE)') } },
    },
  },
};

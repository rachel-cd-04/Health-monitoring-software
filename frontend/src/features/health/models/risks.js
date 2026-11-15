// Reference catalogue built from the official NASA Space Apps 2026 challenge resources
// ("Create Health Monitoring Software for Astronauts on Space Missions") and the pages they link to.
// Summaries are SOMA's own paraphrases. They describe why an indicator is tracked; they are not
// clinical guidance. Accessed 14 Nov 2026.

export const ACCESSED = '14 Nov 2026';

// The five resources listed in the challenge's Resources tab.
export const officialResources = [
  {
    id: 'nasa-hazards',
    org: 'NASA',
    title: '5 Hazards of Human Spaceflight',
    url: 'https://www.nasa.gov/hrp/hazards/',
    summary:
      'The Human Research Program groups spaceflight dangers into five hazards: radiation, isolation and confinement, distance from Earth, gravity fields and hostile or closed environments.',
    usedFor:
      'Organises SOMA: every indicator, signal and environment reading is tagged with the hazard it relates to.',
  },
  {
    id: 'nasa-risks',
    org: 'NASA',
    title: 'Risks of Human Spaceflight',
    url: 'https://www.nasa.gov/hrp/risks/',
    summary:
      'A catalogue of specific physiological, behavioural and radiation risks to crew health and performance, which vary by mission profile.',
    usedFor:
      'Each indicator links to the NASA risk it gives context to. Trend signals cite the related risk page.',
  },
  {
    id: 'nasa-research',
    org: 'NASA',
    title: 'Ongoing HRP Research in Space',
    url: 'https://www.nasa.gov/hrp/ongoing-hrp-research/',
    summary:
      'Studies that show what is measured in flight and how: sleep and activity, standardised physiological measures, integrated body-system protocols and telemedicine.',
    usedFor:
      'Shapes the data model: every sample keeps its time, method, source and protocol, as in standardised measures.',
  },
  {
    id: 'csa-radiation',
    org: 'CSA',
    title: 'Monitoring Radiation for Astronaut Health',
    url: 'https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp',
    summary:
      'The Canadian Space Agency describes how it measures astronaut radiation exposure, including a compact, autonomous neutron spectrometer (CANS) in development.',
    usedFor:
      'Basis of the Environment view: dose by location, time and instrument, kept separate from physiological readings.',
  },
  {
    id: 'csa-why',
    org: 'CSA',
    title: 'Why Do We Conduct Science Experiments in Space?',
    url: 'https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp',
    summary:
      'Research on the ISS prepares long missions to the Moon and Mars and improves understanding of health problems on Earth.',
    usedFor:
      'Justifies a longitudinal, on-board record that keeps working when Earth support is delayed.',
  },
];

export const hazards = {
  radiation: { label: 'Space radiation', url: 'https://www.nasa.gov/hrp/hazard-space-radiation/' },
  isolation: {
    label: 'Isolation and confinement',
    url: 'https://www.nasa.gov/hrp/hazard-isolation-confinement/',
  },
  distance: {
    label: 'Distance from Earth',
    url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
  },
  gravity: { label: 'Gravity fields', url: 'https://www.nasa.gov/hrp/hazard-gravity-fields/' },
  environment: {
    label: 'Hostile/closed environments',
    url: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/',
  },
};

export const research = {
  archer: {
    title: 'ARCHeR — Artemis Research for Crew Health & Readiness',
    url: 'https://www.nasa.gov/reference/archer/',
    note: 'Sleep, activity, wellbeing and team interaction during Artemis.',
  },
  standard: {
    title: 'Standard Measures',
    url: 'https://www.nasa.gov/reference/standard-measures/',
    note: 'A standardised set of physiological and psychological measures before, during and after flight.',
  },
  artemis2: {
    title: 'Artemis II Standard Measures',
    url: 'https://www.nasa.gov/reference/artemis-ii-standard-measures/',
    note: 'Extends standard measures to Artemis II.',
  },
  cipher: {
    title: 'CIPHER — integrated protocols',
    url: 'https://www.nasa.gov/reference/cipher/',
    note: 'Fourteen studies observing several body systems together, including cardiovascular imaging.',
  },
  zerot2: {
    title: 'Zero T2 — exercise without a treadmill',
    url: 'https://www.nasa.gov/reference/zero-t2/',
    note: 'Strength, fitness, bone health and balance with compact exercise devices.',
  },
  tempus: {
    title: 'Tempus Pro — telemedicine',
    url: 'https://www.nasa.gov/reference/tempus-pro/',
    note: 'Integrating vital data for on-board care and remote support.',
  },
  immune: {
    title: 'Immune Biomarkers',
    url: 'https://www.nasa.gov/reference/immune-biomarkers/',
    note: 'Blood and saliva samples to study immune changes. Requires laboratory analysis.',
  },
  mosfet: {
    title: 'CSA — MOSFET radiation monitoring',
    url: 'https://www.asc-csa.gc.ca/eng/astronauts/space-medicine/mosfet.asp',
    note: 'Calibrated semiconductor dosimeters estimate absorbed dose.',
  },
  evarm: {
    title: 'CSA — EVARM',
    url: 'https://www.asc-csa.gc.ca/eng/iss/evarm.asp',
    note: 'Dosimeters worn in spacesuit pockets during spacewalks.',
  },
  radin2: {
    title: 'CSA — Radi-N2',
    url: 'https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp',
    note: 'Bubble detectors placed around the station to map neutron exposure over days.',
  },
};

export const risks = {
  cardiovascular: {
    id: 'cardiovascular',
    title: 'Cardiovascular Adaptations',
    org: 'NASA',
    hazard: 'gravity',
    url: 'https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/',
    summary:
      'Altered gravity changes how blood and fluids are distributed. NASA studies changes to the heart and blood vessels and countermeasures such as exercise and diet.',
    soma: 'Records resting heart rate and blood pressure at the daily check-in. Flags heart rate 15 bpm above the personal 7-day baseline for 3 days (C-01) and systolic pressure ≥ 140 or ≤ 90 mmHg (C-02).',
    limits:
      'A change from baseline is a prompt to look closer with the CMO. It does not identify a cardiovascular condition.',
    research: ['cipher', 'standard'],
  },
  nutrition: {
    id: 'nutrition',
    title: 'Inadequate Food and Nutrition',
    org: 'NASA',
    hazard: 'environment',
    indicative: true,
    url: 'https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/',
    summary:
      'Long missions depend on a stored food system that must stay safe, nutritious and acceptable for years. Poor intake or nutrient loss can affect health and performance.',
    soma: 'Records capillary blood sugar at each daily check-in and flags values below 70 or above 180 mg/dL (rule G-01).',
    limits:
      'Indicative only. Blood sugar depends on meal timing and is not a measure of nutritional status or food intake.',
    research: ['standard'],
  },
  immune: {
    id: 'immune',
    title: 'Altered Immune System Responses',
    org: 'NASA',
    hazard: 'environment',
    indicative: true,
    url: 'https://www.nasa.gov/reference/risk-of-altered-immune-system-responses/',
    summary:
      'Spaceflight stressors and a closed habitat can change how the immune system responds, with possible infections or reactivation of dormant viruses.',
    soma: 'Records body temperature with its measurement site and flags 38.0 °C or higher (rule T-01).',
    limits:
      'Indicative only. Temperature is not an immune measurement; immune markers need laboratory samples.',
    research: ['immune'],
  },
  fitness: {
    id: 'fitness',
    title: 'Reduced Cardiorespiratory and Musculoskeletal Fitness',
    org: 'NASA',
    hazard: 'gravity',
    url: 'https://www.nasa.gov/reference/risk-of-reduced-cardiorespiratory-and-musculoskeletal-fitness',
    summary:
      'Without regular loading, aerobic capacity, muscle strength and endurance decline in reduced gravity. Daily exercise is the main countermeasure.',
    soma: 'Records daily exercise minutes and flags fewer than 60 minutes a day for 5 days in a row (rule E-01).',
    limits: 'Minutes of exercise do not measure fitness, muscle mass or strength.',
    research: ['zerot2', 'standard'],
  },
  habitat: {
    id: 'habitat',
    title: 'Hostile/Closed Environments',
    org: 'NASA',
    hazard: 'environment',
    url: 'https://www.nasa.gov/hrp/hazard-hostile-closed-environments/',
    summary:
      'A spacecraft must keep temperature, pressure, air quality, light and noise within limits. Closed habitats also concentrate microorganisms and can influence immune responses.',
    soma: 'Environment shows simulated cabin temperature, pressure, ppCO₂ and humidity.',
    limits: 'Cabin values in this prototype are simulated.',
    research: ['immune'],
  },
  sleep: {
    id: 'sleep',
    title: 'Inadequate Sleep and Irregular Schedules',
    org: 'NASA',
    hazard: 'isolation',
    url: 'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/',
    summary:
      'Workload, light and shifting schedules can reduce sleep and disrupt circadian rhythms, affecting performance and health.',
    soma: 'Collects self-reported hours slept and fatigue (1–5) at each check-in and flags less than 6 h of sleep for 3 nights in a row (S-01).',
    limits:
      'Self-report is not actigraphy or polysomnography. SOMA cannot diagnose a sleep disorder.',
    research: ['archer', 'standard'],
  },
  behavioral: {
    id: 'behavioral',
    title: 'Behavioral Changes and Psychiatric Disorders',
    org: 'NASA',
    hazard: 'isolation',
    url: 'https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/',
    summary:
      'Isolation, confinement and mission stress can affect mood, behaviour and mental health over long missions.',
    soma: 'Offers a private 1–5 mood self-report and flags mood 2 or lower for 3 days in a row (M-01).',
    limits:
      'A short self-report scale is not a psychological assessment and never produces a diagnosis.',
    research: ['archer'],
  },
  bone: {
    id: 'bone',
    title: 'Spaceflight-Induced Bone Changes',
    org: 'NASA',
    hazard: 'gravity',
    url: 'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/',
    summary:
      'Microgravity reduces bone loading, leading to loss of bone mass and density. Exercise is the main countermeasure studied.',
    soma: 'Indirect context only: daily exercise minutes, the main bone countermeasure, are shown with the muscles and bones area.',
    limits: 'Bone density cannot be inferred from exercise logs.',
    research: ['zerot2', 'standard'],
  },
  radiation: {
    id: 'radiation',
    title: 'Radiation-Induced Cancers',
    org: 'NASA',
    hazard: 'radiation',
    url: 'https://www.nasa.gov/reference/risk-of-radiation-induced-cancers/',
    summary:
      'Exposure to space radiation raises long-term cancer risk. That risk is estimated with models from dose history and other factors.',
    soma: 'Shows simulated absorbed dose by location, time and instrument, plus personal dose, with clear data status.',
    limits:
      'Dose is exposure, not biological harm. SOMA does not compute cancer risk and raises no alert from a single reading.',
    research: ['mosfet', 'evarm', 'radin2'],
  },
  distance: {
    id: 'distance',
    title: 'Distance from Earth',
    org: 'NASA',
    hazard: 'distance',
    url: 'https://www.nasa.gov/hrp/hazard-distance-from-earth/',
    summary:
      'Further from Earth, communication delays grow and immediate ground support becomes unavailable, so crews need more autonomy.',
    soma: 'Works fully on board, queues ground reports when the link is unavailable and simulates a configurable one-way delay.',
    limits:
      'Ground transmission in this prototype is simulated. No real medical team is contacted.',
    research: ['tempus'],
  },
};

export const metricRisk = {
  pulse: 'cardiovascular',
  bp: 'cardiovascular',
  glucose: 'nutrition',
  temp: 'immune',
  sleep: 'sleep',
  mood: 'behavioral',
  fatigue: 'sleep',
  exercise: 'fitness',
};
// Bone changes are shown as indirect context for exercise.
export const metricContext = { exercise: 'bone' };
export const regionRisk = {
  head: 'sleep',
  heart: 'cardiovascular',
  body: 'nutrition',
  legs: 'fitness',
};
export const riskFor = (metric) => risks[metricRisk[metric]];

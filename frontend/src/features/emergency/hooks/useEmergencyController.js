import { uuid } from '../../../shared/ids.js';
import { localId, stamp } from '../../crew/models/crewModel.js';
import { useEmergencyActions } from './useEmergencyActions.js';

export function useEmergencyController({
  apiConfigured,
  acknowledgeAlert,
  crew,
  data,
  operator,
  profileFor,
  setData,
  setEmergency,
  setPrivateApiSignals,
  setReport,
  notify,
  navigate,
}) {
  const emergencyActions = useEmergencyActions();
  const { createEmergency, appendEmergencyStep, closeEmergency, fetchEmergencySummary } =
    emergencyActions;

  const broadcast = async ({ id, patient, situation, description }) => {
    const patientProfile = profileFor(patient);
    const reporterProfile = profileFor(operator.id);
    const scenario =
      situation === 'Severe pain or discomfort'
        ? 'chest_pain'
        : situation === 'Not responding'
          ? 'collapsed'
          : situation === 'Breathing difficulty'
            ? 'breathing'
            : situation === 'Injury'
              ? 'bleeding'
              : 'other';
    const result = await createEmergency({
      id,
      scenario,
      ...(patientProfile ? { patient_id: Number(patientProfile.id) } : {}),
      ...(reporterProfile ? { reporter_id: Number(reporterProfile.id) } : {}),
    });
    const event = result.event;
    setData((current) => ({
      ...current,
      crewAlerts: [
        {
          id: event.id,
          patient,
          situation,
          description,
          createdAt: new Date(event.startedAt || Date.now()).getTime(),
          createdBy: operator.id,
          status: 'active',
          acknowledgedBy: [operator.id],
          assessment:
            situation === 'Not responding'
              ? { responsive: 'no' }
              : situation === 'Breathing difficulty'
                ? { breathing: 'no' }
                : {},
          log: [],
        },
        ...current.crewAlerts,
      ],
    }));
    notify('On-board emergency saved to the health API.');
    return event.id;
  };

  const acknowledge = async (id) => {
    const apiId = String(id).replace(/^api-alert-/, '');
    if (/^\d+$/.test(apiId)) {
      const profile = profileFor(operator.id);
      if (!profile) {
        notify('Could not acknowledge alert: the current profile is unavailable.');
        return;
      }
      try {
        await acknowledgeAlert({
          alertId: apiId,
          astronautId: Number(profile.id),
        });
        setPrivateApiSignals((signals) => ({
          ...signals,
          [operator.id]: (signals[operator.id] || []).filter((alert) => alert.id !== id),
        }));
        notify('Alert acknowledged by ' + operator.name);
      } catch (error) {
        notify(`Could not acknowledge alert: ${error.message}`);
      }
      return;
    }
    if (apiConfigured && /^[0-9a-f-]{36}$/i.test(String(id))) {
      appendEmergencyStep({
        incidentId: id,
        body: {
          id: uuid(),
          step_id: 'crew_acknowledgement',
          answer: `${operator.name} acknowledged the emergency.`,
          ts: new Date().toISOString(),
        },
      }).catch((error) => notify(`Could not save acknowledgement: ${error.message}`));
    }
    setData((current) => ({
      ...current,
      crewAlerts: current.crewAlerts.map((alert) =>
        alert.id === id
          ? { ...alert, acknowledgedBy: [...new Set([...alert.acknowledgedBy, operator.id])] }
          : alert,
      ),
    }));
    notify('Acknowledged by ' + operator.name);
  };

  const patchIncident = (id, fn) => {
    const current = data.crewAlerts.find((alert) => alert.id === id) || { id, log: [] };
    const updated = fn(current);
    setData((next) => ({
      ...next,
      crewAlerts: next.crewAlerts.some((alert) => alert.id === id)
        ? next.crewAlerts.map((alert) => (alert.id === id ? { ...alert, ...updated } : alert))
        : [{ ...updated }, ...next.crewAlerts],
    }));
    const isPersistedIncident = apiConfigured && /^[0-9a-f-]{36}$/i.test(String(id));
    if (!isPersistedIncident) return;
    const newVitals = (updated.vitals || []).slice(current.vitals?.length || 0);
    if (newVitals.length) {
      for (const vital of newVitals) {
        appendEmergencyStep({
          incidentId: id,
          body: {
            id: uuid(),
            step_id: 'vital_measurement',
            answer: `${vital.label}: ${vital.value} ${vital.unit}`,
            ts: new Date(vital.ts || Date.now()).toISOString(),
            vital_indicator: vital.indicator,
            vital_value: Number(vital.value),
          },
        }).catch((error) => notify(`Could not save emergency vital: ${error.message}`));
      }
      return;
    }
    const latest = updated.log?.at(-1);
    if (latest && updated.log.length > (current.log?.length || 0)) {
      appendEmergencyStep({
        incidentId: id,
        body: {
          id: latest.id,
          step_id: updated.step || 'progress',
          answer: latest.text,
          ts: new Date(latest.ts).toISOString(),
        },
      }).catch((error) => notify(`Could not save emergency step: ${error.message}`));
    }
  };

  const updateAssessment = (id, assessment) =>
    setData((current) => ({
      ...current,
      crewAlerts: current.crewAlerts.map((alert) =>
        alert.id === id ? { ...alert, assessment, updatedAt: Date.now() } : alert,
      ),
    }));

  const resolve = async (id, reason = 'Resolved') => {
    if (apiConfigured && /^[0-9a-f-]{36}$/i.test(String(id))) {
      try {
        await closeEmergency({ incidentId: id, endedAt: new Date().toISOString() });
      } catch (error) {
        notify(`Could not close emergency in the API: ${error.message}`);
        return;
      }
    }
    setData((current) => ({
      ...current,
      crewAlerts: current.crewAlerts.map((alert) =>
        alert.id === id
          ? {
              ...alert,
              status: 'closed',
              closedBy: operator.id,
              closedAt: Date.now(),
              closeReason: reason,
              log: [
                ...(alert.log || []),
                { id: localId(), ts: Date.now(), text: 'Emergency closed: ' + reason },
              ],
            }
          : alert,
      ),
    }));
    notify('Emergency closed: ' + reason + '.');
    setEmergency(null);
  };

  const emergencyReport = (incident) => {
    const openReport = (body) => {
      setReport({ patient: incident.patient, body });
      setEmergency(null);
      navigate('medical');
    };
    if (incident.summary) {
      openReport(incident.summary + '\n\nRequested ground support: ');
      return;
    }
    if (apiConfigured && /^[0-9a-f-]{36}$/i.test(String(incident.id))) {
      fetchEmergencySummary(incident.id)
        .then((result) =>
          openReport(
            (result.text || 'Emergency summary unavailable.') + '\n\nRequested ground support: ',
          ),
        )
        .catch((error) => notify(`Could not load emergency summary: ${error.message}`));
      return;
    }
    openReport(
      `On-board incident: ${incident.situation}\nObserved status: ${incident.description || 'Not recorded'}\nRaised: ${stamp(incident.createdAt)}\nResponsive: ${incident.assessment?.responsive || 'Not assessed'}\nNormal breathing: ${incident.assessment?.breathing || 'Not assessed'}\nOnset: ${incident.assessment?.onset || 'Not recorded'}\nCrew acknowledgements: ${incident.acknowledgedBy.map((id) => crew.find((person) => person.id === id)?.name).join(', ')}\n\nRequested ground support: `,
    );
  };

  return { broadcast, acknowledge, patchIncident, updateAssessment, resolve, emergencyReport };
}

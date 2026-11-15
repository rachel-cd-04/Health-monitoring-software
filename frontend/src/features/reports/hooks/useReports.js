import { localId } from '../../crew/models/crewModel.js';
import { buildReport } from '../models/healthReport.js';

export function useReports({ data, problem, setData, setProblem, notify, crew }) {
  const sendReport = (patient, body) => {
    setData((current) => {
      const now = Date.now();
      return {
        ...current,
        messages: [
          {
            id: localId(),
            patient,
            body,
            createdAt: now,
            status: current.connection === 'offline' ? 'pending' : 'sent',
            sentAt: current.connection === 'offline' ? null : now,
            receiveAt: now + (current.connection === 'online' ? 1500 : current.latency * 60000),
          },
          ...current.messages,
        ],
      };
    });
    notify(
      data.connection === 'offline'
        ? 'Report queued on board.'
        : 'Report submitted to the simulated ground channel.',
    );
  };

  const submitProblem = (input) => {
    const person = crew.find((member) => member.id === problem);
    try {
      const { report, body } = buildReport(input, person, data);
      const messageId = body ? localId() : null;
      setData((current) => {
        const now = Date.now();
        const messages = body
          ? [
              {
                id: messageId,
                patient: person.id,
                body,
                kind: 'health-report',
                createdAt: now,
                status: current.connection === 'offline' ? 'pending' : 'sent',
                sentAt: current.connection === 'offline' ? null : now,
                receiveAt: now + (current.connection === 'online' ? 1500 : current.latency * 60000),
              },
              ...current.messages,
            ]
          : current.messages;
        return {
          ...current,
          messages,
          healthReports: [{ ...report, messageId }, ...(current.healthReports || [])],
        };
      });
      setProblem(null);
      notify(
        body
          ? data.connection === 'offline'
            ? 'Report saved. It will go to Earth when the link is back.'
            : 'Report sent to the medical officer and to Earth.'
          : 'Report sent to the medical officer.',
      );
    } catch (error) {
      notify(error.message);
    }
  };

  return { sendReport, submitProblem };
}

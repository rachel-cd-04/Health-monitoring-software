import React from 'react';
import { GUIDES, SOURCES } from '../data/indicators.js';

export default function MeasurementGuide({ guideId, supportingSteps = [], className = '' }) {
  const guide = GUIDES[guideId];
  if (!guide) return null;
  const source = SOURCES[guide.source];

  return (
    <details className={`measurement-guide ${className}`.trim()}>
      <summary>Measurement guide · {guide.title}</summary>
      <div className="measurement-guide-content">
        <section>
          <h4>How to measure</h4>
          <ol>
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
        <section>
          <h4>Why it matters in space</h4>
          <p>{guide.why}</p>
        </section>
        <section>
          <h4>Illustrative reference range</h4>
          <p>{guide.range}</p>
          <small>This is an illustrative guide, not a clinical threshold or diagnosis.</small>
        </section>
        {supportingSteps.length > 0 && (
          <section>
            <h4>Before entering a reading</h4>
            <ul>
              {supportingSteps.map((step) => (
                <li key={step}>{step.replace(/^I /, '')}</li>
              ))}
            </ul>
          </section>
        )}
        <section className="measurement-guide-actions">
          <h4>If the result looks unusual</h4>
          <ul>
            {guide.abnormal.map((action) => (
              <li key={action}>{action}</li>
            ))}
          </ul>
        </section>
        {source && (
          <a href={source.url} target="_blank" rel="noreferrer">
            Source: {source.title}
          </a>
        )}
      </div>
    </details>
  );
}

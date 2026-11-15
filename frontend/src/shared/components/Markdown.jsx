import React, { Fragment } from 'react';

// Small, safe Markdown renderer for assistant replies. It builds React elements (never HTML strings),
// so model output cannot inject markup. Supported: paragraphs and line breaks, # headings, - / * / 1.
// lists, > quotes, ---, ``` code blocks, **bold**, *italic*, `code` and [links](https://…).

const INLINE =
  /(`[^`\n]+`)|(\*\*|__)(?=\S)([\s\S]+?)(?<=\S)\2|(?<![\w*])\*(?=[^\s*])([^*\n]+?)(?<=\S)\*(?!\*)|(?<![\w_])_(?=\S)([^_\n]+?)(?<=\S)_(?![\w_])|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/;

function inline(text, key = 'i') {
  const out = [];
  let rest = text,
    n = 0;
  while (rest) {
    const m = INLINE.exec(rest);
    if (!m) {
      out.push(rest);
      break;
    }
    if (m.index) out.push(rest.slice(0, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k}>{m[1].slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={k}>{inline(m[3], k)}</strong>);
    else if (m[4] !== undefined) out.push(<em key={k}>{inline(m[4], k)}</em>);
    else if (m[5] !== undefined) out.push(<em key={k}>{inline(m[5], k)}</em>);
    else
      out.push(
        <a key={k} href={m[7]} target="_blank" rel="noreferrer noopener">
          {inline(m[6], k)}
        </a>,
      );
    rest = rest.slice(m.index + m[0].length);
  }
  return out;
}

const withBreaks = (lines, key) =>
  lines.map((l, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {inline(l, `${key}-${i}`)}
    </Fragment>
  ));

const BULLET = /^\s*[-*+•]\s+/,
  NUMBER = /^\s*(\d+)[.)]\s+/,
  HEADING = /^\s*(#{1,6})\s+(.*?)\s*#*\s*$/,
  QUOTE = /^\s*>\s?/,
  RULE = /^\s*([-*_])(\s*\1){2,}\s*$/,
  FENCE = /^\s*```/;

function blocks(src) {
  const lines = String(src ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n');
  const out = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (FENCE.test(line)) {
      const body = [];
      i++;
      while (i < lines.length && !FENCE.test(lines[i])) body.push(lines[i++]);
      i++;
      out.push({ type: 'code', text: body.join('\n') });
      continue;
    }
    if (RULE.test(line)) {
      out.push({ type: 'rule' });
      i++;
      continue;
    }
    const h = HEADING.exec(line);
    if (h) {
      out.push({ type: 'heading', text: h[2] });
      i++;
      continue;
    }
    if (BULLET.test(line) || NUMBER.test(line)) {
      const ordered = NUMBER.test(line);
      const start = ordered ? Number(NUMBER.exec(line)[1]) : 1;
      const items = [];
      while (i < lines.length) {
        const l = lines[i];
        // A switch between bullets and numbers starts a new list.
        if (ordered ? NUMBER.test(l) : BULLET.test(l))
          items.push([l.replace(ordered ? NUMBER : BULLET, '')]);
        // An indented, non-empty line continues the previous item.
        else if (l.trim() && /^\s{2,}/.test(l) && items.length) items[items.length - 1].push(l.trim());
        else break;
        i++;
      }
      out.push({ type: ordered ? 'ol' : 'ul', start, items });
      continue;
    }
    if (QUOTE.test(line)) {
      const body = [];
      while (i < lines.length && QUOTE.test(lines[i])) body.push(lines[i++].replace(QUOTE, ''));
      out.push({ type: 'quote', lines: body });
      continue;
    }
    const para = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      ![BULLET, NUMBER, HEADING, QUOTE, RULE, FENCE].some((re) => re.test(lines[i]))
    )
      para.push(lines[i++].trim());
    out.push({ type: 'p', lines: para });
  }
  return out;
}

export default function Markdown({ text, className = '' }) {
  return (
    <div className={className ? 'md ' + className : 'md'}>
      {blocks(text).map((b, i) => {
        const k = 'b' + i;
        switch (b.type) {
          case 'heading':
            return (
              <p key={k} className="md-heading">
                {inline(b.text, k)}
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = b.type;
            return (
              <List key={k} start={b.type === 'ol' && b.start !== 1 ? b.start : undefined}>
                {b.items.map((item, j) => (
                  <li key={j}>{withBreaks(item, `${k}-${j}`)}</li>
                ))}
              </List>
            );
          }
          case 'quote':
            return <blockquote key={k}>{withBreaks(b.lines, k)}</blockquote>;
          case 'code':
            return (
              <pre key={k}>
                <code>{b.text}</code>
              </pre>
            );
          case 'rule':
            return <hr key={k} />;
          default:
            return <p key={k}>{withBreaks(b.lines, k)}</p>;
        }
      })}
    </div>
  );
}

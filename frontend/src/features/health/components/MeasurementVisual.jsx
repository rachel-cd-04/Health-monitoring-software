import React from 'react';

export default function MeasurementVisual({ type = 'pulse', active = false }) {
  return (
    <svg
      className={'measurement-visual ' + (active ? 'active' : '')}
      viewBox="0 0 160 110"
      aria-hidden="true"
    >
      <ellipse cx="80" cy="99" rx="57" ry="6" fill="#d8e8ed" opacity=".5" />
      {type === 'glucose' ? (
        <>
          <path
            d="M24 86Q16 70 30 62L58 50Q70 46 74 56L76 64L60 72Q44 80 40 92Z"
            fill="#dfedf0"
            stroke="#94b5c2"
            strokeWidth="1.5"
          />
          <path
            d="M58 50Q66 38 76 42Q84 46 78 58"
            fill="#e6f1f3"
            stroke="#94b5c2"
            strokeWidth="1.5"
          />
          <path d="M80 40Q84 32 86 40Q87 45 83 46Q79 45 80 40Z" fill="#c75b66" />
          <rect
            x="96"
            y="28"
            width="40"
            height="62"
            rx="10"
            fill="#f8fcfd"
            stroke="#88adb9"
            strokeWidth="1.6"
          />
          <rect x="102" y="36" width="28" height="20" rx="4" fill="#1e5265" />
          <path
            d="M107 46H125M107 51H118"
            stroke="#8ad5cd"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M110 28V18H122V28" fill="#eef5f7" stroke="#88adb9" strokeWidth="1.4" />
          <circle cx="116" cy="72" r="6" fill="none" stroke="#88adb9" strokeWidth="1.4" />
          <path
            className="visual-indicator"
            d="M88 22L95 27L88 32"
            fill="none"
            stroke="#5f9dab"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : type === 'pulse' ? (
        <>
          <path
            d="M36 81Q20 67 31 55L52 37Q64 28 72 41L85 63L108 58Q124 56 129 73L132 85Q104 102 76 93Z"
            fill="#dfedf0"
            stroke="#94b5c2"
            strokeWidth="1.5"
          />
          <rect
            x="46"
            y="20"
            width="39"
            height="44"
            rx="11"
            fill="#f8fcfd"
            stroke="#88adb9"
            strokeWidth="1.6"
          />
          <rect x="51" y="27" width="29" height="21" rx="4" fill="#1e5265" />
          <path
            d="M54 39H59L63 32L66 44L70 36L74 39H77"
            fill="none"
            stroke="#8ad5cd"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
          <path d="M65 65V78" stroke="#6ca8b4" strokeDasharray="2 3" />
          <circle cx="65" cy="81" r="3" fill="#65a69a" />
          <path
            className="visual-indicator"
            d="M100 22L109 28L100 34"
            fill="none"
            stroke="#5f9dab"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : type === 'bp' ? (
        <>
          <path
            d="M51 17L76 20L80 57L72 85L50 82L53 53Z"
            fill="#e0edf0"
            stroke="#99b7c2"
            strokeWidth="1.5"
          />
          <path
            d="M43 36Q63 28 83 37L84 60Q62 52 43 61Z"
            fill="#88afbc"
            stroke="#698f9e"
            strokeWidth="1.5"
          />
          <path d="M83 50Q110 50 102 82" fill="none" stroke="#7da6b5" strokeWidth="2" />
          <rect
            x="94"
            y="67"
            width="43"
            height="28"
            rx="6"
            fill="#f9fcfd"
            stroke="#8aafbd"
            strokeWidth="1.5"
          />
          <rect x="101" y="73" width="29" height="12" rx="2" fill="#1f5367" />
          <path d="M107 77H116M107 81H124" stroke="#a5d8cf" strokeWidth="1.5" />
          <path
            className="visual-indicator"
            d="M25 42L34 48L25 54"
            fill="none"
            stroke="#5f9dab"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </>
      ) : type === 'temp' ? (
        <>
          <path
            d="M60 14Q85 7 96 33L91 44L100 53L91 58L89 71L76 72L75 90L54 90L58 66Q36 49 43 29Q47 18 60 14Z"
            fill="#e2eef1"
            stroke="#95b4c0"
            strokeWidth="1.5"
          />
          <path d="M79 38Q71 32 72 43Q72 49 78 46" fill="none" stroke="#8daebd" strokeWidth="2" />
          <g transform="translate(93 54) rotate(-24)">
            <rect width="40" height="14" rx="6" fill="#f8fcfd" stroke="#80a7b5" strokeWidth="1.5" />
            <rect x="15" y="4" width="14" height="6" rx="1" fill="#1f5468" />
            <path d="M-9 4H2V10H-9Z" fill="#8caeba" />
          </g>
          <circle
            className="visual-indicator"
            cx="80"
            cy="41"
            r="8"
            fill="none"
            stroke="#67a59f"
            strokeWidth="1.5"
            strokeDasharray="2 3"
          />
        </>
      ) : type === 'sleep' ? (
        <>
          <path
            d="M93 18Q67 31 82 54Q91 68 112 60Q96 88 69 76Q40 64 48 38Q54 17 76 16Q85 14 93 18Z"
            fill="#d8e4ee"
            stroke="#9caabe"
            strokeWidth="1.5"
          />
          <path d="M116 21V31M111 26H121M33 70V78M29 74H37" stroke="#99afbf" strokeWidth="1.5" />
          <path d="M26 89H136" stroke="#bad0da" strokeLinecap="round" strokeWidth="3" />
        </>
      ) : (
        <>
          <rect
            x="29"
            y="23"
            width="102"
            height="67"
            rx="11"
            fill="#f8fcfd"
            stroke="#93b5c3"
            strokeWidth="1.5"
          />
          <path
            d="M43 42H59L66 33L74 68L84 46L91 53H117"
            fill="none"
            stroke="#7aacae"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="118" cy="32" r="3" fill="#70a997" />
        </>
      )}
    </svg>
  );
}

/* Wispbloom — levels.js
 * Data-driven level definitions. New levels are added here without
 * touching gameplay code.
 *
 * Level schema:
 *   name       display name
 *   bg         background art key: 'dawn' | 'dusk' | 'lair' (see ui.js)
 *   obj        'bloom' | 'cleanse' | 'survive' | 'boss'
 *   target     bloom: energy needed / cleanse: corrupted count (auto if omitted)
 *   time       survive: seconds to hold out
 *   colors     number of wisp colors in play (2..4)
 *   rings      [{ rr: relative radius 0..1, dir: 1|-1, speed: rad/s,
 *                fill: initial piece count, corrupt: corrupted count,
 *                capacity: overflow limit }]
 *   spawn      { interval: seconds between new wisps, rings: [indices] }
 *   shifts     orbit-shift pool cycled on every match:
 *              'reverse' | 'surge' | 'leap' | 'lull'
 *   s2, s3     score thresholds for 2 and 3 stars
 *   hints      tutorial banners: [{ at: seconds, text }]
 */
'use strict';
(function (WB) {

  WB.LEVELS = [
    { // 1 — pure tutorial: aim, shoot, match
      name: 'First Light',
      bg: 'dawn',
      obj: 'bloom', target: 12, colors: 3,
      rings: [
        { rr: 0.72, dir: 1, speed: 0.22, fill: 12, capacity: 17 },
      ],
      spawn: null,
      shifts: [],
      s2: 900, s3: 1400,
      hints: [
        { at: 0.5, text: 'Drag anywhere to aim, release to shoot' },
        { at: 6, text: 'Match 3 wisps of the same color' },
        { at: 14, text: 'Tap the core to swap your wisp' },
      ],
    },
    { // 2 — two rings, gentle spawner
      name: 'Twin Streams',
      bg: 'dawn',
      obj: 'bloom', target: 20, colors: 3,
      rings: [
        { rr: 0.52, dir: -1, speed: 0.26, fill: 9, capacity: 13 },
        { rr: 0.8, dir: 1, speed: 0.2, fill: 12, capacity: 19 },
      ],
      spawn: { interval: 7, rings: [1] },
      shifts: [],
      s2: 1600, s3: 2600,
      hints: [
        { at: 0.5, text: 'Shots pass empty space and stick to wisps' },
        { at: 8, text: 'Don’t let a ring overgrow!' },
      ],
    },
    { // 3 — cleanse introduction
      name: 'Creeping Shade',
      bg: 'dawn',
      obj: 'cleanse', colors: 3,
      rings: [
        { rr: 0.52, dir: 1, speed: 0.24, fill: 9, corrupt: 3, capacity: 13 },
        { rr: 0.8, dir: -1, speed: 0.22, fill: 12, corrupt: 3, capacity: 19 },
      ],
      spawn: { interval: 8, rings: [0, 1] },
      shifts: [],
      s2: 2000, s3: 3200,
      hints: [
        { at: 0.5, text: 'Cleanse thorned wisps: match their inner color' },
      ],
    },
    { // 4 — the Orbit Shift mechanic arrives
      name: 'The Garden Stirs',
      bg: 'dawn',
      obj: 'bloom', target: 28, colors: 3,
      rings: [
        { rr: 0.52, dir: 1, speed: 0.3, fill: 10, capacity: 13 },
        { rr: 0.8, dir: -1, speed: 0.24, fill: 13, capacity: 19 },
      ],
      spawn: { interval: 6, rings: [0, 1] },
      shifts: ['reverse'],
      s2: 2400, s3: 3800,
      hints: [
        { at: 0.5, text: 'Every match now reshapes the orbits!' },
      ],
    },
    { // 5 — survive + surge shift, ability unlocks here
      name: 'Hold the Bloom',
      bg: 'dusk',
      obj: 'survive', time: 60, colors: 3,
      rings: [
        { rr: 0.52, dir: -1, speed: 0.3, fill: 8, capacity: 13 },
        { rr: 0.8, dir: 1, speed: 0.26, fill: 11, capacity: 19 },
      ],
      spawn: { interval: 3.6, rings: [0, 1] },
      shifts: ['reverse', 'surge'],
      s2: 2600, s3: 4200,
      hints: [
        { at: 0.5, text: 'Survive! Keep the rings from overgrowing' },
        { at: 5, text: 'Matches charge the Pulse button' },
      ],
    },
    { // 6 — three rings + leap shift, prisms flow
      name: 'Leaping Lights',
      bg: 'dusk',
      obj: 'cleanse', colors: 4,
      rings: [
        { rr: 0.44, dir: 1, speed: 0.3, fill: 7, corrupt: 2, capacity: 11 },
        { rr: 0.66, dir: -1, speed: 0.26, fill: 10, corrupt: 3, capacity: 15 },
        { rr: 0.88, dir: 1, speed: 0.22, fill: 13, corrupt: 3, capacity: 21 },
      ],
      spawn: { interval: 6.5, rings: [1, 2] },
      shifts: ['reverse', 'leap'],
      s2: 3200, s3: 5200,
      hints: [
        { at: 0.5, text: 'Chain two bursts in one shot to earn a Prism' },
      ],
    },
    { // 7 — big bloom under pressure
      name: 'Deep Nectar',
      bg: 'dusk',
      obj: 'bloom', target: 45, colors: 4,
      rings: [
        { rr: 0.44, dir: -1, speed: 0.34, fill: 8, capacity: 11 },
        { rr: 0.66, dir: 1, speed: 0.3, fill: 10, capacity: 15 },
        { rr: 0.88, dir: -1, speed: 0.24, fill: 14, capacity: 21 },
      ],
      spawn: { interval: 4.5, rings: [0, 1, 2] },
      shifts: ['reverse', 'surge', 'lull'],
      s2: 4200, s3: 6600,
    },
    { // 8 — long survival, every shift in play
      name: 'Night of Petals',
      bg: 'dusk',
      obj: 'survive', time: 90, colors: 4,
      rings: [
        { rr: 0.44, dir: 1, speed: 0.36, fill: 7, capacity: 11 },
        { rr: 0.66, dir: -1, speed: 0.3, fill: 10, capacity: 15 },
        { rr: 0.88, dir: 1, speed: 0.26, fill: 12, capacity: 21 },
      ],
      spawn: { interval: 3.2, rings: [0, 1, 2] },
      shifts: ['reverse', 'surge', 'leap', 'lull'],
      s2: 5200, s3: 8200,
    },
    { // 9 — the storm before the boss
      name: 'Shadow Storm',
      bg: 'dusk',
      obj: 'cleanse', colors: 4,
      rings: [
        { rr: 0.44, dir: -1, speed: 0.4, fill: 8, corrupt: 4, capacity: 11 },
        { rr: 0.66, dir: 1, speed: 0.34, fill: 11, corrupt: 5, capacity: 15 },
        { rr: 0.88, dir: -1, speed: 0.28, fill: 14, corrupt: 5, capacity: 21 },
      ],
      spawn: { interval: 4, rings: [0, 1, 2] },
      shifts: ['reverse', 'surge', 'leap'],
      s2: 6200, s3: 9600,
    },
    { // 10 — BOSS
      name: 'The Umbra Serpent',
      bg: 'lair',
      obj: 'boss', colors: 3,
      rings: [
        { rr: 0.5, dir: 1, speed: 0.3, fill: 9, capacity: 14 },
        { rr: 0.84, dir: -1, speed: 0.2, fill: 0, capacity: 99 },
      ],
      spawn: { interval: 5, rings: [0] },
      shifts: ['reverse'],
      boss: { segments: 8, roarEvery: 15, eatEvery: 9 },
      s2: 5200, s3: 8000,
      hints: [
        { at: 0.5, text: 'Crack every shell: hit segments with their color!' },
      ],
    },
  ];

  // Endless / daily mode config generator. A seeded rng makes the daily
  // challenge identical for everyone on the same date.
  WB.makeEndless = function (seed) {
    const rng = seed != null ? WB.rngFromSeed(seed) : Math.random;
    const dirs = [1, -1];
    return {
      name: seed != null ? 'Daily Bloom' : 'Endless Garden',
      bg: seed != null ? 'dawn' : 'dusk',
      obj: 'endless', colors: 4,
      rings: [
        { rr: 0.44, dir: dirs[Math.floor(rng() * 2)], speed: 0.28 + rng() * 0.1, fill: 7, capacity: 11 },
        { rr: 0.66, dir: dirs[Math.floor(rng() * 2)], speed: 0.24 + rng() * 0.1, fill: 10, capacity: 15 },
        { rr: 0.88, dir: dirs[Math.floor(rng() * 2)], speed: 0.2 + rng() * 0.08, fill: 12, capacity: 21 },
      ],
      spawn: { interval: 4.6, rings: [0, 1, 2] },  // interval shrinks over time in endless
      shifts: ['reverse', 'surge', 'leap', 'lull'],
      seed: seed,
    };
  };
})(window.WB);

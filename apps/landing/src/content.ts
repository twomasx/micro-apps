/**
 * Every word on the landing page that is about the apps. Each line was checked against the
 * app's own code and pricing config on Oct 15, 2026. If an app changes what it does or what
 * is free, change its line here.
 */

export type ExperimentId = 'personality' | 'focus' | 'breathwork' | 'attention' | 'intention';

export interface Experiment {
  id: ExperimentId;
  number: string;
  name: string;
  path: string;
  youDo: string;
  youGet: string;
}

export const experiments: readonly Experiment[] = [
  {
    id: 'personality',
    number: '01',
    name: 'Personality',
    path: '/personality/',
    youDo: 'Answer a set of short statements about yourself.',
    youGet: 'Your four-letter type and a percentage on each of the four scales.',
  },
  {
    id: 'focus',
    number: '02',
    name: 'Focus',
    path: '/focus/',
    youDo: 'Put on headphones and listen for 10 minutes before you start work.',
    youGet: 'Two tones, one in each ear. The research on them is mixed, so test it on yourself.',
  },
  {
    id: 'breathwork',
    number: '03',
    name: 'Breathwork',
    path: '/breathwork/',
    youDo: "Follow a dot as it traces each technique's shape.",
    youGet: 'Guided breathing you can repeat any time: box, 4-7-8 and the cyclic sigh.',
  },
  {
    id: 'attention',
    number: '04',
    name: 'Attention',
    path: '/attention/',
    youDo: 'Close your eyes and focus on your breath until the bell, 10 minutes a day.',
    youGet: 'A record of the longest stretch you held, and an attention score you can retest.',
  },
  {
    id: 'intention',
    number: '05',
    name: 'Intention',
    path: '/intention/',
    youDo: 'Tap Begin, get one of two colors at random, and try to move it across the screen for 20 seconds.',
    youGet: 'Your results compared against chance.',
  },
];

export const studySheet: readonly [label: string, value: string][] = [
  ['Subject', 'You'],
  ['Experiments', String(experiments.length)],
  ['Cost to start', 'Free'],
  ['Account', 'None needed'],
  ['Full version', 'One-time unlock'],
];

export const protocol: readonly { title: string; text: string }[] = [
  { title: 'Pick an experiment', text: 'Choose the part of your mind you want to measure or train.' },
  { title: 'Run it on yourself', text: "Every app opens in your phone's browser and works for free." },
  { title: 'Read your results', text: 'Want the full version? Unlock it once. No subscription.' },
];

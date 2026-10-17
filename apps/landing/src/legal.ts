/**
 * The terms of use and the refund policy. DRAFTS: Roger approves every line before they go live
 * (PAYMENTS.md, go-live step 1). Lines marked "[Roger: ...]" are decisions only he can make.
 */
export interface LegalPage {
  path: string;
  title: string;
  updated: string;
  intro: string;
  sections: readonly { heading: string; paragraphs: readonly string[] }[];
}

export const CONTACT = 'help@polymadlabs.com';

export const terms: LegalPage = {
  path: '/terms',
  title: 'Terms of use',
  updated: 'Draft of October 16, 2026. Not yet approved.',
  intro: 'These are the rules for using the PolymadLabs apps and buying unlocks in them. They are short on purpose.',
  sections: [
    {
      heading: 'Who runs the apps',
      paragraphs: [`PolymadLabs runs the apps at polymadlabs.com. Write to ${CONTACT} with any question.`],
    },
    {
      heading: 'Using the apps',
      paragraphs: [
        'Every app is free to start, and you need no account. Use the apps for your own information and practice.',
        'Each app is based on published research and says how strong that research is. The apps are not medical or psychological advice, diagnosis or treatment. If you have a health concern, talk to a doctor.',
        'Some results can happen by chance. Each app says when, with a number.',
      ],
    },
    {
      heading: 'Buying an unlock',
      paragraphs: [
        'Some features cost a one-time price. The price is shown before you pay, with the words "once. No renewals." You pay once. There is no subscription and nothing renews.',
        'Stripe handles the payment and emails your receipt. We never see your card details and do not keep your email address.',
        'An unlock is yours for as long as PolymadLabs runs the app.',
      ],
    },
    {
      heading: 'Your code',
      paragraphs: [
        'After you pay, you get a code. It unlocks your purchase on any device where you enter it, up to 5 devices in each app.',
        `Keep your code private. If a code is shared widely, we may replace it and send the new code to the person who bought it. If you lose your code, write to ${CONTACT} with the email you used at checkout.`,
      ],
    },
    {
      heading: 'The PolymadLabs pass',
      paragraphs: [
        'The pass covers every app operated by PolymadLabs, including new ones.',
        'If an app is ever sold or spun off, its own single-app purchases move with it. Pass holders keep access for as long as PolymadLabs runs the app.',
      ],
    },
    {
      heading: 'If an app closes',
      paragraphs: [
        'If we close an app, we will say so in the app at least 30 days before. [Roger: confirm the notice period, and whether recent buyers of that app get a refund.]',
      ],
    },
    {
      heading: 'Refunds',
      paragraphs: ['See the refund policy at polymadlabs.com/refunds.'],
    },
    {
      heading: 'Changes',
      paragraphs: [
        'We may update these terms. The date at the top says when they last changed. A change never takes away an unlock you already bought.',
      ],
    },
    {
      heading: 'The law that applies',
      paragraphs: ['[Roger: name the country and state whose law applies, and the business name and address to show here.]'],
    },
  ],
};

export const refunds: LegalPage = {
  path: '/refunds',
  title: 'Refund policy',
  updated: 'Draft of October 16, 2026. Not yet approved.',
  intro: 'If an unlock is not what you hoped, you can have your money back.',
  sections: [
    {
      heading: 'Within 14 days',
      paragraphs: [
        `Write to ${CONTACT} within 14 days of buying and we refund the full price. You do not need to give a reason.`,
        'Tell us the email you used at checkout, or your code, so we can find the purchase.',
      ],
    },
    {
      heading: 'How long it takes',
      paragraphs: [
        'The refund goes back to the card or wallet you paid with. Banks usually take 5 to 10 business days to show it.',
      ],
    },
    {
      heading: 'What a refund ends',
      paragraphs: [
        'A refund ends the unlock. Within a day, the purchase stops unlocking anything on every device.',
        'Refunding the PolymadLabs pass ends it in every app.',
      ],
    },
    {
      heading: 'After 14 days',
      paragraphs: ['Write to us anyway if something went wrong. We look at each case. [Roger: confirm this line, or set a firm rule.]'],
    },
    {
      heading: 'Asking your bank instead',
      paragraphs: [
        'If you ask your bank to reverse a payment, the unlock ends too. Please write to us first. A refund from us is faster.',
      ],
    },
  ],
};

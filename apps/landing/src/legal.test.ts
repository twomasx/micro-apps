import { describe, expect, it } from 'vitest';
import refundsSource from '../refunds.html?raw';
import termsSource from '../terms.html?raw';
import indexSource from '../index.html?raw';
import { CONTACT, refunds, terms } from './legal.ts';
import { renderPage } from './render.ts';

const words = (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ');

describe('terms and refund pages', () => {
  const pages = [
    { page: terms, html: renderPage(termsSource) },
    { page: refunds, html: renderPage(refundsSource) },
  ];

  it('render every section, with no markers left', () => {
    for (const { page, html } of pages) {
      expect(html).not.toContain('<!-- render:');
      expect(html).toContain(`<h1>${page.title}</h1>`);
      for (const section of page.sections) expect(html).toContain(`<h2>${section.heading}</h2>`);
    }
  });

  it('follow the writing rules: no em dashes, en dashes, exclamation marks or emoji', () => {
    for (const { html } of pages) {
      expect(words(html)).not.toMatch(/[—–!]/);
      expect(words(html)).not.toMatch(/\p{Extended_Pictographic}/u);
    }
  });

  it('say the key promises: one-time prices, 14-day refunds, the contact address, the pass terms', () => {
    const all = pages.map(({ html }) => words(html)).join(' ');
    expect(all).toContain('once. No renewals.');
    expect(all).toContain('within 14 days of buying');
    expect(all).toContain(CONTACT);
    expect(all).toContain('The pass covers every app operated by PolymadLabs, including new ones.');
  });

  it('are marked as drafts and kept out of search until Roger approves them', () => {
    for (const { page, html } of pages) {
      expect(page.updated).toContain('Not yet approved');
      expect(html).toContain('<meta name="robots" content="noindex" />');
    }
  });

  it('are linked from the landing page footer', () => {
    const html = renderPage(indexSource);
    expect(html).toContain('<li><a href="/terms">Terms of use</a></li>');
    expect(html).toContain('<li><a href="/refunds">Refund policy</a></li>');
  });
});

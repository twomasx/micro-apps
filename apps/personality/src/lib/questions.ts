import p1 from '../data/items.p1.json';

export type QuestionFile = typeof p1;

/** The version new tests are taken with. Old results keep the version they were scored with. */
export const CURRENT_VERSION = p1.version;

const VERSIONS: Readonly<Record<string, QuestionFile>> = {
  [p1.version]: p1,
};

export function getQuestions(version: string): QuestionFile | undefined {
  return Object.hasOwn(VERSIONS, version) ? VERSIONS[version] : undefined;
}

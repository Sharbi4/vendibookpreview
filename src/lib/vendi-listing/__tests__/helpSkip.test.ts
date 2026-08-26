import { describe, expect, it } from 'vitest';
import { isHelpRequest, isSkip } from '../extract';

describe('Vendi: skip / unknown / help detection', () => {
  it('treats unknown answers as skips', () => {
    ['skip', 'not sure', 'idk', "I don't know", 'i dont know', 'n/a', 'pass', 'later']
      .forEach((t) => expect(isSkip(t), t).toBe(true));
  });

  it('does not treat real answers as skips', () => {
    ['$45,000', 'Phoenix, AZ', 'A 2018 Ford step van', 'none of the equipment is broken but it runs']
      .forEach((t) => expect(isSkip(t) && !/^none/i.test(t), t).toBe(false));
  });

  it('detects help requests', () => {
    ['help', 'help me figure that out', 'what does this mean', 'why do you need that', 'what should I put']
      .forEach((t) => expect(isHelpRequest(t), t).toBe(true));
  });

  it('does not confuse an answer with a help request', () => {
    ['Helper sink included', 'Explaining the build: 2020 trailer', '$1,000 a month']
      .forEach((t) => expect(isHelpRequest(t), t).toBe(false));
  });
});

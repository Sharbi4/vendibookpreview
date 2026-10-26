import { describe, expect, it } from 'vitest';
import { instantAnswers } from '@/lib/support/instantAnswers';

describe('contact page instant answers', () => {
  it('surfaces the reviewed deposit answer for a buying question', () => {
    const top = instantAnswers('Is there a deposit when I buy a food trailer?');
    expect(top.map((a) => a.question)).toContain('Is there a deposit when I buy equipment?');
  });
  it('stays quiet for short or unrelated text', () => {
    expect(instantAnswers('hi')).toEqual([]);
    expect(instantAnswers('purple elephant banana orchestra')).toEqual([]);
  });
});

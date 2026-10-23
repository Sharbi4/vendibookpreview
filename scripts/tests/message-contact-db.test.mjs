// Isolated PostgreSQL only: no customer messages or production writes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

await test('pre-delivery guard rejects digit-embedded forty variants without blocking listing numbers', async () => {
  const db = new PGlite();
  try {
    const root = new URL('../../drizzle/migrations/', import.meta.url);
    const original = await readFile(new URL('0021_message_contact_spelled_digits.sql', root), 'utf8');
    await db.exec(original);
    const classify = async body => (await db.query(
      'SELECT public.message_contact_info_problem($1) AS problem', [body]
    )).rows[0].problem;
    // Same structure as the incident, with a synthetic number.
    assert.equal(await classify('202555fouty01three'), null);

    const filename = process.env.MESSAGE_CONTACT_MIGRATION ||
      (await readdir(root)).find(name => name.endsWith('_message_contact_forty_variants.sql'));
    assert.ok(filename, 'The focused moderation migration must exist');
    await db.exec(await readFile(new URL(filename, root), 'utf8'));
    await db.exec(`CREATE FUNCTION public.message_normalize(body text) RETURNS text LANGUAGE sql IMMUTABLE
      AS $$ SELECT lower(regexp_replace(coalesce(body,''), '[^a-zA-Z0-9]', '', 'g')) $$;`);
    const contentMigration = await readFile(new URL('0000_block_contact_info_in_messages.sql', root), 'utf8');
    await db.exec(contentMigration.slice(
      contentMigration.indexOf('CREATE OR REPLACE FUNCTION public.message_content_problem'),
      contentMigration.indexOf('CREATE OR REPLACE FUNCTION public.guard_offer_message_contact')
    ));
    for (const variant of ['fouty', 'fourty', 'forty']) {
      for (const isNew of [false, true]) {
        const result = await db.query('SELECT public.message_content_problem($1,$2) AS problem',
          [`202555${variant}01three`, isNew]);
        assert.match(result.rows[0].problem || '', /phone numbers cannot be shared/);
      }
    }
    for (const body of ['Someone wants one trailer for $20,000 and deposit $2,000',
      'It is forty feet long and 8 feet wide.', 'It is fourty feet long.',
      'It is fouty feet long.', 'Generator 9500W, 125 amps, 12000 BTU A/C']) {
      assert.equal(await classify(body), null, body);
    }
    // Existing contact-format checks remain intact.
    await db.exec(await readFile(new URL('../../supabase/tests/message_contact_formats.sql', import.meta.url), 'utf8'));
  } finally {
    await db.close();
  }
});
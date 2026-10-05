# Seller Concierge Onboarding — profile → listing → optimize → share

_Supply Desk · adapted 2026-10-05 from the owner-supplied "Marketplace User Onboarding & Listing Optimization Guide" (Studiotime playbook) · data pulled the same day_

The guide's model: one **named concierge** walks every new seller through 4 steps, with a short personal email at each step. Below it's mapped onto Vendibook's data, with every template rewritten for food-truck and trailer sellers.

## Where our sellers are (123 real sellers with a live listing)

| Profile signal (guide step 1) | Sellers | Note |
|---|---|---|
| Profile photo | **46 (37%)** | |
| Bio (≥40 chars) | **0 (0%)** | Public profiles show the bio (`AboutSection`), but no seller has written one |
| Identity verified | **9 (7%)** | Verified badge |
| Phone on file | 96 (78%) | |
| Active in the last 30 days | 72 | |
| Reviews on the platform | 9 total | |

Listing signals (guide step 3) come from `04-listing-quality.md`. 90 of 121 sale listings have offers off, 55 have fewer than 8 photos, and 47 are missing condition or what's included. `04-listing-scores.csv` now carries `seller_has_photo`, `seller_has_bio` and `seller_id_verified` per row, so it doubles as the concierge worklist.

## The concierge

- **Use a real person**, ideally the founder, signing with their real first name. The guide is explicit that a placeholder persona ("Jill") is only a stand-in. At $10k–$80k, sellers reply to a person.
- Sender: `Brad, Customer Success at Vendibook`, reply-to a monitored inbox. Footer: support@vendibook.com.
- **Honesty rule:** the concierge never claims to have "made your listing live". Sellers publish themselves on Vendibook. The concierge only says what is true about review and recommendations.

## The 4 steps, mapped to Vendibook triggers

| Step | Who | Trigger (data) | Email |
|---|---|---|---|
| 1 Profile | Signed up, no live listing, no avatar | `profiles.avatar_url` empty, no published listing, account ≥24 h old | **V1** |
| 2 First listing | Profile done, or a draft exists, nothing live | Draft and no live listing → `01-draft-recovery.md` sequence. No draft at all → **V2** | V2 / E1 |
| 3 Optimize | Has a live listing, quality score <80 or profile gaps | Listing score from `04-listing-scores.csv` plus profile flags | **V3** (bundles the C-1…C-6 fixes) |
| 4 Share | Score ≥80 and avatar set | Re-scored weekly | **V4** |

Cadence: one concierge email per seller per 14 days at most, and a seller is only ever in one step at a time. Step 3 takes priority over the generic coaching emails in 04, so a seller never gets both.

Current queue sizes:

- **Step 3:** 99 listings score under 80. Their sellers get V3 with their top 3 fixes, plus "add a photo and bio" for the 77 sellers without a photo and all 123 without a bio.
- **Step 4:** the 31 A-band listings whose seller has a photo get V4. Check the `seller_has_photo` column.

### V1: Profile first (no listing yet)

**Subject:** Welcome to Vendibook, a quick tip before you list

> Hi {first_name},
>
> Thanks for joining Vendibook. I'm Brad, and I help sellers get set up.
>
> Before you add your truck or trailer, add a **profile photo** and a **two-line bio** (how long you've run it, what you served, why you're selling). Buyers spending this much want to know who they're buying from, and a real face and story is the single biggest trust signal on a listing. Then **verify your ID** for the verified badge.
>
> **[Finish my profile →]({profile_url})**
>
> When you're ready, listing takes about 10 minutes: {list_url}. Here's a listing that does it well: {example_listing_url}.
>
> Just reply if you want help. I read every one.
> Brad  
> Customer Success, Vendibook

### V2: First listing (profile done, nothing started)

**Subject:** Ready to list your {category_guess|food truck}?

> Hi {first_name}, I saw you set up your profile but haven't added your listing yet. It takes about 10 minutes, or you can just tell Vendi about your unit and it drafts the listing for you: {vendi_url}. Listing is free. Here's a strong example: {example_listing_url}.
> Reply with any questions.
> Brad

### V3: Optimize (live listing, score under 80 or profile gaps)

**Subject:** Your {title} is live, and 3 changes to get more buyer messages

> Hi {first_name},
>
> Your **{title}** is live on Vendibook ({listing_url}). I went through it, and these are the changes that will make the biggest difference:
>
> {fix_1}
> {fix_2}
> {fix_3}
>
> {if no avatar or bio: "Also: add a photo and a short bio to your profile ({profile_url}). Buyers check who they're dealing with before they message."}
>
> Each one takes a few minutes, and the link opens your listing editor. Reply if you'd like me to look again afterwards.
> Brad

Fix lines, used in this order and pulled from the CSV `top_fixes` column:

| Fix | Line |
|---|---|
| turn on offers | **Turn on offers.** Most buyers at your price start with an offer. You can set a minimum so lowballs never reach you. {edit_url} |
| add photos | **Get to 8+ photos.** Both sides and the back, the serving window, the full kitchen line, the hood and suppression tag, the generator, and the data plate. Use the best exterior shot as the cover. {edit_url} |
| condition / title / included | **Answer the 3 buyer questions:** condition, title status, and what's included in the price. {edit_url} |
| expand description | **Tell the story.** Who built it, what you served, the permit or health history, recent upgrades, and why you're selling. Write it for someone who has never seen it. {edit_url} |
| add walkaround video | **Add a 60-second walkaround.** Phone video, no editing. {edit_url} |
| back up price vs comps | **Show why it's worth {price}.** Add the build year and an equipment list with brands. {edit_url} |
| turn on instant book (rent) | **Turn on instant book** so renters can reserve open dates right away. {edit_url} |

### V4: Share (score ≥80 and avatar set)

**Subject:** Your {title} looks great. Want us to share it?

> Hi {first_name}, thanks for putting the work in. Your listing is one of the strongest on Vendibook. We'll point buyers who ask for a {category} in {metro} toward it.
>
> If you post it on Instagram or Facebook, tag **@vendibook** (instagram.com/vendibook) and we'll reshare it. Adding your Vendibook listing link to your bio or page helps buyers find it too: {listing_url}
>
> Brad

_Truthfulness: say "we'll point buyers toward it" only while the Buyer Desk is actually matching inbound requests (MUSE-1 / hot-but-cold). Resharing a tagged post is a MUSE-5 task, and it must follow the Muse guardrails (disclosed, no fake reviews)._

## How this changes the other Supply Desk docs

- **04 coaching:** the C-1…C-6 messages become the fix lines inside V3, so each seller gets one concierge email rather than several coaching emails.
- **Profile completeness is now part of quality.** Profile photo, bio and ID verification are added to the CSV. They're tracked next to the listing score, not inside it, so listing scores stay comparable across sellers.
- **Product (LP-6 in 06):** add a "Complete your profile" checklist (photo, bio, ID verification) on the seller dashboard, next to the listing health card.

status: draft

# Privacy

## What we store on our server

When you finish a test we store:

- your answers: 40 for the four-letter test, 100 for the Big Five test
- your scores: four percentages and your four-letter type, or five trait scores and ten aspect scores
- the date and time
- a scrambled copy of your delete code, so we can check it later

We do not ask for your name or email, and we do not store them. Your result gets a random 16-character ID. Nothing in it identifies you.

We keep your answers so that we can check how well the questions work and rescore results if we improve the scoring.

## What is stored on your device

Your browser stores:

- your progress while you take the test, so a reload does not lose it. This is removed when you submit.
- a list of your result IDs and their delete codes, so the site can show "Your last result" and let you delete it.

This stays in your browser. Clearing your browser's site data removes it.

## Who can see your result

Anyone who has the link to your result can see your type and your four percentages, or your five trait scores. They cannot see your individual answers. If you send someone a compare link, they will see your result.

A comparison has its own link. Anyone who has it can see both results in it. The full reports and couple reports open only on a device with the Personality unlock or a PolymadLabs pass. A link alone does not open them.

## If you pay

Payment happens on Stripe's page. Stripe collects your email and card details and sends you a receipt. We never see your card number, and we do not copy your email into our database.

After paying you get an unlock code. This browser keeps the code and a random device id, and sends both with each request for a report, so our server can check them.

On our server we keep one record of the purchase:

- Stripe's reference for the payment, the amount, the currency, whether it is paid, and the date.
- A scrambled form of your unlock code (a hash). The code itself cannot be read back from it.
- The random device ids that used the code, with the day each was first and last seen. A code works on up to 5 devices, so it cannot be shared widely.
- For each day the code is checked, a scrambled form of the network addresses it was checked from, to spot a code used from many places. The addresses themselves are not kept.

Purchases made before November 2026 unlocked one result instead. Their records also say which result they unlocked.

## If you use a PolymadLabs pass

With a PolymadLabs pass, every full report, the Big Five report and every couple report are unlocked. The test keeps your pass code and a random device id in this browser's storage. When you open a report, our server sends both to the PolymadLabs pass service to check the pass. The pass service keeps the device ids that used each code, with the day each was first seen, so one code cannot be shared widely. The pass privacy note at polymadlabs.com/pass/privacy has the details.

## How long we keep it

We keep a result until you delete it. Purchase records are kept for accounting and so your unlock code keeps working. Device ids and scrambled addresses are deleted once they have not been seen for a year.

## How to delete your result

Open your result on the device you took the test on and press "Delete this result". It is removed from our server right away.

Deleting needs the delete code saved in your browser. If you cleared your browser data or changed device, the button will not be there.

## What we do not do

- No advertising.
- No outside analytics or tracking services.
- We do not sell or share your data.

## Where it is stored

Results are stored in a database run by Cloudflare, the company that hosts this site.

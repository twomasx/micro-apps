# Intention: for Roger

Design decisions with their reasons are in `DESIGN-NOTES.md`. This list is what needs you.

## Phone review of the tug screen (step 2)

Check on Android Chrome first, then iPhone Safari. Locally at http://localhost:3005/intention/, or after deploy.

- [ ] The seam feels alive but calm, and it follows the score without twitching or trailing.
- [ ] Specks read as faint light, not as dots or noise.
- [ ] Your color's glow along the seam is noticeable but quiet.
- [ ] The headline naming your color stays long enough to read (1.6 s), then fades.
- [ ] The quiet Stop button during a run: keep it, or hide it like the sketch?
- [ ] The wording during a run: "Hold Glacier in mind and will it across."
- [ ] Text reads on every pair. The edge shading is now worked out per pair (table in `DESIGN-NOTES.md`).
- [ ] 60 fps on your phone during a run, with no stutter at the end.

## Phone review of the colors (step 3)

- [ ] The fan opens with a light bounce and folds back cleanly. Nothing runs off a narrow screen.
- [ ] Android Back closes the fan, then the picker sheet, before it leaves the page.
- [ ] The color wells in the picker open Android's color picker, and the field behind updates as you pick.
- [ ] Day and Night: the darker edge shading it needs still looks like the same app.

## Phone review of Intention Hour and the global page (step 4)

- [ ] The Intention Hour line on the home screen in the 3 hours before 9:00 pm Pacific and during the 10 minutes.
- [ ] Add to calendar on Android: the .ics opens in your calendar app and shows the right local time.
- [ ] The global chart reads at a glance on the phone.

## Before launch (step 5)

- [ ] The science page's five sources were written from the literature as I know it. Please check the page ranges and author lists against the papers before launch.
- [ ] Your history follows the device, not the Lab Pass code. Restoring Lab Pass on a new phone unlocks the features there, but that phone starts a new list. Linking history to the code would need a decision about privacy. Fine as it is?

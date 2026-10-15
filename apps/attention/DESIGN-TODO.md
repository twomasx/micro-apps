# Attention: open decisions for Roger

Decisions built the simplest way for now that need your call. What has been decided, and why, is in `DESIGN-NOTES.md`.

## Open decisions

1. **The sounds.** Try them at `/attention/sounds` (development only). Say if the tok is too quiet on the speaker, the bell too bright, or the tick too easy or too hard to hear.
2. **Default volume** is 80%. **Tick probes are on by default.**
3. **Today's title** is "One breath, one circle" every day, from the reference. It could change with the day ("Day 12") or the moment.
4. **A new user's Today** shows the baseline test prompt above Begin, so on small phones (667 px tall) Begin is one short scroll down. Returning users see Begin without scrolling. The prompt could shrink to one line instead.
5. **The "End" link during a stretch** stays visible at 35%. It could be hidden until the bell, which is calmer but leaves no way out mid-stretch except Back.
6. **Android Back during a session** goes back to Today. Every answered stretch is already saved. There is no "are you sure" step.
7. **The focus total** (2:14 of 10:00) shows at the top all through the session. It could appear only between stretches.
8. **Session complete** has empty space under the facts on tall phones. It could hold a short line about tomorrow or a link to the progress page.
9. **The pencil guide circle** shows under the brush during a stretch and on Today. It could be dropped for a bare page.
10. **Locked sizes** (15, 20, Study) are shown grayed out for free users, with one line about the unlock.

## Device checks still open

- Android Chrome: tok and bell through the speaker and headphones, the double buzz at the start and the single buzz at the end, the screen staying awake, the dimming during a stretch.
- iPhone Safari: the sounds with the silent switch on (they are set to play through it, as in breathwork).
- How the brush looks on a real phone screen at 3x density (the canvas draws at 2x at most, to save battery).

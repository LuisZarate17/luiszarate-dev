/**
 * The timeline's interaction in "How it was built". Progressive: without it the marks are
 * plain links to the cards, which are native `details`.
 *
 *  - a link to a card (`a[href="#pr-…"]`, in the timeline or the crew list) opens that card in
 *    place, moves focus to it and brings it into the frame, instead of a scene cut;
 *  - the mark and branch of the open card are shown as current, however the card was opened;
 *  - Left, Right, Home and End move between the marks.
 *
 * Nothing here animates, so reduced motion needs no branch. No imports: this is its own small
 * chunk, fetched when the section comes near (see Built.astro; capped by check-budget).
 */
const CARD = "details.pr";
const MARKS = ".tl-prs a";

/** The card a link points to, when it points to one. */
function cardFor(section: HTMLElement, link: HTMLAnchorElement): HTMLDetailsElement | null {
  const id = link.hash.slice(1);
  if (!id.startsWith("pr-")) return null;
  const card = document.getElementById(id);
  return card instanceof HTMLDetailsElement && section.contains(card) ? card : null;
}

/** How far to scroll so the card sits between the letterbox bars; 0 when it already does. */
export function frameShift(
  card: { top: number; bottom: number },
  frame: { top: number; bottom: number },
  margin = 8,
): number {
  const top = frame.top + margin;
  const bottom = frame.bottom - margin;
  if (card.top < top || card.bottom - card.top > bottom - top) return card.top - top;
  if (card.bottom > bottom) return card.bottom - bottom;
  return 0;
}

function intoFrame(section: HTMLElement, card: HTMLElement) {
  let top = document.querySelector(".frame-bar--top")?.getBoundingClientRect().bottom ?? 0;
  const bottom =
    document.querySelector(".frame-bar--bottom")?.getBoundingClientRect().top ?? window.innerHeight;
  // Where the timeline sticks under the top bar, the frame starts below it.
  const strip = section.querySelector<HTMLElement>(".tl");
  if (strip && getComputedStyle(strip).position === "sticky") top += strip.offsetHeight;
  const shift = frameShift(card.getBoundingClientRect(), { top, bottom });
  if (shift !== 0) window.scrollBy({ top: shift, left: 0, behavior: "instant" });
}

export function startBuildTimeline(section: HTMLElement) {
  const marks = [...section.querySelectorAll<HTMLAnchorElement>(MARKS)];

  const sync = () => {
    const open = section.querySelector<HTMLDetailsElement>(`${CARD}[open]`);
    const number = open?.id.slice(3) ?? "";
    for (const mark of marks) {
      if (open && mark.hash === `#${open.id}`) {
        mark.setAttribute("aria-current", "true");
        // Keep the current mark in view when the strip scrolls sideways (phones).
        const strip = mark.closest<HTMLElement>(".tl");
        if (strip && strip.scrollWidth > strip.clientWidth) {
          const m = mark.getBoundingClientRect();
          const s = strip.getBoundingClientRect();
          if (m.left < s.left) strip.scrollLeft += m.left - s.left;
          else if (m.right > s.right) strip.scrollLeft += m.right - s.right;
        }
      } else mark.removeAttribute("aria-current");
    }
    for (const el of section.querySelectorAll<HTMLElement>(".tl-art [data-pr]"))
      el.classList.toggle("is-on", el.dataset["pr"] === number);
  };

  const show = (card: HTMLDetailsElement) => {
    card.open = true;
    sync();
    card.querySelector<HTMLElement>("summary")?.focus({ preventScroll: true });
    intoFrame(section, card);
  };

  // Before the document-level scene cut sees the click (it skips a prevented event).
  section.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href^='#pr-']");
    const card = link && cardFor(section, link);
    if (!card) return;
    event.preventDefault();
    show(card);
  });

  // `toggle` does not bubble: listen in the capture phase. It covers a card opened by its own
  // summary, by find-in-page, or closed by another card of the same name opening.
  section.addEventListener(
    "toggle",
    (event) => {
      if ((event.target as Element).matches(CARD)) sync();
    },
    true,
  );

  section.addEventListener("keydown", (event) => {
    const at = marks.indexOf(event.target as HTMLAnchorElement);
    if (at === -1 || event.altKey || event.ctrlKey || event.metaKey) return;
    const to =
      event.key === "ArrowRight"
        ? at + 1
        : event.key === "ArrowLeft"
          ? at - 1
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? marks.length - 1
              : -1;
    const next = marks[to];
    if (!next) return;
    event.preventDefault();
    next.focus();
  });

  // A page opened on a card's link.
  const target = document.getElementById(location.hash.slice(1));
  if (target instanceof HTMLDetailsElement && target.matches(CARD) && section.contains(target)) {
    target.open = true;
    intoFrame(section, target);
  }
  sync();
}

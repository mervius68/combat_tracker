// Values that describe the same event highlight together when you hover either one.
//
// Two kinds of pair, each keyed by an id that is already on the elements:
//   data-hp-tid   a damage number and the HP value it produced   (ct_tbl_target.tID)
//   data-aid      an action and the comment it wrote             (ct_tbl_action.aID)
//
// A pair is only highlighted when both ends are on screen, so hovering a value whose
// counterpart sits in a round you have filtered out does nothing.
//
// This module also owns the markup that creates the links, so the tagging and the
// behaviour that depends on it stay in one place.

const LINK_ATTRIBUTES = ["data-hp-tid", "data-aid"];

let linkListenersAttached = false;
let highlightedLinks = [];

// ---------------------------------------------------------------- link markup

// One entry of a participant's HP list. index 0 is the value carried in from the
// previous round rather than a result of damage in this round, so it is left
// untagged and nothing pairs with it.
function hpValueMarkup(hp, index, startingHp) {
    const label = hp.newHP == startingHp ? "<b>" + hp.newHP + "</b>" : hp.newHP;
    if (index > 0 && hp.tID) {
        return `<span class="hp-link" data-hp-tid="${hp.tID}">${label}</span>`;
    }
    return label;
}

// One target's damage inside an action's hp cell.
function hpDamageMarkup(target) {
    if (!target) {
        return "";
    }
    if (!target.tID) {
        return target.damage; // render exactly as before, just unpaired
    }
    return `<span class="hp-link" data-hp-tid="${target.tID}">${target.damage}</span>`;
}

// A start or end note, tagged with the action that wrote it.
//
// Deliberately without the `notes` class the Notes column uses: the context menu
// keys "Edit Action" / "Delete Note" off that class, and those columns have never
// offered it.
function actionNoteMarkup(text, aID) {
    if (!aID) {
        return text;
    }
    return `<span data-aid="${aID}">${text}</span>`;
}

// ------------------------------------------------------------ hover behaviour

// the nearest element at or above the cursor that takes part in a pair
function linkSourceFromEvent(event) {
    const element = event.target.closest?.(LINK_ATTRIBUTES.map((a) => `[${a}]`).join(","));
    if (!element) {
        return null;
    }
    // an empty id links nothing
    const attribute = LINK_ATTRIBUTES.find((a) => element.getAttribute(a));
    return attribute ? { attribute, value: element.getAttribute(attribute) } : null;
}

// a round the user has filtered out is display:none, which leaves its
// descendants with no offsetParent
function isOnScreen(element) {
    return element.offsetParent !== null;
}

// mouseout fires constantly while moving around the tracker, so track what is lit
// rather than querying the document every time
function clearLinkHighlight() {
    if (!highlightedLinks.length) {
        return;
    }
    highlightedLinks.forEach((element) => element.classList.remove("linked-hover"));
    highlightedLinks = [];
}

function handleLinkOver(event) {
    const source = linkSourceFromEvent(event);
    if (!source) {
        return;
    }
    // matched in JS rather than through a selector so the id never has to be escaped
    const linked = Array.from(document.querySelectorAll(`[${source.attribute}]`))
        .filter((element) => element.getAttribute(source.attribute) === source.value)
        .filter(isOnScreen);

    // nothing to pair with on this page - never mind
    if (linked.length < 2) {
        return;
    }
    linked.forEach((element) => element.classList.add("linked-hover"));
    highlightedLinks = linked;
}

// called at the end of load_encounter, once the rounds are in the DOM
function enableLinkedHighlighting() {
    const container = document.querySelector(".ct_round_container");
    // load_encounter replaces the container's innerHTML (and runs more than once
    // per refresh), so delegate from the container and only ever attach once.
    // mouseover/mouseout rather than mouseenter/mouseleave because these bubble.
    if (!container || linkListenersAttached) {
        return;
    }
    container.addEventListener("mouseover", handleLinkOver);
    container.addEventListener("mouseout", clearLinkHighlight);
    linkListenersAttached = true;
}

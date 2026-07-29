// Pairs a damage number in an action's "hp" column with the HP value it produced
// in that participant's "HP" column, and highlights both on hover.
//
// The link is ct_tbl_target.tID: one target row is one damage against one
// participant in one round, producing one new_hp. So each tID tags exactly two
// spans - the damage that was dealt and the resulting HP.
//
// Highlighting is skipped unless both ends are actually on screen, so hovering a
// value whose counterpart lives in a round the user has filtered out does nothing.

let hpLinkListenersAttached = false;
let highlightedHpLinks = [];

// Markup for one entry of a participant's HP list. index 0 is the value carried
// in from the previous round rather than a result of damage in this round, so it
// is left untagged and nothing pairs with it.
function hpValueMarkup(hp, index, startingHp) {
    const label = hp.newHP == startingHp ? "<b>" + hp.newHP + "</b>" : hp.newHP;
    if (index > 0 && hp.tID) {
        return `<span class="hp-link" data-hp-tid="${hp.tID}">${label}</span>`;
    }
    return label;
}

// Markup for one target's damage inside an action's hp cell.
function hpDamageMarkup(target) {
    if (!target) {
        return "";
    }
    if (!target.tID) {
        return target.damage; // render exactly as before, just unpaired
    }
    return `<span class="hp-link" data-hp-tid="${target.tID}">${target.damage}</span>`;
}

// a round the user has filtered out is display:none, which leaves its
// descendants with no offsetParent
function isOnScreen(element) {
    return element.offsetParent !== null;
}

// mouseout fires constantly while moving around the tracker, so track what is lit
// rather than querying the document every time
function clearHpLinkHighlight() {
    if (!highlightedHpLinks.length) {
        return;
    }
    highlightedHpLinks.forEach((element) => element.classList.remove("hp-linked"));
    highlightedHpLinks = [];
}

function handleHpLinkOver(event) {
    const source = event.target.closest?.("[data-hp-tid]");
    if (!source) {
        return;
    }
    const linked = Array.from(
        document.querySelectorAll(`[data-hp-tid="${source.getAttribute("data-hp-tid")}"]`)
    ).filter(isOnScreen);

    // nothing to pair with on this page - never mind
    if (linked.length < 2) {
        return;
    }
    linked.forEach((element) => element.classList.add("hp-linked"));
    highlightedHpLinks = linked;
}

// called at the end of load_encounter, once the rounds are in the DOM
function enableHpLinkHighlighting() {
    const container = document.querySelector(".ct_round_container");
    // load_encounter replaces the container's innerHTML (and runs more than once
    // per refresh), so delegate from the container and only ever attach once.
    // mouseover/mouseout rather than mouseenter/mouseleave because these bubble.
    if (!container || hpLinkListenersAttached) {
        return;
    }
    container.addEventListener("mouseover", handleHpLinkOver);
    container.addEventListener("mouseout", clearHpLinkHighlight);
    hpLinkListenersAttached = true;
}

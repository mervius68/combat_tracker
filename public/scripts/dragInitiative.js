// Drag-and-drop reordering of participant rows in the combat tracker.
//
// Rows are ordered by the server with
//   ORDER BY init DESC, secondary_init DESC, init_modifier DESC, character_name, numeric_value ASC
// so dropping a row in a new spot means writing init / secondary_init values that
// land the participant between its two new neighbors:
//   - if a whole number is free between them, the row takes (row above's init - 1)
//   - if the neighbors are tied or consecutive, secondary_init decides the order
//     inside that initiative group instead

const SECONDARY_INIT_DEFAULT = 10;

let draggedInitiativePid = null;
let dragHoverPid = null;
let dragHoverPlacement = null;
let initiativeDragListenersAttached = false;

function initOf(participant) {
    return parseInt(participant?.init, 10) || 0;
}

function secondaryInitOf(participant) {
    const value = parseInt(participant?.secondary_init, 10);
    return Number.isNaN(value) ? SECONDARY_INIT_DEFAULT : value;
}

// give every member of one initiative group a distinct secondary_init so the
// order the user sees is written down rather than left to the name/modifier
// tiebreakers; the moved participant joins the group at targetInit
function respreadSecondaryInit(orderedParticipants, movedIndex, targetInit) {
    const group = orderedParticipants.filter(
        (participant, index) => index === movedIndex || initOf(participant) === targetInit
    );
    return group.map((participant, index) => ({
        pID: participant.pID,
        init: targetInit,
        secondary_init: group.length - index,
    }));
}

// orderedParticipants is the desired top-to-bottom order; movedIndex is where the
// dragged participant landed. Returns the smallest set of initiative updates that
// makes the server produce that order.
function computeInitiativeUpdates(orderedParticipants, movedIndex) {
    if (orderedParticipants.length < 2) {
        return [];
    }

    const moved = orderedParticipants[movedIndex];
    const above = orderedParticipants[movedIndex - 1] || null;
    const below = orderedParticipants[movedIndex + 1] || null;

    // dropped at the top: one better than the current leader
    if (!above) {
        return [{
            pID: moved.pID,
            init: initOf(below) + 1,
            secondary_init: SECONDARY_INIT_DEFAULT,
        }];
    }

    const aboveInit = initOf(above);

    // dropped at the bottom: one below the current tail, if there is room
    if (!below) {
        if (aboveInit - 1 >= 1) {
            return [{
                pID: moved.pID,
                init: aboveInit - 1,
                secondary_init: SECONDARY_INIT_DEFAULT,
            }];
        }
        return respreadSecondaryInit(orderedParticipants, movedIndex, aboveInit);
    }

    const belowInit = initOf(below);

    // a whole initiative number is free between the neighbors
    if (aboveInit - belowInit >= 2) {
        return [{
            pID: moved.pID,
            init: aboveInit - 1,
            secondary_init: SECONDARY_INIT_DEFAULT,
        }];
    }

    // the neighbors are tied and there is a free secondary initiative between them
    if (aboveInit === belowInit && secondaryInitOf(above) - secondaryInitOf(below) >= 2) {
        return [{
            pID: moved.pID,
            init: aboveInit,
            secondary_init: secondaryInitOf(above) - 1,
        }];
    }

    // neighbors are tied with no gap, or consecutive with no whole number between:
    // join the group above and rewrite that group's secondary initiatives
    return respreadSecondaryInit(orderedParticipants, movedIndex, aboveInit);
}

async function persistInitiativeUpdates(updates) {
    const lookup = new Map(ctApp.map((participant) => [String(participant.pID), participant]));
    const postData = updates.map((update) => ({
        pID: update.pID,
        // /orderInitiative also writes numeric_value, so hand back what the
        // participant already has instead of blanking the monster numbering
        numeric_value: lookup.get(String(update.pID))?.numeric_value ?? "",
        init: update.init,
        secondary_init: update.secondary_init,
    }));
    await dbQueryPost("orderInitiative", postData);
}

// the four section-1 cells of each participant row, top row first
function initiativeRowAnchors(roundElement) {
    return Array.from(roundElement.querySelectorAll('[data-section="1"] [data-participant]'));
}

function initiativeRowCells(pid, roundElement) {
    return Array.from(roundElement.querySelectorAll(`[data-drag-pid="${pid}"]`));
}

function clearDragHighlight() {
    document
        .querySelectorAll(".drag-row-dragging, .drag-row-above, .drag-row-below")
        .forEach((cell) => {
            cell.classList.remove("drag-row-dragging", "drag-row-above", "drag-row-below");
        });
    dragHoverPid = null;
    dragHoverPlacement = null;
}

// above or below the target row, based on which half of it the cursor is over
function dropPlacement(event, targetCell) {
    const rect = targetCell.getBoundingClientRect();
    return event.clientY - rect.top < rect.height / 2 ? "above" : "below";
}

function draggableCellFromEvent(event) {
    const cell = event.target.closest?.("[data-drag-pid]");
    return cell && cell.closest('[data-section="1"]') ? cell : null;
}

function handleInitiativeDragStart(event) {
    const cell = draggableCellFromEvent(event);
    if (!cell) {
        return;
    }
    draggedInitiativePid = cell.getAttribute("data-drag-pid");
    const roundElement = cell.closest(".ct_round");
    initiativeRowCells(draggedInitiativePid, roundElement).forEach((rowCell) => {
        rowCell.classList.add("drag-row-dragging");
    });
    try {
        event.dataTransfer.effectAllowed = "move";
        // Firefox will not start a drag without payload
        event.dataTransfer.setData("text/plain", draggedInitiativePid);
    } catch (err) { }
}

function handleInitiativeDragOver(event) {
    const cell = draggableCellFromEvent(event);
    if (!cell || !draggedInitiativePid) {
        return;
    }
    const targetPid = cell.getAttribute("data-drag-pid");
    const roundElement = cell.closest(".ct_round");
    // only reorder against rows in the same round
    if (!roundElement || !initiativeRowCells(draggedInitiativePid, roundElement).length) {
        return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    if (targetPid === draggedInitiativePid) {
        return;
    }
    const placement = dropPlacement(event, cell);
    if (targetPid === dragHoverPid && placement === dragHoverPlacement) {
        return;
    }
    document.querySelectorAll(".drag-row-above, .drag-row-below").forEach((rowCell) => {
        rowCell.classList.remove("drag-row-above", "drag-row-below");
    });
    initiativeRowCells(targetPid, roundElement).forEach((rowCell) => {
        rowCell.classList.add(placement === "above" ? "drag-row-above" : "drag-row-below");
    });
    dragHoverPid = targetPid;
    dragHoverPlacement = placement;
}

async function handleInitiativeDrop(event) {
    const cell = draggableCellFromEvent(event);
    if (!cell || !draggedInitiativePid) {
        return;
    }
    event.preventDefault();
    const targetPid = cell.getAttribute("data-drag-pid");
    const roundElement = cell.closest(".ct_round");
    const movedPid = draggedInitiativePid;
    const placement = dropPlacement(event, cell);
    clearDragHighlight();
    draggedInitiativePid = null;

    if (!roundElement || targetPid === movedPid) {
        return;
    }

    const currentOrder = initiativeRowAnchors(roundElement).map((anchor) =>
        anchor.getAttribute("data-participant")
    );
    if (!currentOrder.includes(movedPid) || !currentOrder.includes(targetPid)) {
        return;
    }

    const newOrder = currentOrder.filter((pid) => pid !== movedPid);
    newOrder.splice(newOrder.indexOf(targetPid) + (placement === "below" ? 1 : 0), 0, movedPid);
    if (newOrder.join() === currentOrder.join()) {
        return; // dropped back into the spot it already occupied
    }

    const lookup = new Map(ctApp.map((participant) => [String(participant.pID), participant]));
    const orderedParticipants = newOrder.map((pid) => lookup.get(pid));
    if (orderedParticipants.some((participant) => !participant)) {
        return;
    }

    const updates = computeInitiativeUpdates(orderedParticipants, newOrder.indexOf(movedPid));
    if (!updates.length) {
        return;
    }

    try {
        await persistInitiativeUpdates(updates);
    } catch (err) {
        console.error("Could not save the new initiative order:", err);
        return; // nothing was reordered on screen, so the view is still accurate
    }
    refresh_encounter();
}

function handleInitiativeDragEnd() {
    clearDragHighlight();
    draggedInitiativePid = null;
}

// called at the end of load_encounter, once the rounds are in the DOM
function enableInitiativeRowDragging() {
    const container = document.querySelector(".ct_round_container");
    if (!container) {
        return;
    }

    // tag all four cells of each participant row; the AC cell is the only one
    // carrying data-participant, so walk its three siblings
    container.querySelectorAll('[data-section="1"] [data-participant]').forEach((anchor) => {
        const pid = anchor.getAttribute("data-participant");
        let cell = anchor;
        for (let i = 0; i < 4 && cell; i++) {
            cell.setAttribute("draggable", "true");
            cell.setAttribute("data-drag-pid", pid);
            cell.classList.add("drag-row");
            cell = cell.nextElementSibling;
        }
    });

    // load_encounter replaces the container's innerHTML (and runs more than once
    // per refresh), so delegate from the container and only ever attach once
    if (initiativeDragListenersAttached) {
        return;
    }
    container.addEventListener("dragstart", handleInitiativeDragStart);
    container.addEventListener("dragover", handleInitiativeDragOver);
    container.addEventListener("drop", handleInitiativeDrop);
    container.addEventListener("dragend", handleInitiativeDragEnd);
    initiativeDragListenersAttached = true;
}

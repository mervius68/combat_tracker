// The character library: the pool of characters participants are drawn from, and
// the tools - weapons, spells, anything an action can name - that hang off each of
// them. Neither table had a modal, so both were filled in with a SQLite client.
//
// One modal rather than two: a tool is stored against a chID, so it can only be
// shown under the character that owns it, and a character that has not been saved
// yet says so instead of offering a tools panel with nowhere to put anything.
//
// The modal reads itself back from the database after every write. Patching the
// list in place is the alternative, and the list is small enough that reading it
// again is both simpler and always right.

// What the modal is showing: the character whose sheet is open, and which of its
// tools. Held outside the render so a save can reopen on the same character - and
// the same tool - rather than throwing the user back to the list. Either can be the
// string "new", meaning a row being filled in that does not exist yet. filter is
// what has been typed into the box above the opponents, and is held here for the
// same reason: a save redraws the list, and it should come back narrowed the way it
// was left rather than wide open behind the text still in the box.
let characterLibrary = { chID: null, toolID: null, filter: "" };

async function manageCharactersModal(chID = null) {
    characterLibrary = { chID: chID, toolID: null, filter: "" };
    await renderCharacterLibrary();
    pushModal();
    scrollModalToTop();
    modalIsOpen = true;
    // a character to open goes straight to its name; otherwise finding one is the
    // first thing to be done, and the list is far too long to do it by eye
    focusFormField(chID != null ? "libCharacterName" : "libOpponentFilter");
}

async function renderCharacterLibrary() {
    const modalBody = document.querySelector("#modal-body");
    const characters = await dbQuery("GET", "allCharacters");

    // How far down the opponents the list had been scrolled. The modal is rebuilt in
    // full on every click, so without this the new list comes back at the top and the
    // name that was just picked is somewhere off the bottom of it.
    const wasScrolledTo = opponentScrollTop();

    const container = document.createElement("div");
    container.classList.add("modal-body");

    const heading = document.createElement("h1");
    heading.classList.add("center");
    heading.classList.add("library-heading");
    heading.innerText = "CHARACTER LIBRARY";
    container.appendChild(heading);

    const columns = document.createElement("div");
    columns.classList.add("library-container");
    columns.appendChild(characterListPanel(characters));
    columns.appendChild(await characterFormPanel(characters));
    container.appendChild(columns);

    const footer = document.createElement("div");
    footer.classList.add("center");
    footer.classList.add("update-close-container");
    const close = document.createElement("button");
    close.innerText = "CLOSE";
    close.classList.add("close-modal");
    close.addEventListener("click", closeModal);
    footer.appendChild(close);
    container.appendChild(footer);

    modalBody.innerHTML = "";
    modalBody.appendChild(container);

    // the rows are built in full and then narrowed, so this runs once they are on
    // the page and can be hidden
    applyOpponentFilter();
    // after the narrowing, which is what decides how far the list can be scrolled
    setOpponentScrollTop(wasScrolledTo);
}

// The scrolling box around the opponents, once there is one: the players' group is
// drawn without it, and neither is there before the first render.
function opponentScroller() {
    return document.querySelector(".library-scroll");
}

function opponentScrollTop() {
    const scroller = opponentScroller();
    return scroller ? scroller.scrollTop : 0;
}

function setOpponentScrollTop(top) {
    const scroller = opponentScroller();
    if (scroller) {
        // clamped by the browser, so a list that has since grown shorter - a character
        // deleted, or the filter narrowed - lands at the bottom rather than nowhere
        scroller.scrollTop = top;
    }
}

// The list down the left: the same two groups the participant modal offers, plus
// the way in to a character that does not exist yet.
function characterListPanel(characters) {
    const panel = document.createElement("div");
    panel.classList.add("library-list");

    const newCharacter = document.createElement("button");
    newCharacter.innerText = "+ NEW CHARACTER";
    newCharacter.addEventListener("click", () => openLibraryCharacter("new"));
    panel.appendChild(newCharacter);

    [
        { heading: "Player Characters", pc: true },
        { heading: "Opponents", pc: false },
    ].forEach((group) => {
        const title = document.createElement("h3");
        title.innerText = group.heading;
        panel.appendChild(title);

        const inGroup = characters.filter(
            (character) => flagIsSet(character.pc) === group.pc
        );
        if (inGroup.length === 0) {
            const empty = document.createElement("div");
            empty.classList.add("library-empty");
            empty.innerText = "none yet";
            panel.appendChild(empty);
            return;
        }
        // Only the opponents get the filter and a scrolling box of their own: a
        // campaign that has been running a while has a few hundred of them, and at
        // full length they made the modal several screens tall, while the players are
        // a handful sitting right above. The filter is left outside the scrolling
        // part, so it is still there to be corrected once the list has moved.
        let rows = panel;
        if (!group.pc) {
            panel.appendChild(opponentFilterLine());
            panel.appendChild(noMatchesNote());
            rows = document.createElement("div");
            rows.classList.add("library-scroll");
            panel.appendChild(rows);
        }
        inGroup.forEach((character) => {
            const row = document.createElement("div");
            row.classList.add("library-row");
            if (character.chID == characterLibrary.chID) {
                row.classList.add("library-row-open");
            }
            // what applyOpponentFilter narrows; the players are left alone
            if (!group.pc) {
                row.setAttribute("data-opponent", "");
            }
            row.innerText = character.character_name;
            // the row is one line and clips, so the whole name is here to hover for
            row.setAttribute("title", character.character_name);
            row.addEventListener("click", () => openLibraryCharacter(character.chID));
            rows.appendChild(row);
        });
    });

    return panel;
}

// The box that narrows the opponent list as it is typed into. The rows are hidden
// and shown where they are rather than rebuilt: the list comes from the database,
// and a request per keystroke would be both slow and a way to lose the caret.
function opponentFilterLine() {
    const line = document.createElement("div");
    line.classList.add("library-filter");

    const input = document.createElement("input");
    input.setAttribute("type", "text");
    input.setAttribute("id", "libOpponentFilter");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "type to narrow this list");
    input.value = characterLibrary.filter;
    input.addEventListener("input", () => {
        characterLibrary.filter = input.value;
        applyOpponentFilter();
        // Back to the first match. Narrowing a list that has been scrolled down would
        // otherwise leave it showing the gap where the rows used to be. Only on a
        // keystroke: a redraw for any other reason keeps the place it was left at.
        setOpponentScrollTop(0);
    });

    line.appendChild(input);
    return line;
}

// Said in place of the list rather than leaving a gap where it was, so a name that
// is not in the library reads as an answer instead of as nothing happening.
function noMatchesNote() {
    const note = document.createElement("div");
    note.classList.add("library-empty");
    note.classList.add("library-no-matches");
    note.innerText = "no opponent of that name";
    note.hidden = true;
    return note;
}

// Show the opponents whose name contains what has been typed. Case is ignored, and
// the match is anywhere in the name rather than only at the start, so "mage" finds
// the Drow Mage without having to remember what comes before it.
function applyOpponentFilter() {
    const wanted = (characterLibrary.filter || "").trim().toLowerCase();
    let showing = 0;

    document
        .querySelectorAll(".library-list .library-row[data-opponent]")
        .forEach((row) => {
            const matches = !wanted || row.textContent.toLowerCase().includes(wanted);
            row.hidden = !matches;
            if (matches) {
                showing += 1;
            }
        });

    const none = document.querySelector(".library-no-matches");
    if (none) {
        none.hidden = showing > 0;
    }
}

// The sheet itself, and beneath it the tools that hang off it.
async function characterFormPanel(characters) {
    const panel = document.createElement("div");
    panel.classList.add("library-form");

    if (characterLibrary.chID == null) {
        panel.appendChild(
            libraryNote(
                "Pick a character on the left to edit it, or add a new one.",
                "library-empty"
            )
        );
        return panel;
    }

    const isNew = characterLibrary.chID == "new";
    const character = isNew
        ? {}
        : characters.find((candidate) => candidate.chID == characterLibrary.chID);

    // The character was deleted from under the modal, or the list moved on while a
    // stale chID was being held.
    if (!character) {
        characterLibrary.chID = null;
        characterLibrary.toolID = null;
        panel.appendChild(
            libraryNote("That character is no longer in the library.", "library-empty")
        );
        return panel;
    }

    const title = document.createElement("h3");
    title.innerText = isNew ? "New Character" : character.character_name;
    panel.appendChild(title);

    panel.appendChild(formTextLine("libCharacterName", "Name", character.character_name, 40));
    panel.appendChild(
        formChoiceLine(
            "libCharacterPC",
            "Type",
            [
                { value: "1", label: "Player Character" },
                { value: "0", label: "Opponent" },
            ],
            // a character being created is an opponent until it is said otherwise:
            // that is what most new ones are
            isNew ? "0" : flagIsSet(character.pc) ? "1" : "0"
        )
    );
    panel.appendChild(formNumberLine("libCharacterMaxHP", "Max HP", character.max_hp));
    panel.appendChild(formNumberLine("libCharacterAC", "AC", character.ac));
    panel.appendChild(formNumberLine("libCharacterAC2", "Secondary AC", character.ac_secondary));
    panel.appendChild(
        formTextLine(
            "libCharacterAC2Descrip",
            "Secondary AC is for",
            character.ac_secondary_descrip,
            60
        )
    );
    panel.appendChild(
        formNumberLine("libCharacterInitMod", "Initiative modifier", character.init_modifier)
    );
    panel.appendChild(
        libraryNote(
            "Max HP and the initiative modifier are read off the sheet whenever the " +
            "tracker is drawn. A participant's own AC and starting hit points are its " +
            "own, and are edited on the participant."
        )
    );

    const buttons = document.createElement("div");
    buttons.classList.add("update-close-container");
    const save = document.createElement("button");
    save.innerText = isNew ? "CREATE CHARACTER" : "SAVE CHARACTER";
    save.addEventListener("click", submitLibraryCharacter);
    buttons.appendChild(save);
    if (!isNew) {
        const remove = document.createElement("button");
        remove.innerText = "DELETE CHARACTER";
        remove.addEventListener("click", deleteLibraryCharacter);
        buttons.appendChild(remove);
    }
    panel.appendChild(buttons);

    panel.appendChild(await toolsPanel(isNew ? null : character.chID));
    return panel;
}

async function toolsPanel(chID) {
    const panel = document.createElement("div");
    panel.classList.add("library-tools");

    const title = document.createElement("h3");
    title.innerText = "Weapons, Spells & Other Tools";
    panel.appendChild(title);

    // A tool is stored against a chID, so there is nowhere to put one until the
    // character it belongs to has been written.
    if (!chID) {
        panel.appendChild(
            libraryNote(
                "Create the character first, and its tools can be added here.",
                "library-empty"
            )
        );
        return panel;
    }

    const tools = await dbQuery("GET", "participantTools/" + chID);

    if (tools.length === 0) {
        panel.appendChild(libraryNote("No tools yet.", "library-empty"));
    }
    tools.forEach((tool) => {
        const row = document.createElement("div");
        row.classList.add("library-row");
        if (tool.toolID == characterLibrary.toolID) {
            row.classList.add("library-row-open");
        }
        row.innerText = toolSummary(tool);
        row.setAttribute("title", toolSummary(tool));
        row.addEventListener("click", () => openLibraryTool(tool.toolID));
        panel.appendChild(row);
    });

    const newTool = document.createElement("button");
    newTool.innerText = "+ NEW TOOL";
    newTool.addEventListener("click", () => openLibraryTool("new"));
    panel.appendChild(newTool);

    if (characterLibrary.toolID != null) {
        panel.appendChild(toolForm(tools, chID));
    }
    return panel;
}

// The one-line description of a tool in the list: what the action modals print on
// its radio button, plus the flags that otherwise only show once it has been used.
function toolSummary(tool) {
    return [
        tool.toolName,
        tool.damage_dice ? "(" + tool.damage_dice + ")" : "",
        flagIsSet(tool.concentration) ? "[concentration]" : "",
        flagIsSet(tool.holding) ? "[carries over]" : "",
        flagIsSet(tool.once_per_day) ? "[once per day]" : "",
    ]
        .filter(Boolean)
        .join(" ");
}

function toolForm(tools, chID) {
    const form = document.createElement("div");
    form.classList.add("library-tool-form");

    const isNew = characterLibrary.toolID == "new";
    const tool = isNew
        ? {}
        : tools.find((candidate) => candidate.toolID == characterLibrary.toolID);
    if (!tool) {
        characterLibrary.toolID = null;
        return form;
    }

    // which character the tool is being written against, read back by the submit -
    // a new tool has no ID of its own to look it up by
    form.setAttribute("data-tool-chid", chID);

    const title = document.createElement("h3");
    title.innerText = isNew ? "New Tool" : tool.toolName;
    form.appendChild(title);

    form.appendChild(formTextLine("libToolName", "Name", tool.toolName, 40));
    form.appendChild(formTextLine("libToolDice", "Damage dice", tool.damage_dice, 20));
    form.appendChild(formTextLine("libToolSave", "Saving throw", tool.save, 40));
    form.appendChild(formTextLine("libToolDescription", "Description", tool.description, 120));
    form.appendChild(
        formCheckboxLine("libToolConcentration", "Needs concentration", tool.concentration)
    );
    // "Holding" is the effect holding over into the rounds after the one it was used
    // in, not a weapon being held. Ticking it is what puts the H reminder on the
    // participant's row for as long as the tool is still in play.
    form.appendChild(
        formCheckboxLine("libToolHolding", "Effect carries into later rounds", tool.holding)
    );
    form.appendChild(
        formCheckboxLine(
            "libToolHoldingOneRound",
            "Carries over one round only",
            tool.holding_one_round
        )
    );
    form.appendChild(formCheckboxLine("libToolOncePerDay", "Once per day", tool.once_per_day));
    form.appendChild(
        libraryNote(
            "A tool that carries over marks the participant with an H for as long as " +
            "it is still in play, as a reminder. Tick the round-only box for one that " +
            "should be spent by the end of the next round; leave it clear and the " +
            "condition modal offers a much later ending round instead. " +
            "A once-per-day tool is greyed out in the action modals as soon as the " +
            "participant uses it, for the rest of that combat."
        )
    );

    const buttons = document.createElement("div");
    buttons.classList.add("update-close-container");
    const save = document.createElement("button");
    save.innerText = isNew ? "CREATE TOOL" : "SAVE TOOL";
    save.addEventListener("click", submitLibraryTool);
    buttons.appendChild(save);
    if (!isNew) {
        const remove = document.createElement("button");
        remove.innerText = "DELETE TOOL";
        remove.addEventListener("click", deleteLibraryTool);
        buttons.appendChild(remove);
    }
    const cancel = document.createElement("button");
    cancel.innerText = "CANCEL";
    cancel.addEventListener("click", () => openLibraryTool(null));
    buttons.appendChild(cancel);
    form.appendChild(buttons);

    return form;
}

function libraryNote(text, className = "library-note") {
    const note = document.createElement("div");
    note.classList.add(className);
    note.innerText = text;
    return note;
}

async function openLibraryCharacter(chID) {
    characterLibrary.chID = chID;
    characterLibrary.toolID = null;
    await renderCharacterLibrary();
    focusFormField("libCharacterName");
}

async function openLibraryTool(toolID) {
    characterLibrary.toolID = toolID;
    await renderCharacterLibrary();
    if (toolID != null) {
        focusFormField("libToolName");
    }
}

async function submitLibraryCharacter() {
    const nameField = document.querySelector("#libCharacterName");
    // Nothing to save, and a nameless character could not be picked out of the list
    // again: leave the modal as it stands so the rest of the typing is not lost.
    if (!nameField.value.trim()) {
        nameField.focus();
        return;
    }

    const saved = await saveThroughModal("saveCharacter", {
        chID: characterLibrary.chID == "new" ? null : characterLibrary.chID,
        character_name: nameField.value.trim(),
        pc: document.querySelector("#libCharacterPC").value,
        max_hp: document.querySelector("#libCharacterMaxHP").value,
        ac: document.querySelector("#libCharacterAC").value,
        ac_secondary: document.querySelector("#libCharacterAC2").value,
        ac_secondary_descrip: document.querySelector("#libCharacterAC2Descrip").value,
        init_modifier: document.querySelector("#libCharacterInitMod").value,
    });
    if (!saved) {
        return;
    }

    // Reopened on the character that was just written: one created here now has a
    // chID, which is what its tools panel was waiting for.
    characterLibrary.chID = saved.chID;
    characterLibrary.toolID = null;
    await renderCharacterLibrary();

    // The tracker reads max HP and the initiative modifier off the sheet whenever it
    // is drawn, so it is read back from behind the modal, which stays up for the next
    // edit. Done here rather than on the way out so that closing by the X in the
    // header is no different from closing by the button.
    refresh_encounter();
}

async function deleteLibraryCharacter() {
    const deleted = await deleteThroughModal("deleteCharacter", {
        chID: characterLibrary.chID,
    });
    if (!deleted) {
        return;
    }
    characterLibrary.chID = null;
    characterLibrary.toolID = null;
    await renderCharacterLibrary();
}

async function submitLibraryTool() {
    const nameField = document.querySelector("#libToolName");
    if (!nameField.value.trim()) {
        nameField.focus();
        return;
    }

    const saved = await saveThroughModal("saveTool", {
        toolID: characterLibrary.toolID == "new" ? null : characterLibrary.toolID,
        chID: document.querySelector(".library-tool-form").getAttribute("data-tool-chid"),
        toolName: nameField.value.trim(),
        damage_dice: document.querySelector("#libToolDice").value,
        save: document.querySelector("#libToolSave").value,
        description: document.querySelector("#libToolDescription").value,
        concentration: document.querySelector("#libToolConcentration").checked ? 1 : 0,
        holding: document.querySelector("#libToolHolding").checked ? 1 : 0,
        holding_one_round: document.querySelector("#libToolHoldingOneRound").checked ? 1 : 0,
        once_per_day: document.querySelector("#libToolOncePerDay").checked ? 1 : 0,
    });
    if (!saved) {
        return;
    }

    characterLibrary.toolID = saved.toolID;
    await renderCharacterLibrary();
}

async function deleteLibraryTool() {
    const deleted = await deleteThroughModal("deleteTool", {
        toolID: characterLibrary.toolID,
    });
    if (!deleted) {
        return;
    }
    characterLibrary.toolID = null;
    await renderCharacterLibrary();
}

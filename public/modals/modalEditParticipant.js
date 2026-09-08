// editParticipantModal defines the modal for editing one participant of one
// encounter; submitEditParticipant takes that info and updates the database.
//
// The per-field modals - rename, adjust initiative, adjust starting HP - each ask
// for one thing and are quicker for it, and they stay. This is the whole row in one
// place, and the only way to reach the three things none of them covers: which
// character sheet the participant was drawn from, its own armour class, and the
// rounds it is in the fight for.
//
// tbl_character is left alone. Everything here belongs to this encounter, so the
// goblin that turned out to be a hobgoblin can be corrected without changing what
// the next fight starts from - see the character library for the sheets themselves.

async function editParticipantModal(participantToEdit) {
    const participant = ctApp.find((obj) => obj.pID == participantToEdit);
    if (!participant) {
        alert("That participant is no longer in the encounter.");
        return;
    }

    const characters = await dbQuery("GET", "allCharacters");
    const modalBody = document.querySelector("#modal-body");

    const container = document.createElement("div");
    container.classList.add("modal-body");

    const heading = document.createElement("h1");
    heading.classList.add("center");
    heading.innerText = "EDIT " + displayedCharacterName(participant);
    container.appendChild(heading);

    const form = document.createElement("div");
    form.classList.add("center-div-align-left");

    // The name as the tracker is showing it, number and all, so the number can be
    // kept, changed or dropped by typing - the same as the rename modal.
    form.appendChild(
        formTextLine("editParticipantName", "Name", displayedCharacterName(participant), 40)
    );
    form.appendChild(participantSheetLine(characters, participant));
    form.appendChild(formNumberLine("editParticipantAC", "AC", participant.ac));
    form.appendChild(
        formNumberLine("editParticipantStartingHP", "Starting HP", participant.starting_hp)
    );
    form.appendChild(formNumberLine("editParticipantInit", "Initiative", participant.init));
    form.appendChild(
        formNumberLine("editParticipantSecondaryInit", "Initiative tie-break", participant.secondary_init)
    );
    form.appendChild(
        formNumberLine("editParticipantJoinRound", "Joins in round", participant.join_round)
    );
    form.appendChild(
        formNumberLine("editParticipantDeadRound", "Downed in round", downedRound(participant))
    );

    const note = document.createElement("div");
    note.classList.add("library-note");
    note.innerText =
        "Leave the downed round empty while the creature is still standing, and the " +
        "AC empty to wear whatever the character sheet says. Max HP and the " +
        "initiative modifier always come off the sheet - change those in the " +
        "character library.";
    form.appendChild(note);
    container.appendChild(form);

    const buttons = document.createElement("div");
    buttons.classList.add("center");
    buttons.classList.add("update-close-container");
    const save = document.createElement("button");
    save.innerText = "SAVE";
    save.addEventListener("click", () => submitEditParticipant(participant.pID));
    const close = document.createElement("button");
    close.innerText = "CLOSE";
    close.classList.add("close-modal");
    close.addEventListener("click", closeModal);
    buttons.appendChild(save);
    buttons.appendChild(close);
    container.appendChild(buttons);

    modalBody.innerHTML = "";
    modalBody.appendChild(container);

    pushModal();
    scrollModalToTop();
    modalIsOpen = true;
    focusFormField("editParticipantName");
}

// Which character sheet this participant was drawn from. Worth being able to
// change: the sheet is where max HP, the initiative modifier and the tools the
// action modals offer all come from, so a creature added as the wrong one has the
// wrong weapons to attack with.
function participantSheetLine(characters, participant) {
    const select = document.createElement("select");
    select.setAttribute("id", "editParticipantChID");

    [
        { heading: "Player Characters", pc: true },
        { heading: "Opponents", pc: false },
    ].forEach((group) => {
        const inGroup = characters.filter(
            (character) => flagIsSet(character.pc) === group.pc
        );
        if (inGroup.length === 0) {
            return;
        }
        const optgroup = document.createElement("optgroup");
        optgroup.setAttribute("label", group.heading);
        inGroup.forEach((character) => {
            const option = document.createElement("option");
            option.setAttribute("value", character.chID);
            option.innerText =
                character.character_name +
                (character.max_hp == null ? "" : " (" + character.max_hp + " hp)");
            if (character.chID == participant.chID) {
                option.setAttribute("selected", "selected");
            }
            optgroup.appendChild(option);
        });
        select.appendChild(optgroup);
    });

    return formLine("Character sheet", "editParticipantChID", select);
}

// 100 is what the rest of the app writes for a creature that is still standing -
// see /revive, and the row-greying in loadEncounter - and is past any round that
// gets played, so the field is left empty rather than showing a number that is not
// really a round.
function downedRound(participant) {
    const round = participant?.dead_round;
    return round == null || round == 100 ? "" : round;
}

async function submitEditParticipant(participantToEdit) {
    const nameField = document.querySelector("#editParticipantName");
    const name = nameField.value.trim();
    // A nameless row in the tracker helps nobody, and closing on it would lose the
    // rest of the typing along with it.
    if (!name) {
        nameField.focus();
        return;
    }

    const saved = await saveThroughModal("updateParticipant", {
        pID: participantToEdit,
        character_name: name,
        chID: document.querySelector("#editParticipantChID").value,
        ac: document.querySelector("#editParticipantAC").value,
        starting_hp: document.querySelector("#editParticipantStartingHP").value,
        init: document.querySelector("#editParticipantInit").value,
        secondary_init: document.querySelector("#editParticipantSecondaryInit").value,
        join_round: document.querySelector("#editParticipantJoinRound").value,
        // empty means still standing, which the route stores as the 100 the rest of
        // the app writes
        dead_round: document.querySelector("#editParticipantDeadRound").value,
    });
    if (!saved) {
        return;
    }

    refresh_encounter();
    closeModal();
}

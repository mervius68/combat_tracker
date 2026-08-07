// renameCharacterModal defines the modal for renaming a participant
// submitRename takes that info and updates database
//
// The name is this encounter's, not the character pool's, so renaming the goblin
// that turned out to be a hobgoblin leaves every other encounter as it was.
//
// The field is filled with the name exactly as the tracker is showing it, number
// and all, so the number can be kept, changed or dropped by typing. Whatever is
// submitted becomes the whole of the name - see participantNames.js for the two
// places a creature's number can be held.

async function renameCharacterModal(characterToRename) {
    const pIDObject = ctApp.find(obj => obj.pID == characterToRename);
    const currentName = displayedCharacterName(pIDObject);
    const modal = document.querySelector("#modal-body");

    const container = document.createElement("div");
    container.classList.add("modal-body");
    let div = document.createElement("div");
    div.classList.add("modal-content");
    let h1 = document.createElement("h1");
    h1.classList.add("center");
    h1.innerText = "RENAME " + currentName;
    div.appendChild(h1);

    const div2 = document.createElement("div");
    div2.classList.add("center-div-align-left");

    // div containing the new name input
    const nameDiv = document.createElement("div");
    nameDiv.classList.add("line");
    const nameInput = document.createElement("input");
    nameInput.setAttribute("type", "text");
    nameInput.setAttribute("id", "characterName");
    nameInput.classList.add("characterNameInput");
    nameInput.setAttribute("maxLength", "40");
    nameInput.setAttribute("data-rename-pid", pIDObject.pID);
    nameInput.setAttribute("value", currentName);
    const nameLabel = document.createElement("label");
    nameLabel.setAttribute("for", "characterName");
    nameLabel.innerHTML = "&nbsp;&nbsp;&nbsp;Character Name";
    nameDiv.appendChild(nameInput);
    nameDiv.appendChild(nameLabel);
    div2.appendChild(nameDiv);

    const br = document.createElement("br");
    const br2 = document.createElement("br");
    const br3 = document.createElement("br");

    const button = document.createElement("button");
    button.setAttribute("onclick", `submitRename(${pIDObject.pID})`)
    button.innerText = "SUBMIT";
    button.classList.add("center")

    const button2 = document.createElement("button");
    button2.setAttribute("onclick", "closeModal()")
    button2.innerText = "CLOSE";
    button2.classList.add("close-modal")
    button2.classList.add("center");

    let div3 = document.createElement("div");
    div3.classList.add("center")

    div3.appendChild(button)
    div3.appendChild(button2)

    container.appendChild(div);
    container.appendChild(div2);
    container.appendChild(br);
    container.appendChild(br2);
    container.appendChild(div3);
    container.appendChild(br3);

    modal.innerHTML = container.outerHTML;
    setTimeout(() => {
        let cursorField = document.querySelector('input[data-rename-pid]')
        cursorField.focus();
        // the whole name selected, so a rename that keeps nothing of the old one
        // is a single typed word
        cursorField.select();
    }, 90)

    const cm = document.querySelector(".modal-content");
    function showContextMenu(show = true) {
        cm.style.display = show ? "block" : "none";
    }
    pushModal();
    modalIsOpen = true;
}

async function submitRename(characterToRename) {
    const nameEle = document.querySelector("#characterName");
    const character_name = nameEle.value.trim();
    const pIDObject = ctApp.find(obj => obj.pID == characterToRename);

    // Nothing to save, and a nameless row in the tracker helps nobody: leave the
    // name as it was and let the modal stand so the typing is not lost.
    if (!character_name) {
        nameEle.focus();
        return;
    }
    if (character_name === displayedCharacterName(pIDObject)) {
        closeModal();
        return;
    }

    const data = {
        pID: pIDObject.pID,
        character_name: character_name
    }

    await dbQueryPost("renameParticipant", data)
    refresh_encounter()
    closeModal()
}

// The name as the tracker shows it, under either way of holding the number.
function displayedCharacterName(participant) {
    return (
        participant.character_name +
        (hasNoNumericValue(participant.numeric_value) ? "" : " #" + participant.numeric_value)
    );
}

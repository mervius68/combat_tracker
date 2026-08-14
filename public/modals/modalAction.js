// modalActions defines the modal for adding an action

async function modalActions() {
    const holdActions = ["grapple", "disarm", "help", "ready", "shove"];
    const actionsArray = [
        "dash",
        "disarm",
        "disengage",
        "dodge",
        "escape",
        "grapple",
        "help",
        "hide",
        "improvise",
        "ready",
        "search",
        "shove",
        "use an object",
    ];
    let modal = document.querySelector("#modal-body");
    let html = document.querySelector(".selected");
    let dataNavSelected = html.getAttribute("data-nav");
    let participantID = html.getAttribute("data-participant");
    let characterID = ctApp.find((participant) => {
        return participant.pID == participantID;
    }).chID;
    let currentRound = html.getAttribute("data-round");
    let encounter = ctApp[0].eID;

    // get participant's info
    // tools
    let participantTools = await dbQuery(
        "GET",
        "participantTools/" + characterID
    );
    // targets
    let allParticipants = ctApp.filter((participant) => {
        return participant// (
    });
    // conditions in effect (with option to end them)
    let conditionsInEffect = await dbQuery(
        "GET",
        "conditionsInEffect/" + encounter + "/" + currentRound
    );
    // build the HTML
    let container = document.createElement("div");
    container.setAttribute("data-modal-type", "action")
    container.classList.add("modal-body");

    let h3 = document.createElement("h3");
    let character = ctApp.find((participant) => {
        return participant.pID == participantID;
    });
    h3.innerHTML =
        character.character_name +
        (character.numeric_value ? " #" + character.numeric_value : "");
    container.appendChild(h3);

    let divModalTop = document.createElement("div");
    divModalTop.classList.add("flex_horizontal");

    let divLeft = document.createElement("div");
    divLeft.classList.add("flex-left");

    // load weapons/tools
    let div13 = document.createElement("div");
    let div1Title = document.createElement("h3");
    div1Title.classList.add("left");
    div1Title.innerHTML = "Weapons/Tools";
    div13.appendChild(div1Title);

    let div14 = document.createElement("div");
    let defaultTool = document.createElement("input");
    defaultTool.setAttribute("type", "radio");
    defaultTool.setAttribute("value", 0);
    defaultTool.setAttribute("id", "default");
    defaultTool.setAttribute("name", "weapons");
    defaultTool.classList.add("pointer");
    defaultTool.setAttribute("data-concentration", 0);
    defaultTool.setAttribute("checked", "true");
    let defaultLabel = document.createElement("label");
    defaultLabel.setAttribute("for", "default");
    defaultLabel.classList.add("radio_buttons");
    defaultLabel.innerHTML = "NONE";
    defaultLabel.classList.add("pointer");
    defaultLabel.setAttribute("default", "true");
    let br1 = document.createElement("br");
    div14.appendChild(defaultTool);
    div14.appendChild(defaultLabel);
    div14.appendChild(br1);

    // const targetPID = 60; // Specify the target pID
    const resultObject = findHighestAIDByPID(ctActions, participantID);
    for (item of participantTools) {
        let tool = document.createElement("input");
        tool.setAttribute("type", "radio");
        tool.setAttribute("value", item.toolName);
        tool.setAttribute("id", item.toolID);
        tool.classList.add("pointer");
        tool.setAttribute("name", "weapons");
        tool.setAttribute("data-concentration", item.concentration);
        tool.setAttribute("data-holding", item.holding);
        tool.setAttribute("data-holding-one-round", item.holding_one_round);
        try {
            if (item.toolID == resultObject.toolID) {
                tool.setAttribute("checked", "checked");
            }
        }
        catch (err) { }

        let label = document.createElement("label");
        label.setAttribute("for", item.toolID);
        try {
            if (item.toolID == resultObject.toolID) {
                label.classList.add("previous_tool")
            }
        }
        catch (err) { }

        label.classList.add("radio_buttons");
        label.classList.add("pointer");
        label.innerHTML =
            item.toolName +
            (item.damage_dice ? " (" + item.damage_dice + ")" : "");
        let span4;
        if (item.holding == 1) {
            span4 = document.createElement("span");
            span4.innerHTML = "H";
            span4.classList.add("holding");
            label.appendChild(span4);
        }
        let span1;
        if (item.concentration == "1") {
            span1 = document.createElement("span");
            span1.innerHTML = "C";
            span1.classList.add("concentration");
            label.appendChild(span1);
        }
        let br = document.createElement("br");
        div14.appendChild(tool);
        div14.appendChild(label);
        div14.appendChild(br);
    };

    divLeft.appendChild(div13);

    let weaponTextInput = document.createElement("input");
    weaponTextInput.setAttribute("type", "text");
    weaponTextInput.setAttribute("name", "weaponTextInput");
    weaponTextInput.setAttribute("autocomplete", "off");
    weaponTextInput.classList.add("text_field");
    let label1 = document.createElement("label");
    let br2 = document.createElement("br");

    div14.appendChild(weaponTextInput);
    div14.appendChild(label1);
    div14.appendChild(br2);
    divLeft.appendChild(div14);
    divModalTop.appendChild(divLeft);

    let divMiddleLeft = document.createElement("div");
    divMiddleLeft.classList.add("modal_column");
    let anotherDiv = document.createElement("div");

    actionsArray.forEach((action) => {
        let actionsRadio = document.createElement("input");
        actionsRadio.setAttribute("type", "radio");
        actionsRadio.setAttribute("value", action);
        actionsRadio.setAttribute("id", action);
        actionsRadio.classList.add("pointer");
        actionsRadio.setAttribute("name", "weapons");
        actionsRadio.setAttribute(
            "data-holding",
            action == "grapple" ||
                action == "disarm" ||
                action == "help" ||
                action == "ready" ||
                action == "shove"
                ? 1
                : 0
        );
        actionsRadio.setAttribute(
            "data-holding-one-round",
            action == "help" || action == "ready" ? 1 : 0
        );
        let label = document.createElement("label");
        label.setAttribute("for", action);
        label.classList.add("pointer");
        label.classList.add("radio_buttons");
        label.innerHTML = action;
        let span2;
        if (holdActions.includes(action)) {
            span2 = document.createElement("span");
            span2.innerHTML = "H";
            span2.classList.add("holding");
            label.appendChild(span2);
        }
        let br = document.createElement("br");
        anotherDiv.appendChild(actionsRadio);
        anotherDiv.appendChild(label);
        anotherDiv.appendChild(br);
    });

    divMiddleLeft.appendChild(anotherDiv);
    divModalTop.appendChild(divMiddleLeft);

    let divMiddleRight = document.createElement("div");
    divMiddleRight.classList.add("modal_column");
    let anotherDiv2 = document.createElement("div");
    anotherDiv2.classList.add("modal_column_int");
    let actionCategories = ["action", "bonus", "reaction", "other"];

    actionCategories.forEach((action) => {
        let actionsRadio = document.createElement("input");
        actionsRadio.setAttribute("type", "radio");
        actionsRadio.setAttribute(
            "value",
            action == "reaction" ? "react" : action
        );
        if (action == "action") {
            actionsRadio.setAttribute("checked", "true");
        }
        actionsRadio.setAttribute(
            "id",
            action == "reaction" ? "react" : action
        );
        actionsRadio.setAttribute("name", "actions");
        actionsRadio.classList.add("pointer");
        let label = document.createElement("label");
        label.setAttribute("for", action == "reaction" ? "react" : action);
        label.classList.add("radio_buttons");
        label.classList.add("pointer");
        label.innerHTML = action;
        let br = document.createElement("br");
        anotherDiv2.appendChild(actionsRadio);
        anotherDiv2.appendChild(label);
        anotherDiv2.appendChild(br);
    });

    divMiddleRight.appendChild(anotherDiv2);
    divModalTop.appendChild(divMiddleRight);

    let divRight = document.createElement("div");
    divRight.classList.add("flex-right");

    let div15 = document.createElement("h3");
    div15.innerHTML = "Targets / Damage/HP";
    divRight.appendChild(div15);
    let div16 = document.createElement("div");
    div16.classList.add("conSaveParent");

    // populate the targets of the modal
    // first determine, by data-nav position, which targets to eliminate from list
    let redHTMLElements = document.querySelectorAll(".red.pointer");
    let redHTML = Array.from(redHTMLElements);
    let redAfterSelection = redHTML.filter((item) => {
        return parseInt(item.getAttribute("data-nav")) < parseInt(dataNavSelected) + ctApp.length
    })
    let redAfterSelectionParticipants = [];
    redAfterSelection.forEach((item) => {
        redAfterSelectionParticipants.push(parseInt(item.getAttribute("data-participant")))
    })
    allParticipants.forEach((participant) => {
        let target = document.createElement("input");
        target.setAttribute("type", "text");
        target.setAttribute("value", "");
        target.classList.add("text_field");
        target.classList.add("numeric");
        target.setAttribute("name", "participants");
        target.setAttribute("id", "p" + participant.pID);
        target.setAttribute("autocomplete", "off");
        let targetLabel = document.createElement("label");
        targetLabel.setAttribute("for", "p" + participant.pID);
        targetLabel.classList.add("p" + participant.pID);
        targetLabel.classList.add("modal_text_inputs");
        if (redAfterSelectionParticipants.includes(participant.pID)) {
            targetLabel.classList.add("downed-participants")
        }
        if (character.pc != participant.pc) {
            targetLabel.classList.add("bold-target")
        }
        targetLabel.classList.add("pointer");
        targetLabel.innerHTML =
            participant.character_name +
            (participant.numeric_value
                ? " #" + participant.numeric_value
                : "");

        // The AC the attack has to beat, to the right of the target it belongs to.
        // A sibling of the label rather than part of it: the concentration "C" and
        // the CON save prompt are both written into the label, and the input the
        // save prompt reads is found as the label's previous sibling.
        let acLabel = targetAcMarkup(participant);

        let br3 = document.createElement("br");
        div16.appendChild(target);
        div16.appendChild(targetLabel);
        if (acLabel) {
            div16.appendChild(acLabel);
        }

        div16.appendChild(br3);
    });

    divRight.appendChild(div16);

    let notesLabel = document.createElement("h3");
    notesLabel.innerText = "Notes";
    let notes = document.createElement("textarea");
    notes.setAttribute("rows", "5");
    notes.setAttribute("cols", "30");
    notes.setAttribute("name", "notes");
    notes.classList.add("notes_text");

    let notesLabelStart = document.createElement("h3");
    notesLabelStart.innerText = "Start";
    let notesStart = document.createElement("textarea");
    notesStart.setAttribute("rows", "1");
    notesStart.setAttribute("cols", "30");
    notesStart.setAttribute("name", "notes_start");
    notesStart.classList.add("notes_text");

    let notesLabelEnd = document.createElement("h3");
    notesLabelEnd.innerText = "End";
    let notesEnd = document.createElement("textarea");
    notesEnd.setAttribute("rows", "1");
    notesEnd.setAttribute("cols", "30");
    notesEnd.setAttribute("name", "notes_end");
    notesEnd.classList.add("notes_text");

    divRight.appendChild(notesLabel);
    divRight.appendChild(notes);

    divModalTop.appendChild(divRight);
    container.appendChild(divModalTop);

    let divModalBottom = document.createElement("div");
    divModalBottom.classList.add("horizontal_bottom");
    let hr = document.createElement("hr");
    container.appendChild(hr);

    // TURN THIS BACK ON????
    // conditionsInEffect = conditionsInEffect.filter(
    //     (obj, index, self) =>
    //         index ===
    //         self.findIndex((t) => t.conditionID === obj.conditionID)
    // );
    qqq = conditionsInEffect;
    conditionsInEffect.forEach((condition) => {

        if (condition.end_round == currentRound && condition.end_pID == participantID) {

        } else {
            let conditionParticipant = condition.pID;
            let startHTML = document.querySelector(
                '[data-round="' +
                condition.start_round +
                '"] [data-section="1"] [data-participant="' +
                condition.pID +
                '"]'
            );
            let start = startHTML.getAttribute("data-nav");

            let endHTML = document.querySelector(
                '[data-round="' +
                condition.end_round +
                '"] [data-section="1"] [data-participant="' +
                condition.end_pID +
                '"]'
            );
            let end =
                endHTML instanceof Element
                    ? endHTML.getAttribute("data-nav")
                    : "1000";

            if (
                parseInt(dataNavSelected) >= parseInt(start) &&
                parseInt(dataNavSelected) <= parseInt(end)
            ) {
                let checkbox = document.createElement("input");
                checkbox.setAttribute("type", "checkbox");
                checkbox.setAttribute("name", "conditions");
                checkbox.setAttribute(
                    "data-participant-affected",
                    condition.affected_pID
                );
                checkbox.setAttribute("data-cpid", condition.taID);
                checkbox.classList.add("pointer");
                // The condition as well as who it is on. Named after the affected
                // participant alone, every condition on the same participant shared
                // an id, and a label points at the first element with the id it
                // names: clicking the second or third of them ticked the first
                // instead, so the wrong condition ended and the one that was asked
                // for stayed on.
                const checkboxID = "b" + condition.taID + "-" + condition.affected_pID;
                checkbox.setAttribute("id", checkboxID);
                let span = document.createElement("span");
                if (condition.concentration == 1) {
                    span.textContent = "C";
                    span.classList.add("concentration");
                    span.classList.add("savingThrow");
                }
                if (condition.holding == 1) {
                    span.textContent = "H";
                    span.classList.add("holding");
                    // span.classList.add("savingThrow");
                }
                let label = document.createElement("label");
                label.setAttribute("for", checkboxID);
                label.classList.add("pointer");

                let causer = ctApp.find((participant) => {
                    return condition.pID == participant.pID;
                });
                let causerName =
                    causer.character_name +
                    (causer.numeric_value != null
                        ? " #" + causer.numeric_value
                        : "");
                if (
                    condition.pID == causer.pID &&
                    condition.concentration == 1
                ) {
                    causerName =
                        "<span class='concentration'>" + causerName + "</span>";
                }
                let affected = ctApp.find((participant) => {
                    return parseInt(condition.affected_pID) == participant.pID;
                }).character_name;
                let numeric = ctApp.find((participant) => {
                    return parseInt(condition.affected_pID) == participant.pID;
                }).numeric_value;

                label.innerHTML =
                    condition.condition_name +
                    ": " +
                    causerName +
                    " => <b>" +
                    affected +
                    (numeric ? " #" + numeric : "") +
                    "</b> / " +
                    condition.description;
                label.prepend(span);
                let br6 = document.createElement("br");
                divModalBottom.appendChild(checkbox);
                divModalBottom.appendChild(label);
                divModalBottom.appendChild(br6);
                // if target is concentrating, put a yellow-highlighted C next to their name
                if (
                    condition.concentration == 1 &&
                    !divRight.querySelector(
                        ".p" + condition.pID + " .concentration"
                    )
                ) {
                    let concentrationSpan = document.createElement("span");
                    concentrationSpan.textContent = "C";
                    concentrationSpan.classList.add("concentration");
                    let html = divRight.querySelector(".p" + condition.pID);
                    html.innerHTML += concentrationSpan.outerHTML;
                }
            }
        }
    });

    container.appendChild(divModalBottom);

    let buttonContainer = document.createElement("div");
    buttonContainer.classList.add("button_container");
    let submit = document.createElement("button");
    submit.innerText = "SUBMIT";
    submit.setAttribute("data-row", dataNavSelected)
    submit.setAttribute("data-selected-pid", participantID)
    submit.setAttribute("data-current-round", currentRound);
    submit.setAttribute("onclick", "submitAction()");
    submit.classList.add("button");
    submit.classList.add("modalSubmit");
    let submitGoToCondition = document.createElement("button");
    submitGoToCondition.innerText = "SUBMIT + go to CONDITIONS";
    submitGoToCondition.classList.add("button");
    submitGoToCondition.setAttribute("onclick", "submitAction('1')");

    buttonContainer.appendChild(submit);
    buttonContainer.appendChild(submitGoToCondition);
    container.appendChild(buttonContainer);

    modal.innerHTML = container.outerHTML;

    wireActionTextInput(modal);

    await document.removeEventListener("click", clickEventListener);
    document.addEventListener("click", clickEventListener);

    // Attach the event listener to the modal
    modal.addEventListener("click", modalClickListener);

    // check if target has a concentration to test
    modal.addEventListener("input", function (e) {
        if (!e.target.parentElement.classList.contains("conSaveParent")) {
            return;
        }

        const concentrationStuff = e.target.parentNode.querySelectorAll(".concentration");

        concentrationStuff.forEach(participant => {
            const z = participant.parentElement;
            const inputValue = participant.parentNode.previousSibling.value;

            try {
                const x = z.querySelector(".conSavingThrowCheck");
                z.removeChild(x);
            } catch (err) { }

            if (!inputValue || inputValue === "0" || inputValue === "00" || inputValue === "000") {
                return;
            }

            let savingThrowValue = Math.max(Math.floor(inputValue / 2), 10);

            const span3 = document.createElement("span");
            span3.classList.add("conSavingThrowCheck");
            span3.textContent = `DC CON ${savingThrowValue}`;

            participant.parentNode.appendChild(span3);
        });
    });

    // put focus on radio button that has a check mark
    const selectedWeapon = document.querySelector('input[name="weapons"]:checked');
    if (selectedWeapon) {
        selectedWeapon.focus();
    }

    modalIsOpen = true;
    scrollUp()

    function findHighestAIDByPID(array, targetPID) {
        // Filter the array to include only objects with the specified pID
        const filteredArray = array.filter(item => item.pID === parseInt(targetPID) && item.toolID != null);
        // Check if there are any objects with the specified pID
        if (filteredArray.length === 0) {
            return null; // No matching objects found
        }

        // Find the object with the highest aID among those with the same pID
        const highestAIDObject = filteredArray.reduce((maxObject, currentObject) => {
            return currentObject.aID > maxObject.aID ? currentObject : maxObject;
        }, filteredArray[0]);

        return highestAIDObject;
    }
}

// this function defines the modal for creating actions

async function modalUpdateAction(dataAidValue) {
        const aIDObject = ctActions.find(obj => obj.aID == dataAidValue);
        const targetsArray = await dbQuery("GET", `targets/${aIDObject.targetID}`)
        const targetIDToRetrieve = aIDObject.targetID;
        const actionObj = getCombinedObjectByTargetID(targetIDToRetrieve);
        let modal = document.querySelector("#modal-body");
        let html = document.querySelector(".selected");
        let dataNavSelected = html.getAttribute("data-nav");

        let participantID = actionObj.ct_tbl_action.pID// html.getAttribute("data-participant");
        let characterID = ctApp.find((participant) => {
            return participant.pID == participantID;
        }).chID;
        let currentRound = actionObj.ct_tbl_action.round // html.getAttribute("data-round");
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
        if (actionObj.ct_tbl_action.action == "none") {
            defaultLabel.setAttribute("checked", "checked");
        }
        let br1 = document.createElement("br");
        div14.appendChild(defaultTool);
        div14.appendChild(defaultLabel);
        div14.appendChild(br1);
        // const targetPID = 60; // Specify the target pID
        for (item of participantTools) {
            let tool = document.createElement("input");
            tool.setAttribute("type", "radio");
            tool.setAttribute("value", item.toolName);
            tool.setAttribute("id", item.toolID);
            tool.classList.add("pointer");
            tool.setAttribute("name", "weapons");
            tool.setAttribute("data-concentration", item.concentration);
            // tool.setAttribute("data-taid", item.taID)
            tool.setAttribute("data-holding", item.holding);
            tool.setAttribute("data-holding-one-round", item.holding_one_round);
            try {
                if (item.toolID == actionObj.ct_tbl_action.toolID) {
                    tool.setAttribute("checked", "checked");
                    tool.setAttribute("data-condition-id", aIDObject.conditionID)
                    tool.setAttribute("data-originalCheck", "1")
                }
            }
            catch (err) { }

            let label = document.createElement("label");
            label.setAttribute("for", item.toolID);
            label.classList.add("radio_buttons", "pointer");
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

        let weaponTextInput = document.createElement("input");
        weaponTextInput.setAttribute("type", "text");
        weaponTextInput.setAttribute("name", "weaponTextInput");
        weaponTextInput.setAttribute("autocomplete", "off");
        weaponTextInput.classList.add("text_field");
        if (actionObj.ct_tbl_action.toolID != NaN
            && actionObj.ct_tbl_action.toolID != ""
            && !actionObj.ct_tbl_action.toolID > 0
            && actionObj.ct_tbl_action.action != "none"
            && !actionsArray.includes(actionObj.ct_tbl_action.action)
        ) {
            weaponTextInput.defaultValue = actionObj.ct_tbl_action.action
        }
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
            if (actionObj.ct_tbl_action.action == action) {
                actionsRadio.setAttribute("checked", "checked");
                actionsRadio.setAttribute("data-originalCheck", "1")
            }
            let label = document.createElement("label");
            label.setAttribute("for", action);
            label.classList.add("pointer");
            label.classList.add("radio_buttons");
            label.innerHTML = action;
            let span2;
            if (
                action == "grapple" ||
                action == "disarm" ||
                action == "help" ||
                action == "ready" ||
                action == "shove"
            ) {
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
                actionsRadio.setAttribute("data-originalCheck", "1")
            }
            actionsRadio.setAttribute(
                "id",
                action == "reaction" ? "react" : action
            );
            actionsRadio.setAttribute("name", "actions");
            actionsRadio.classList.add("pointer");
            if (actionObj.ct_tbl_action.action_type == action || (actionObj.ct_tbl_action.action_type == "react" && action == "reaction")) {
                actionsRadio.setAttribute("checked", "checked");
                // actionsRadio.setAttribute("data-originalCheck", "1")
            } else if (actionObj.ct_tbl_action.action_type == action) {
                actionsRadio.setAttribute("checked", "checked");
                // actionsRadio.setAttribute("data-originalCheck", "1")

            }
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

        // populate targets
        allParticipants.forEach((participant) => {
            let target = document.createElement("input");
            target.setAttribute("type", "text");

            let currentAction = actionObj.ct_tbl_target[0].filter((obj) => {
                return obj.pID == participant.pID
            })

            // populate 'x' or damage amount in input field as needed
            currentAction.forEach((targetParticipant) => {
                const isSameParticipant = targetParticipant.pID == participant.pID;
                const noDamageAndHit = isSameParticipant && targetParticipant.damage == 0 && actionObj.ct_tbl_action.hit == 1;
                if (noDamageAndHit) {
                    target.defaultValue = "x";
                    target.setAttribute("data-originalvalue", "x")
                } else if (isSameParticipant) {
                    target.defaultValue = targetParticipant.damage;
                    target.setAttribute("data-originalvalue", targetParticipant.damage)
                } else {
                    target.setAttribute("data-originalvalue", "")
                }

                const damageValue = isSameParticipant && !noDamageAndHit ? targetParticipant.damage : 0;
                target.setAttribute("data-stored-damage", damageValue);
                target.setAttribute("data-tid", targetParticipant.tID)
                target.setAttribute("data-hit", noDamageAndHit ? "1" : "0")
                target.setAttribute("data-maxhp", participant.max_hp)
                target.setAttribute("data-hp", targetParticipant.new_hp)
                target.setAttribute("data-targetID", isSameParticipant && !noDamageAndHit ? targetParticipant.targetID : "0")
            });
            target.classList.add("text_field");
            target.classList.add("numeric");
            target.setAttribute("name", "participants");
            target.setAttribute("id", "p" + participant.pID);
            target.setAttribute("data-pid", participant.pID);
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

            let br3 = document.createElement("br");
            div16.appendChild(target);
            div16.appendChild(targetLabel);
            div16.appendChild(br3);
        });

        divRight.appendChild(div16);

        // populate Notes section
        const notesLabel = document.createElement("h3");
        notesLabel.innerText = "Notes";
        const notes = document.createElement("textarea");
        let defaultNotesValue = actionObj.ct_tbl_action.notes == "-" ? "" : actionObj.ct_tbl_action.notes;
        defaultNotesValue = defaultNotesValue
            .replace("&quest;", "?") // question mark
            .replace("&apos;", "'")  // apostrophe
        notes.defaultValue = defaultNotesValue;
        notes.setAttribute("rows", "5");
        notes.setAttribute("cols", "30");
        notes.setAttribute("name", "notes");
        notes.classList.add("notes_text");

        const notesLabelStart = document.createElement("h3");
        notesLabelStart.innerText = "Start";
        const notesStart = document.createElement("textarea");
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
                    checkbox.setAttribute("id", "b" + condition.affected_pID);
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
                    label.setAttribute("for", "b" + condition.affected_pID);
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
        submit.setAttribute("onclick", `submitUpdateAction(${dataAidValue}, ${actionObj.ct_tbl_action.pID})`);
        submit.classList.add("button");
        submit.classList.add("modalSubmit");

        buttonContainer.appendChild(submit);
        // buttonContainer.appendChild(submitGoToCondition);
        container.appendChild(buttonContainer);

        modal.innerHTML = container.outerHTML;

        await document.removeEventListener("click", clickEventListener);
        document.addEventListener("click", clickEventListener);

        // Attach the event listener to the modal
        modal.addEventListener("click", modalClickListener);

        modal.addEventListener("input", function (e) {
            if (e.target.parentElement.classList.contains("conSaveParent")) {
                let concentrationStuff =
                    e.target.parentNode.querySelectorAll(".concentration");
                concentrationStuff.forEach((participant) => {
                    let z = participant.parentElement;
                    if (
                        participant.parentNode.previousSibling.value != "" &&
                        participant.parentNode.previousSibling.value != "0" &&
                        participant.parentNode.previousSibling.value != "00" &&
                        participant.parentNode.previousSibling.value != "000"
                    ) {
                        try {
                            let x = z.querySelector(".conSavingThrowCheck");
                            z.removeChild(x);
                        } catch (err) { }
                        let input =
                            participant.parentNode.previousSibling.value;
                        if (input / 2 <= 10) {
                            input = 10;
                        } else {
                            input = Math.floor(input / 2);
                        }
                        let span3 = document.createElement("span");
                        if (parseInt(input)) {
                            span3.classList.add("conSavingThrowCheck");
                            span3.innerHTML = `DC CON ${input}`;
                        }
                        participant.parentNode.appendChild(span3);
                    } else {
                        try {
                            let x = z.querySelector(".conSavingThrowCheck");
                            z.removeChild(x);
                        } catch (err) { }
                    }
                });
            }
        });
        const selectedWeapons = document.getElementsByName("weapons");
        selectedWeapons.forEach((weapon) => {
            if (weapon.checked == true) {
                weapon.focus();
            }
        })

        modalIsOpen = true;
        pushModal();
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
        modalIsOpen = true;

        function getCombinedObjectByTargetID(targetID) {
            const actionsArray = [aIDObject];
            const combinedObject = {};

            // Iterate over actionsArray
            actionsArray.forEach((action) => {
                const currentTargetID = action.targetID;

                // Create a new object for targetID if it doesn't exist in combinedObject
                if (!combinedObject[currentTargetID]) {
                    combinedObject[currentTargetID] = {
                        ct_tbl_action: action,
                        ct_tbl_target: [],
                    };
                }

                // Add ct_tbl_target objects to the array within the corresponding ct_tbl_action object
                combinedObject[currentTargetID].ct_tbl_target.push(
                    targetsArray.filter((target) => target.targetID === currentTargetID)
                );
            });

            // Retrieve the combinedObject for the specified targetID
            const resultForTargetID = combinedObject[targetID];
            return resultForTargetID;
        }
    }
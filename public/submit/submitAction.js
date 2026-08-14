// takes info from action modal and updates database

async function submitAction(forceCondition = 0) {
        const data = document.querySelector(".modalSubmit");
        const dataNav = data.getAttribute("data-row");
        const currentRound = data.getAttribute("data-current-round");
        const pID = data.getAttribute("data-selected-pid");

        let holdingOneRound = 0;
        // determine next available action number
        let nextAID = await dbQuery("GET", "getNewAID");
        if (nextAID.length > 0 && nextAID[0].aID != undefined) {
            nextAID = nextAID[0].aID + 1;
        } else {
            nextAID = 1;
        }

        // determine next available targetID
        let nextTargetID = await dbQuery("GET", "getNextTargetID");
        if (nextTargetID.length > 0 && nextTargetID[0].targetID != undefined) {
            nextTargetID = nextTargetID[0].targetID + 1;
        } else {
            nextTargetID = 1;
        }

        // get weapon radio buttons
        let weaponTextInput = document.getElementsByName("weaponTextInput");
        let concentrationNext = 0;
        let holding = 0;
        let weapons,
            tool = [],
            toolNum = [],
            actionString = "",
            nextToolID = "";
        const checkedWeapon = Array.from(document.getElementsByName("weapons")).find((weapon) => {
            return weapon.checked == true;
        });

        // NONE (or the participant's last-used tool) is checked before the user
        // touches anything, so a checked radio on its own doesn't mean they picked
        // it. Text typed in the free-text field beats NONE; a radio the user
        // actually chose beats the text (choosing one clears the field - see
        // wireActionTextInput).
        const typedAction = weaponTextInput[0]?.value.trim();
        const selectedWeapon = typedAction && (!checkedWeapon || checkedWeapon.id == "default")
            ? undefined
            : checkedWeapon;

        if (selectedWeapon) {
            weapons = document.getElementsByName("weapons");
            tool = selectedWeapon.value;
            try {
                toolNum = selectedWeapon.id;
            }
            catch (err) { }

            concentrationNext = selectedWeapon.getAttribute("data-concentration") || 0;
            holding = selectedWeapon.getAttribute("data-holding") || 0;
            holdingOneRound = selectedWeapon.getAttribute("data-holding-one-round") || 0;
            if (isNaN(parseInt(tool))) {
                actionString = tool;
                nextToolID = "0";
            } else if (tool == 0) {
                tool = "none";
                actionString = "none";
                nextToolID = "0";
            } else {
                actionString = "-";
                nextToolID = "0";
            }
        } else if (typedAction) {
            tool = typedAction;
            actionString = typedAction;
            nextToolID = "0";
        } else {
            tool = "none";
            actionString = "none";
            nextToolID = "0";
        }
        actionString = escapeTextForRequest(actionString);
        // determine hits and combine them into string, like "0/1" (for miss/hit)
        let targets = document.getElementsByName("participants");
        let targetHits = [];
        let target_pID = [];
        let damage = [];
        let targetHPsArray = [];
        let conditionName = actionString;
        let targetsArray = Array.from(targets);

        // wrap the forEach loop in a Promise.all
        await Promise.all(
            targetsArray.map(async (target, index) => {
                if (parseInt(target.value) && target.value != "0") {
                    targetHits.push("1 ");
                    target_pID.push(target.id.substring(1));
                    damage.push(target.value);
                    let x = await dbQuery(
                        "GET",
                        "targetsHP/" + target.id.substring(1)
                    );
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id.substring(1);
                        }).starting_hp;
                    }
                    targetHPsArray.push({ [`${index}`]: x });
                } else if (target.value == "0") {
                    targetHits.push("0 ");
                    target_pID.push(target.id.substring(1));
                    damage.push("0");
                    let x = await dbQuery(
                        "GET",
                        "targetsHP/" + target.id.substring(1)
                    );
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id.substring(1);
                        }).starting_hp;
                    }
                    targetHPsArray.push({ [`${index}`]: x });
                } else if (target.value == "x") {
                    targetHits.push("1 ");
                    target_pID.push(target.id.substring(1));
                    damage.push("0");
                    let x = await dbQuery(
                        "GET",
                        "targetsHP/" + target.id.substring(1)
                    );
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id.substring(1);
                        }).starting_hp;
                    }
                    targetHPsArray.push({ [`${index}`]: x });
                }
            })
        );
        let sortedTargetHPs = [];
        sortedTargetHPs = targetHPsArray
            .reduce((acc, obj) => {
                const key = parseInt(Object.keys(obj)[0]);
                const value = Object.values(obj)[0];
                acc.push({ key, value });
                return acc;
            }, [])
            .sort((a, b) => a.key - b.key)
            .map((obj) => obj.value);

        if (damage == "") {
            damage = "-";
        }
        if (target_pID == [""]) {
            target_pID = ["-"];
        }
        let target_pIDString = target_pID.join(",");

        if (target_pIDString == "") {
            target_pIDString = "-";
        }

        // get action type
        let actionTypeElement = document.getElementsByName("actions");
        let actionCategory = Array.from(actionTypeElement).find((item) => {
            return item.checked == true;
        }).value;
        if (actionCategory == "action") {
            actionCategory = "attack";
        }

        let notesElement = document.querySelector(".notes_text");
        let notes = notesElement.value || "-";
        if (notes == "") {
            notes = "-";
        }

        let disableConditionsEle = document.getElementsByName("conditions");
        let disableConditionsString = "";
        let disabledConditionsArray = [];

        conditionsOff = [];
        conditionsToTurnOff = {};
        conditionsData = {};
        // The requests that end the ticked conditions, held back until the action
        // itself is in. They used to go out here, before the action was recorded, so
        // a submit that failed further down had already ended the conditions: the
        // modal stayed open with no sign anything had happened, while the conditions
        // it listed were off in the database.
        let conditionEndRequests = [];
        async function processConditions() {
            for (const condition of disableConditionsEle) {
                if (condition.checked) {
                    const object = {
                        affectedpID: condition.getAttribute("data-participant-affected"),
                        condition: condition.getAttribute("data-cpid")
                    }
                    conditionsOff.push(object);           // create arrays for each condition we want to edit
                    conditionsOff.forEach((obj) => {
                        if (!conditionsToTurnOff[obj.condition]) {
                            conditionsToTurnOff[obj.condition] = [];
                            conditionsToTurnOff[obj.condition].affectees = [];
                        }
                        conditionsToTurnOff[obj.condition].affectees.push(obj.affectedpID);
                        conditionsToTurnOff[obj.condition].affectees = [...new Set(conditionsToTurnOff[obj.condition].affectees)]
                    })

                    disableConditionsString += condition.value;

                    conditionEndRequests.push(
                        "disableCondition/" +
                        condition.getAttribute("data-cpid") +
                        "/" +
                        currentRound +
                        "/" +
                        condition.getAttribute(
                            "data-participant-affected"
                        ) +
                        "/" +
                        pID
                    )
                }
            }


            // What each condition is called and who caused it, for the sentence the
            // notes get. A condition is only listed in the participant's
            // conditionsArray who caused it, so the first participant that has it is
            // the one to read both off.
            //
            // This used to be an async callback per participant per condition, which
            // left the answers to whichever microtask happened to settle last and
            // threw on every participant that didn't cause the condition.
            Object.keys(conditionsToTurnOff).forEach((taID) => {
                const causer = ctApp.find((participant) => {
                    return findCondition(participant, taID);
                });
                const condition = causer ? findCondition(causer, taID) : null;
                conditionsToTurnOff[taID]["condition_name"] = condition ? condition.description : null;
                conditionsToTurnOff[taID]["creator"] = causer ? causer.character_name : null;
                conditionsToTurnOff[taID]["creator_numeric"] = causer?.numeric_value || null;
            })

            function findCondition(participant, idToFind) {
                return participant.conditionsArray?.find((condition) => {
                    return condition.conditionID == parseInt(idToFind);
                });
            }
        }
        await processConditions();
        Object.keys(conditionsToTurnOff).forEach((condition) => {
            let string = conditionsToTurnOff[condition].creator + (conditionsToTurnOff[condition].creator_numeric ? " &num;" + conditionsToTurnOff[condition].creator_numeric : "") + "&apos;s " + conditionsToTurnOff[condition].condition_name + " ends for "
            conditionsToTurnOff[condition].affectees.forEach((affectee, index) => {
                let x = ctApp.find((participant) => {
                    return participant.pID == affectee
                })
                string += index < conditionsToTurnOff[condition].affectees.length ? " [" + x.character_name + (x.numeric_value ? " &num;" + x.numeric_value : "") + "]" : ""
            })
            if (notes == "-") {
                notes = string
            } else {
                notes += " | " + string
            }
        })
        // After the condition sentences are in, not before: they carry character
        // names and condition descriptions, and an apostrophe in one of those
        // ("Noska Ur'Gray") ended the SQL string and lost the whole action.
        notes = escapeTextForRequest(notes);
        disableConditionsString = disableConditionsString || "-";

        let hit = 0;
        if (
            targetHits.find((item) => {
                return item == 1;
            })?.length >= 1
        ) {
            hit = 1;
        }
        toolNum = toolNum == "default" ? 0 : toolNum;
        toolNum = toolNum == "" ? 0 : toolNum;

        let dataAction = `submitAction/${ctApp[0].eID}/${currentRound}/${toolNum}/${actionString}/${pID}/${nextTargetID}/${hit}/${actionCategory}/${damage}/${notes}/${disableConditionsString}/${nextAID}/${nextToolID}/${target_pIDString}`;
        // alert(dataAction);
        await dbQuery("GET", dataAction);

        // The action is recorded, so the conditions it ends can go off now.
        for (const request of conditionEndRequests) {
            await dbQuery("GET", request);
        }

        let ctActionObject = {
            result_aID: nextAID,
            result_eID: ctApp[0].eID,
            result_pID: pID,
            aID: nextAID,
            eID: ctApp[0].eID,
            round: currentRound,
            pID: pID,
            targetID: nextTargetID,
            action_type: actionCategory,
            action: actionString,
            toolID: nextToolID,
            hit: hit,
            notes: notes,
            // row: null, // Assuming static or derived value
            // chID: 58, // Assuming static or derived value
            toolName: actionString,
            // damage_dice: "5d8", // Assuming static or derived value
            // save: null, // Assuming static or derived value
            // description: null, // Assuming static or derived value
            // concentration: 0, // Assuming static or derived value
            // holding: 1, // Assuming static or derived value
            // holding_one_round: 0, // Assuming static or derived value
            // conditionID: 11, // Assuming static or derived value
            // start_position: null, // Assuming static or derived value
            // end_position: null, // Assuming static or derived value
            // cpID: 137, // Assuming static or derived value
            // taID: 12, // Assuming static or derived value
            // caID: 14, // Assuming static or derived value
            // start_round: 1, // Assuming static or derived value
            // end_round: 11, // Assuming static or derived value
            // end_pID: result_pID // Assuming static or derived value
        }
        ctActions.push(ctActionObject);

        let round = currentRound;
        targetHits.forEach(async (target, index) => {
            if (
                ctApp.findIndex((participant) => {
                    return participant.pID == pID;
                }) >
                ctApp.findIndex((target) => {
                    return target.pID == target_pID[index];
                })
            ) {
                round = parseInt(currentRound) + 1;
            } else {
                round = parseInt(currentRound);
            }

            // tool is a segment of this URL like any other: a weapon or a typed
            // action with a "/" in its name would leave the route unmatched.
            const dataTarget = `submitTargets/${ctApp[0].eID
                }/${round}/${escapeTextForRequest(tool)}/${actionString}/${pID}/${nextTargetID}/${targetHits[
                    index
                ].trim()}/${actionCategory}/${damage[index]
                }/${notes}/${disableConditionsString}/${nextAID}/${nextToolID}/${target_pID[index]
                }/${sortedTargetHPs[index]}`;

            await dbQuery("GET", dataTarget);
            if (sortedTargetHPs[index] - damage[index] <= 0) {
                await dbQuery(
                    "GET",
                    "terminate/" + target_pID[index] + "/" + round
                );
                await dbQuery(
                    "GET",
                    "endConditions/" + target_pID[index] + "/" + round
                );
            } else {
                await dbQuery(
                    "GET",
                    "revive/" + target_pID[index] + "/"
                )
            }
        });

        let modal = document.querySelector(".modal");

        // Remove the event listener
        modal.removeEventListener("click", modalClickListener);
        // Put the modal away before reloading, not after. load_encounter reads
        // whether the modal is on screen to set modalIsOpen, so hiding it second
        // left the flag saying "open" with nothing up - and the next Enter
        // submitted this same action again, against this modal's row and values,
        // instead of opening a new one for the row the arrows had moved to.
        modal.style.display = "none";
        modalIsOpen = false;
        load_encounter(ctAppEnc, dataNav, false);
        console.log("DOG: ", pID)
        if (concentrationNext == 1 || holding == 1 || forceCondition == 1) {
            launchConditionsModal(
                target_pID,
                concentrationNext,
                conditionName,
                holding,
                holdingOneRound,
                nextAID, 
                pID, 
                currentRound
            );
        }
    }

    
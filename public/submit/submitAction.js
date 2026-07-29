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
        const selectedWeapon = Array.from(document.getElementsByName("weapons")).find((weapon) => {
            return weapon.checked == true;
        });

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
        } else if (weaponTextInput[0]?.value) {
            tool = weaponTextInput[0].value;
            actionString = weaponTextInput[0].value;
            nextToolID = "0";
        } else {
            tool = "none";
            actionString = "none";
            nextToolID = "0";
        }
        actionString = actionString.replaceAll("'", "&apos;")
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
        notes = notes.replaceAll("'", "&apos;").replace("#", "&num;").replace("?", "&quest;")
        if (notes == "") {
            notes = "-";
        }

        let disableConditionsEle = document.getElementsByName("conditions");
        let disableConditionsString = "";
        let disabledConditionsArray = [];

        conditionsOff = [];
        conditionsToTurnOff = {};
        conditionsData = {};
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

                    await dbQuery(
                        "GET",
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


            ctApp.forEach((participant) => {
                Object.keys(conditionsToTurnOff).forEach(async (condition) => {

                    if (!conditionsToTurnOff[condition]["condition_name"]) {
                        conditionsToTurnOff[condition]["condition_name"] = getConditionNameById(condition);
                        const creator = await ctApp.filter((participant) => {
                            return participant.pID == getCreatorById(condition);
                        });
                        conditionsToTurnOff[condition]["creator"] = creator.length > 0 ? creator[0].character_name : null;
                        conditionsToTurnOff[condition]["creator_numeric"] = creator[0].numeric_value ? creator[0].numeric_value : null;
                    }


                    function getConditionNameById(idToFind) {
                        const conditionsArray = participant.conditionsArray;
                        for (const condition of conditionsArray) {
                            if (condition.conditionID == parseInt(idToFind)) {
                                return condition.description;
                            }
                        }
                        return null; // Return null if no match is found
                    }

                    function getCreatorById(idToFind) {
                        const conditionsArray = participant.conditionsArray;
                        for (const condition of conditionsArray) {
                            if (condition.conditionID == parseInt(idToFind)) {
                                return condition.pID;
                            }
                        }
                        return null; // Return null if no match is found
                    }

                })
            })



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

            const dataTarget = `submitTargets/${ctApp[0].eID
                }/${round}/${tool}/${actionString}/${pID}/${nextTargetID}/${targetHits[
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

        load_encounter(ctAppEnc, dataNav, false);
        let modal = document.querySelector(".modal");

        // Remove the event listener
        modal.removeEventListener("click", modalClickListener);
        modal.style.display = "none";
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

    
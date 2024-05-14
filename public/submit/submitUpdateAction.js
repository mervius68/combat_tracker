// this function takes info from the updateAction modal and updates database

async function submitUpdateAction(dataAidValue, pID) {
    const ctAppCopy = await deepCopy(ctApp);
    const data = document.querySelector(".modalSubmit");
    const dataNav = data.getAttribute("data-row");
    const currentRound = parseInt(data.getAttribute("data-current-round"));

    let holdingOneRound = 0;

    // get weapon radio buttons
    let weaponTextInput = document.getElementsByName("weaponTextInput");
    let concentrationNext = 0;
    let holding = 0;
    let weapons,
        tool = [],
        toolNum = [],
        actionString = "",
        nextToolID = "";
    if (weaponTextInput[0].value == "") {
        weapons = document.getElementsByName("weapons");
        tool = Array.from(weapons).find((weapon) => {
            return weapon.checked == true;
        }).value // was .id, but that seemed wrong
        try {
            toolNum = Array.from(weapons).find((weapon) => {
                return weapon.checked == true;
            }).id
        }
        catch (err) { }

        concentrationNext =
            Array.from(weapons)
                .find((weapon) => {
                    return weapon.checked == true;
                })
                .getAttribute("data-concentration") || 0;
        holding =
            Array.from(weapons)
                .find((weapon) => {
                    return weapon.checked == true;
                })
                .getAttribute("data-holding") || 0;
        holdingOneRound =
            Array.from(weapons)
                .find((weapon) => {
                    return weapon.checked == true;
                })
                .getAttribute("data-holding-one-round") || 0;
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
    } else {
        tool = weaponTextInput[0].value;
        actionString = weaponTextInput[0].value;
        nextToolID = "0";
    }

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
    notes = notes.replaceAll("'", "&apos;").replaceAll("#", "&num;").replaceAll("?", "&quest;")
    if (notes == "") {
        notes = "-";
    }

    let disableConditionsEle = document.getElementsByName("conditions");
    let disableConditionsString = "";

    let conditionsOff = [];
    let conditionsToTurnOff = {};


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

    let deleteCondition = false;
    let conditionElement = document?.querySelector('[data-condition-id]')
    // if (conditionElement?.checked == false) {
    //     deleteCondition = true;
    // }
    // alert(conditionElement.outerHTML)
    deleteCondition = conditionElement?.getAttribute("data-condition-id");
    let actionObj = ctActions.find((action) => {
        return action.aID = dataAidValue
    })
    const update = {
        ct_tbl_action: {
            update: {
                aID: dataAidValue,
                action: actionString,
                action_type: actionCategory,
                hit: hit,
                notes: notes,
                toolID: toolNum
            }
        },
        ct_tbl_target: {
            insert: [],
            update: [],
            delete: []
        },
        ct_tbl_condition: {
            delete: {
                aID: deleteCondition == true ? dataAidValue : null,
                // taID: actionObj.taID
            }
        },
        ct_tbl_condition_affectee: {
            delete: {
                taID: deleteCondition == true ? actionObj.taID : null
            }
        },
    }

    // determine change in condition
    const conditionCurrent = Array.from(weapons).find((weapon) => {
        return weapon.checked == true;
    })

    if (actionObj.conditionID && conditionCurrent.getAttribute("data-condition-id") != actionObj.conditionID) {
        const data = {
            taid: actionObj.taID
        }
        await dbQueryPost("deleteCondition", data)
    }

    // figure out any changes in damage
    const damageAmountElements = document.getElementsByName("participants");

    // check to see if the fields are all empty;
    const anyDamageInputUsed = Array.from(damageAmountElements).find((ele) => {
        return ele.value
    })
    // if they're all empty, delete the action
    if (!anyDamageInputUsed) {
        deleteAction(dataAidValue);
        // load_encounter(ctAppEnc, dataNav);
        let modal = document.querySelector(".modal");
        modal.removeEventListener("click", modalClickListener);
        modal.style.display = "none";
        return;
    }


    for (target of damageAmountElements) {
        // console.log("target: ", target)
        const newValue = target.value || "";
        // console.log("newValue: ", newValue)
        const dataAttributes = target.dataset;
        if (dataAttributes.originalvalue !== newValue) {
            let record = { tID: dataAttributes.tid };
            // if the new value is a number
            if (Number.isInteger(parseInt(newValue))) {     // if new value is a number                 DONE
                if (Number.isInteger(parseInt(dataAttributes.originalvalue)) && dataAttributes.originalvalue != "x") {      // original value is number, and new value is number    DONE
                    let diff = parseInt(dataAttributes.originalvalue) - parseInt(newValue);
                    let newHP = dataAttributes.hp == 0 ? 0 : (parseInt(dataAttributes.hp)) - parseInt(newValue) + parseInt(dataAttributes.originalvalue)

                    // get previous item's value
                    record = {
                        aID: dataAidValue,
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        damage: parseInt(newValue),
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: parseInt(dataAttributes.pid), // pID of target
                        originalDamage: dataAttributes.originalvalue,
                        maxHP: dataAttributes.maxhp,
                        newHP: newHP,
                        hit: 1
                    }
                    if (record.newHP < 0) {
                        record.newHP = 0
                    }
                    update.ct_tbl_target.update.push(record);

                    // are there any affected records downstream?

                    let downstreamArray = [];
                    ctApp.forEach(character => {
                        // Check if the character's pID matches the given value
                        if (character.pID == record.target_pID) {
                            // Iterate through each array in the damageArray
                            character.damageArrayNotMapped.forEach(damageArray => {
                                // Filter the damageArray based on the condition that aID is greater than the given threshold
                                const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID > dataAidValue);
                                // Append the filtered items to the result array
                                downstreamArray = downstreamArray.concat(filteredDamageItems);
                            });
                        }
                    });

                    async function getDamageArrayFromCtApp(targetPID) {
                        for (const item of ctApp) {
                            if (item.pID === targetPID) {
                                return item.damageArrayNotMapped;
                            }
                        }
                        return null;  // This confirms that no item matched the targetPID
                    }

                    async function getPreviousNewHP(dataArray, targetAID) {
                        let prevNewHP = null;  // Default to null if no previous object or not found

                        // Assuming dataArray is correctly formatted and it's a double array as observed
                        if (dataArray && dataArray[0]) {
                            for (let i = 0; i < dataArray[0].length; i++) {
                                for (let i = 0; i < dataArray[0].length; i++) {
                                    if (dataArray[0][i].aID === targetAID) {
                                        // Check if there's a previous element
                                        if (i > 0) {
                                            // Return the newHP of the previous element
                                            return dataArray[0][i - 1].newHP;
                                        } else {
                                            // If there is no previous element, return null or a default value
                                            console.warn("No previous entry exists for the given aID.");
                                            return null; // No previous entry exists
                                        }
                                    }
                                }
                            }
                        }
                        return prevNewHP;
                    }

                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = null;
                    if (dataArray) {
                        // Assuming you want to check for the previous newHP of a specific action ID, say 186 as an example
                        bufferHP = await getPreviousNewHP(dataArray, dataAidValue);
                    }

                    bufferHP -= record.damage
                    if (bufferHP < 0) {
                        bufferHP = 0
                    }


                    // Call the async function with bufferHP as argument
                    await processDownstreamArray(bufferHP, downstreamArray);
                    for (const item of ctAppCopy) {
                        if (item.pID === pID) {
                            const notMapped = item.damageArrayNotMapped[currentRound - 1];
                            if (Array.isArray(notMapped)) {
                                const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                                    const isDuplicated = notMapped.some(notMappedObj => {
                                        // Explicitly convert and compare if necessary
                                        const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                            Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                            Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                            Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                            Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                                        return isEqual;
                                    });
                                    return !isDuplicated;
                                });
                                uniqueInDownstream.forEach((item) => {
                                    update.ct_tbl_target.update.push(item);
                                })
                            }
                        }
                    }

                    // look in ctApp for targets in damageArray where
                    // aID > dataAidValue and ctApp pID = pID
                } else if (dataAttributes.originalvalue == null || dataAttributes.originalvalue == "") {                    // original value is "", and new value is number        DONE


                    // newHP needs to equal dataAttributes.pid's latest action's newHP value, and then subtract parseInt(newValue)
                    // get object from ctApp where dataAttributes.pid = pID;
                    // determine position in damageArray where dataAidValue = aID;
                    // subtract 1 from that position and get newHP value
                    // let newHP = that object's newHP minus newValue

                    function getDamageNewHP(ctTarget, maxAid) {
                        if (ctTarget && ctTarget.damageArray.length > 0) {
                            // Flatten the damageArray to simplify processing
                            const flatDamageArray = ctTarget.damageArray.flat();

                            // Filter the array for objects where aID is defined and does not exceed maxAid
                            const validDamages = flatDamageArray.filter(damage => damage.aID !== null && damage.aID <= maxAid);

                            // Find the object with the highest aID that does not exceed maxAid
                            const highestValidDamage = validDamages.reduce((max, damage) =>
                                (max === null || damage.aID > max.aID ? damage : max), null);

                            if (highestValidDamage) {
                                // console.log('Highest valid damage object:', highestValidDamage);
                                return highestValidDamage.newHP;
                            } else {
                                // If no valid damage object is found, return the first object in the first sub-array of damageArray
                                const defaultDamageObject = ctTarget.damageArray[0][0];
                                // console.log('Default damage object:', defaultDamageObject);
                                return defaultDamageObject.newHP;
                            }
                        } else {
                            console.log('No object found or damageArray is empty');
                            return null; // Return null if no damageArray is found or it is empty
                        }
                    }

                    const ctTarget = ctApp.find(item => item.pID == dataAttributes.pid);
                    // console.log("ctTarget: ", ctTarget)
                    const defaultDamageObjectNewHP = getDamageNewHP(ctTarget, dataAidValue);
                    // console.log('NewHP:', defaultDamageObjectNewHP);

                    let diff = 0 - parseInt(newValue);
                    let newHP = defaultDamageObjectNewHP - parseInt(newValue)

                    let damageObj = ctActions.find((item) => {
                        return item.aID = dataAidValue
                    })
                    // console.log("damageObj: ", damageObj)

                    // get previous item's value
                    record = {
                        aID: dataAidValue,
                        tID: null,
                        targetID: damageObj.targetID, // get targetID from another target
                        damage: parseInt(newValue),
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: dataAttributes.pid, // pID of target
                        originalDamage: 0,
                        maxHP: ctTarget.maxhp,
                        newHP: newHP,
                        hit: diff == 0 ? 0 : 1,
                        pID: pID
                    }
                    if (record.newHP < 0) {
                        record.newHP = 0
                    }
                    update.ct_tbl_target.insert.push(record);

                    let downstreamArray = [];
                    ctApp.forEach(character => {
                        // Check if the character's pID matches the given value
                        if (character.pID == record.target_pID) {
                            // Iterate through each array in the damageArray
                            character.damageArrayNotMapped.forEach(damageArray => {
                                // Filter the damageArray based on the condition that aID is greater than the given threshold
                                const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID > dataAidValue);
                                // Append the filtered items to the result array
                                downstreamArray = downstreamArray.concat(filteredDamageItems);
                            });
                        }
                    });

                    async function getDamageArrayFromCtApp(targetPID) {
                        for (const item of ctApp) {
                            if (item.pID === targetPID) {
                                return item.damageArrayNotMapped;
                            }
                        }
                        return null;  // This confirms that no item matched the targetPID
                    }

                    async function getPreviousNewHP(dataArray, targetAID) {
                        let prevNewHP = null;  // Default to null if no previous object or not found

                        // Assuming dataArray is correctly formatted and it's a double array as observed
                        if (dataArray && dataArray[0]) {
                            for (let i = 0; i < dataArray[0].length; i++) {
                                for (let i = 0; i < dataArray[0].length; i++) {
                                    if (dataArray[0][i].aID === targetAID) {
                                        // Check if there's a previous element
                                        if (i > 0) {
                                            // Return the newHP of the previous element
                                            return dataArray[0][i - 1].newHP;
                                        } else {
                                            // If there is no previous element, return null or a default value
                                            console.warn("No previous entry exists for the given aID.");
                                            return null; // No previous entry exists
                                        }
                                    }
                                }
                            }
                        }
                        return prevNewHP;
                    }

                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = null;
                    if (dataArray) {
                        // Assuming you want to check for the previous newHP of a specific action ID, say 186 as an example
                        bufferHP = await getPreviousNewHP(dataArray, dataAidValue) || record.newHP - diff;
                    }
                    // console.log("dataAidValue: ", dataAidValue);
                    bufferHP -= record.damage
                    if (bufferHP < 0) {
                        bufferHP = 0
                    }

                    // Call the async function with bufferHP as argument
                    await processDownstreamArray(bufferHP, downstreamArray);
                    for (const item of ctAppCopy) {
                        if (item.pID === pID) {
                            const notMapped = item.damageArrayNotMapped[currentRound - 1];
                            if (Array.isArray(notMapped)) {
                                const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                                    const isDuplicated = notMapped.some(notMappedObj => {
                                        // Explicitly convert and compare if necessary
                                        const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                            Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                            Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                            Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                            Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                                        return isEqual;
                                    });
                                    return !isDuplicated;
                                });
                                uniqueInDownstream.forEach((item) => {
                                    update.ct_tbl_target.update.push(item);
                                })
                            }
                        }
                    }

                } else if (dataAttributes.originalvalue == "x") {                                                           // original value is "x", and new value is number       DONE
                    let diff = 0 - parseInt(newValue);
                    let newHP = dataAttributes.hp == 0 ? 0 : (parseInt(dataAttributes.hp)) - parseInt(newValue)

                    // get previous item's value
                    record = {
                        aID: dataAidValue,
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        damage: parseInt(newValue),
                        eID: ctApp[0].eID,
                        round: parseInt(currentRound),
                        target_pID: parseInt(dataAttributes.pid), // pID of target
                        originalDamage: 0,
                        maxHP: dataAttributes.maxhp,
                        newHP: newHP,
                        hit: diff == 0 ? 0 : 1
                    }
                    if (record.newHP < 0) {
                        record.newHP = 0
                    }

                    update.ct_tbl_target.update.push(record);

                    let downstreamArray = [];
                    ctApp.forEach(character => {
                        // Check if the character's pID matches the given value
                        if (character.pID == record.target_pID) {
                            // Iterate through each array in the damageArray
                            character.damageArrayNotMapped.forEach(damageArray => {
                                // Filter the damageArray based on the condition that aID is greater than the given threshold
                                const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID > dataAidValue);
                                // Append the filtered items to the result array
                                downstreamArray = downstreamArray.concat(filteredDamageItems);
                            });
                        }
                    });

                    async function getDamageArrayFromCtApp(targetPID) {
                        for (const item of ctApp) {
                            if (item.pID === targetPID) {
                                return item.damageArrayNotMapped;
                            }
                        }
                        return null;  // This confirms that no item matched the targetPID
                    }

                    async function getPreviousNewHP(dataArray, targetAID) {
                        let prevNewHP = null;  // Default to null if no previous object or not found

                        // Assuming dataArray is correctly formatted and it's a double array as observed
                        if (dataArray && dataArray[0]) {
                            for (let i = 0; i < dataArray[0].length; i++) {
                                for (let i = 0; i < dataArray[0].length; i++) {
                                    if (dataArray[0][i].aID === targetAID) {
                                        // Check if there's a previous element
                                        if (i > 0) {
                                            // Return the newHP of the previous element
                                            return dataArray[0][i - 1].newHP;
                                        } else {
                                            // If there is no previous element, return null or a default value
                                            console.warn("No previous entry exists for the given aID.");
                                            return null; // No previous entry exists
                                        }
                                    }
                                }
                            }
                        }
                        return prevNewHP;
                    }

                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = null;
                    if (dataArray) {
                        // Assuming you want to check for the previous newHP of a specific action ID, say 186 as an example
                        bufferHP = await getPreviousNewHP(dataArray, dataAidValue);
                    }

                    bufferHP -= record.damage
                    if (bufferHP < 0) {
                        bufferHP = 0
                    }

                    // Call the async function with bufferHP as argument
                    await processDownstreamArray(bufferHP, downstreamArray);
                    for (const item of ctAppCopy) {
                        if (item.pID === pID) {
                            const notMapped = item.damageArrayNotMapped[currentRound - 1];
                            if (Array.isArray(notMapped)) {
                                const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                                    const isDuplicated = notMapped.some(notMappedObj => {
                                        // Explicitly convert and compare if necessary
                                        const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                            Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                            Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                            Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                            Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                                        return isEqual;
                                    });
                                    return !isDuplicated;
                                });
                                uniqueInDownstream.forEach((item) => {
                                    update.ct_tbl_target.update.push(item);
                                })
                            }
                        }
                    }
                }
            } else if (newValue == "x") {                   // if new value is "x"
                if (Number.isInteger(parseInt(dataAttributes.originalvalue)) && dataAttributes.originalvalue != "0") {          // originalvalue is a number and newvalue is "x"
                    // let newHP = baseHP == 0 ? 0 : parseInt(baseHP) - parseInt(newValue) + parseInt(originalValue)
                    record = {
                        aID: dataAidValue,
                        damage: 0,
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: dataAttributes.pid,
                        originalDamage: dataAttributes.originalvalue,
                        maxHP: dataAttributes.maxhp,
                        newHP: dataAttributes.hp
                    }
                    update.ct_tbl_target.update.push(record);
                    // are there any affected records downstream?
                } else if (dataAttributes.originalvalue == null) {                                                              // original value is "", and new value is "x"
                    record = {
                        targetID: dataAttributes.targetid,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: dataAttributes.pid,
                        damage: newValue,
                        originalDamage: dataAttributes.originalvalue
                    }
                    update.ct_tbl_target.insert.push(record);

                }
            } else if (newValue == "") {                    // new value is ""
                if (dataAttributes.originalvalue) {
                    const ctTarget = ctApp.find(item => item.pID == dataAttributes.pid);
                    // console.log("ctTarget: ", ctTarget)
                    const defaultDamageObjectNewHP = getDamageNewHP(ctTarget, dataAidValue);
                    // console.log('NewHP:', defaultDamageObjectNewHP);

                    let diff = 0;
                    let newHP = defaultDamageObjectNewHP

                    let damageObj = ctActions.find((item) => {
                        return item.aID = dataAidValue
                    })

                    // get previous item's value
                    record = {
                        aID: dataAidValue,
                        tID: parseInt(dataAttributes.tid),
                        targetID: damageObj.targetID, // get targetID from another target
                        damage: 0,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: parseInt(dataAttributes.pid), // pID of target
                        originalDamage: 0,
                        maxHP: ctTarget.maxhp,
                        newHP: newHP,
                        hit: diff == 0 ? 0 : 1,
                        pID: pID
                    }
                    // console.log(record)
                    if (record.newHP < 0) {
                        record.newHP = 0
                    }
                    if (record.tID != null) {
                        update.ct_tbl_target.delete.push(record);
                    }

                    let downstreamArray = [];
                    ctApp.forEach(character => {
                        // Check if the character's pID matches the given value
                        if (character.pID == record.target_pID) {
                            // Iterate through each array in the damageArray
                            character.damageArrayNotMapped.forEach(damageArray => {
                                // Filter the damageArray based on the condition that aID is greater than the given threshold
                                const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID > dataAidValue);
                                // Append the filtered items to the result array
                                downstreamArray = downstreamArray.concat(filteredDamageItems);
                            });
                        }
                    });

                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = null;
                    if (dataArray) {
                        // Assuming you want to check for the previous newHP of a specific action ID, say 186 as an example
                        bufferHP = await getPreviousNewHP(dataArray, dataAidValue) || record.newHP - diff;
                    }
                    // console.log("dataAidValue: ", dataAidValue);
                    bufferHP -= record.damage
                    if (bufferHP < 0) {
                        bufferHP = 0
                    }

                    // Call the async function with bufferHP as argument
                    await processDownstreamArray(bufferHP, downstreamArray);
                    for (const item of ctAppCopy) {
                        if (item.pID === pID) {
                            const notMapped = item.damageArrayNotMapped[currentRound - 1];
                            if (Array.isArray(notMapped)) {
                                const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                                    const isDuplicated = notMapped.some(notMappedObj => {
                                        // Explicitly convert and compare if necessary
                                        const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                            Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                            Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                            Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                            Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                                        return isEqual;
                                    });
                                    return !isDuplicated;
                                });
                                uniqueInDownstream.forEach((item) => {
                                    update.ct_tbl_target.update.push(item);
                                })
                            }
                        }
                    }
                }


                async function getDamageArrayFromCtApp(targetPID) {
                    for (const item of ctApp) {
                        if (item.pID === targetPID) {
                            return item.damageArrayNotMapped;
                        }
                    }
                    return null;  // This confirms that no item matched the targetPID
                }

                async function getPreviousNewHP(dataArray, targetAID) {
                    let prevNewHP = null;  // Default to null if no previous object or not found

                    // Assuming dataArray is correctly formatted and it's a double array as observed
                    if (dataArray && dataArray[0]) {
                        for (let i = 0; i < dataArray[0].length; i++) {
                            for (let i = 0; i < dataArray[0].length; i++) {
                                if (dataArray[0][i].aID === targetAID) {
                                    // Check if there's a previous element
                                    if (i > 0) {
                                        // Return the newHP of the previous element
                                        return dataArray[0][i - 1].newHP;
                                    } else {
                                        // If there is no previous element, return null or a default value
                                        console.warn("No previous entry exists for the given aID.");
                                        return null; // No previous entry exists
                                    }
                                }
                            }
                        }
                    }
                    return prevNewHP;
                }


                function getDamageNewHP(ctTarget, maxAid) {
                    if (ctTarget && ctTarget.damageArray.length > 0) {
                        // Flatten the damageArray to simplify processing
                        const flatDamageArray = ctTarget.damageArray.flat();

                        // Filter the array for objects where aID is defined and does not exceed maxAid
                        const validDamages = flatDamageArray.filter(damage => damage.aID !== null && damage.aID <= maxAid);

                        // Find the object with the highest aID that does not exceed maxAid
                        const highestValidDamage = validDamages.reduce((max, damage) =>
                            (max === null || damage.aID > max.aID ? damage : max), null);

                        if (highestValidDamage) {
                            // console.log('Highest valid damage object:', highestValidDamage);
                            return highestValidDamage.newHP;
                        } else {
                            // If no valid damage object is found, return the first object in the first sub-array of damageArray
                            const defaultDamageObject = ctTarget.damageArray[0][0];
                            // console.log('Default damage object:', defaultDamageObject);
                            return defaultDamageObject.newHP;
                        }
                    } else {
                        console.log('No object found or damageArray is empty');
                        return null; // Return null if no damageArray is found or it is empty
                    }
                }
            }
        }
    }

    await dbQueryPost("updateActionDB", update)
    let nextAID = await dbQuery("GET", "getNewAID");
    nextAID = nextAID.length > 0 && nextAID[0].aID != undefined ? nextAID[0].aID : 1;

    load_encounter(ctAppEnc, dataNav);
    let modal = document.querySelector(".modal");
    modal.removeEventListener("click", modalClickListener);
    modal.style.display = "none";

    if ((concentrationNext == 1 || holding == 1) && !conditionCurrent?.getAttribute("data-condition-id")) {
        launchConditionsModal(
            target_pID,
            concentrationNext,
            conditionName,
            holding,
            holdingOneRound,
            nextAID
        );
    }

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
}
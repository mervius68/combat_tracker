// this function takes info from the updateAction modal and updates database

// forceCondition is the SUBMIT + go to CONDITIONS button: the edit is saved and
// then the conditions modal is opened against this same action, whether or not the
// weapon chosen would have brought it up by itself.
async function submitUpdateAction(dataAidValue, pID, forceCondition = 0) {
    const g = "got here"
    const ctAppCopy = await deepCopy(ctApp);
    const data = document.querySelector(".modalSubmit");
    const dataNav = data.getAttribute("data-row");
    const currentRound = parseInt(data.getAttribute("data-current-round"));

    // Who the action is being credited to. The dropdown in the modal's heading
    // normally still names whoever the action was recorded against; when it does
    // not, this submit is a reassignment as well as an edit, and everything below
    // that says "the participant who acted" means the one it names - see
    // updateAction in app.js for the three tables the new actor is written to.
    const actorSelect = document.querySelector(".actor_select");
    const selectedActor = actorSelect ? parseInt(actorSelect.value) : NaN;
    const actingPID = Number.isInteger(selectedActor) ? selectedActor : Number(pID);
    const actorChanged = actingPID !== Number(pID);

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
    const checkedWeapon = Array.from(document.getElementsByName("weapons")).find((weapon) => {
        return weapon.checked == true;
    });

    // The NONE radio is checked whenever no tool or named action matches the action
    // being edited, so a checked radio on its own doesn't mean the user picked one.
    // Text typed in the free-text field beats NONE; a radio the user actually chose
    // beats the text (choosing one clears the field - see wireActionTextInput).
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
    // After the condition sentences are in, so the character names and condition
    // descriptions they carry are escaped the same way the typed notes are.
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


    // determine what the original condition was
    let originalToolCheckHTML = document.querySelector('[data-originalcheck]')
    let originalCheckID = originalToolCheckHTML?.id;

    // const shouldDeleteCondition = false;
    // compare new condition to original condition


    let deleteCondition = false;
    let conditionElement = document?.querySelector('[data-condition-id]')
    let newCheckID = conditionElement?.id;

    // let conditionCheck = conditionElement.
    deleteCondition = conditionElement?.getAttribute("data-condition-id");
    let actionObj = ctActions.find((action) => {
        return action.aID == dataAidValue
    })
    const update = {
        ct_tbl_action: {
            update: {
                aID: dataAidValue,
                action: actionString,
                action_type: actionCategory,
                hit: hit,
                notes: notes,
                toolID: toolNum,
                // null for an ordinary edit, so the route leaves the actor alone
                pID: actorChanged ? actingPID : null
            }
        },
        ct_tbl_target: {
            insert: [],
            update: [],
            delete: [],
            // Rows that keep their damage but move to a different round - see the
            // pass over damageAmountElements below.
            reround: []
        },
        ct_tbl_condition: {
            delete: {
                aID: newCheckID != originalCheckID ? dataAidValue : null,
                // taID: actionObj.taID
            }
        },
        ct_tbl_condition_affectee: {
            delete: {
                taID: newCheckID != originalCheckID ? actionObj.taID : null
            }
        },
    }

    // determine change in condition
    const conditionCurrent = selectedWeapon;

    // Only when there is a taID to delete by. Without one the request deleted
    // nothing anyway, and the route now says so rather than reporting success,
    // which would abort the rest of this update.
    if (actionObj.conditionID && actionObj.taID != null && conditionCurrent?.getAttribute("data-condition-id") != actionObj.conditionID) {
        console.log(g)
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

    // if they're all empty, and didn't start empty, delete the action a
    if (!anyDamageInputUsed && sortedTargetHPs.length != 0) {
        deleteAction(dataAidValue);
        closeModal();
        return;
    }

    for (target of damageAmountElements) {
        const newValue = target.value || "";
        const dataAttributes = target.dataset;
        const ctTarget = ctApp.find(item => item.pID == dataAttributes.pid);
        let downstreamArray = [];
        // if a field has experienced a change...
        if (dataAttributes.originalvalue !== newValue) {
            let record = { tID: dataAttributes.tid };
            // if the new value is a number
            if (Number.isInteger(parseInt(newValue))) {     // if new value is a number                 DONE
                if (Number.isInteger(parseInt(dataAttributes.originalvalue)) && dataAttributes.originalvalue != "x") {      // original value is number, and new value is number    DONE
                    // Fetch and process data arrays
                    const pid = Number(target.getAttribute("data-pid"));
                    const dataArray1 = await getDamageArrayFromCtApp(pid);
                    const newHits = dataArray1 ? await getPreviousNewHP(dataArray1, dataAidValue) : 0; // Default to 0 if dataArray1 is null
                    const parsedNewValue = parseInt(newValue);
                    const newHP = newHits - parsedNewValue;

                    // Create the record
                    const record = {
                        aID: dataAidValue,
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        damage: parsedNewValue,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: parseInt(dataAttributes.pid),
                        originalDamage: dataAttributes.originalvalue,
                        maxHP: dataAttributes.maxhp,
                        newHP: Math.max(newHP, 0), // Ensure newHP is not negative
                        hit: 1
                    };

                    // Update operations
                    update.ct_tbl_target.update.push(record);
                    downstreamArray = filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray);

                    // Further damage array processing and buffer HP calculations
                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = dataArray ? await getPreviousNewHP(dataArray, dataAidValue) : 0; // Default to 0 if dataArray is null
                    bufferHP = Math.max(bufferHP - record.damage, 0);

                    // Async function calls
                    await processDownstreamArray(bufferHP, downstreamArray);
                    updateUniqueDownstream(ctAppCopy, record.target_pID, currentRound, downstreamArray);
                } else if (dataAttributes.originalvalue == null || dataAttributes.originalvalue == "") {                    // original value is "", and new value is number        DONE
                    const parsedNewValue = parseInt(newValue);
                    const defaultDamageObjectNewHP = getDamageNewHP(ctTarget, dataAidValue);
                    let newHP = defaultDamageObjectNewHP - parsedNewValue;

                    const damageObj = ctActions.find(item => item.aID === dataAidValue);

                    if (!damageObj) {
                        console.warn('No damage object found for aID:', dataAidValue);
                        return; // Exit if no related damage object is found
                    }

                    // Preparing the record
                    const record = {
                        aID: dataAidValue,
                        tID: null,
                        targetID: damageObj.targetID,
                        damage: parsedNewValue,
                        eID: ctApp[0].eID,
                        // Not currentRound: a target above the attacker in the
                        // order shows its new HP in the round below, or the damage
                        // is drawn above the attack that caused it. This is a row
                        // being inserted - a target added to the action that was
                        // not there before - so it gets the same treatment
                        // submitAction gives a brand new one.
                        round: damageRoundFor(actingPID, dataAttributes.pid, currentRound),
                        target_pID: dataAttributes.pid,
                        originalDamage: 0,
                        maxHP: ctTarget ? ctTarget.maxhp : 0, // Safeguard against undefined ctTarget
                        newHP: Math.max(newHP, 0),
                        hit: parsedNewValue === 0 ? 0 : 1,
                        pID: actingPID
                    };

                    update.ct_tbl_target.insert.push(record);

                    downstreamArray = filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray);

                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = dataArray ? await getPreviousNewHP(dataArray, dataAidValue) : record.newHP;
                    bufferHP = Math.max(bufferHP - record.damage, 0);

                    // Call the async function with bufferHP as argument
                    await processDownstreamArray(bufferHP, downstreamArray);
                    updateUniqueDownstream(ctAppCopy, record.target_pID, currentRound, downstreamArray);
                } else if (dataAttributes.originalvalue == "x") {                                                           // original value is "x", and new value is number       DONE
                    const parsedNewValue = parseInt(newValue);
                    const parsedHP = parseInt(dataAttributes.hp);
                    const newHP = parsedHP === 0 ? 0 : parsedHP - parsedNewValue;
                    const diff = 0 - parsedNewValue;  // This could also be simplified to -parsedNewValue directly

                    // Creating the record object with appropriate parsing and logical checks
                    const record = {
                        aID: dataAidValue,
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        damage: parsedNewValue,
                        eID: ctApp[0].eID,
                        round: parseInt(currentRound),
                        target_pID: parseInt(dataAttributes.pid),
                        originalDamage: 0,
                        maxHP: parseInt(dataAttributes.maxhp),
                        newHP: Math.max(newHP, 0),
                        hit: diff === 0 ? 0 : 1
                    };

                    update.ct_tbl_target.update.push(record);
                    downstreamArray = filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray);

                    // Fetch previous newHP and calculate bufferHP
                    const dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = dataArray ? await getPreviousNewHP(dataArray, dataAidValue) : 0;
                    bufferHP = Math.max(bufferHP - parsedNewValue, 0);  // Directly subtract parsedNewValue

                    await processDownstreamArray(bufferHP, downstreamArray);
                    updateUniqueDownstream(ctAppCopy, record.target_pID, currentRound, downstreamArray);
                }
            } else if (newValue == "x") {                   // if new value is "x"
                const originalValue = parseInt(dataAttributes.originalvalue);
                const isOriginalValueValid = Number.isInteger(originalValue) && originalValue !== 0;

                // Determine the record structure based on conditions
                if (isOriginalValueValid) {  // When original value is a valid integer and not zero     DONE
                    const newHP = parseInt(dataAttributes.hp) + parseInt(dataAttributes.originalvalue)
                    record = {
                        aID: dataAidValue,
                        damage: 0,  // Assuming damage is 0 as per your commented code
                        tID: dataAttributes.tid,
                        targetID: dataAttributes.targetid,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: dataAttributes.pid,
                        originalDamage: dataAttributes.originalvalue,
                        maxHP: dataAttributes.maxhp,
                        newHP: newHP,
                    };
                    update.ct_tbl_target.update.push(record);

                    console.log("A: ", record)
                    downstreamArray = filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray);

                    // Further damage array processing and buffer HP calculations
                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = dataArray ? await getPreviousNewHP(dataArray, dataAidValue) : 0; // Default to 0 if dataArray is null
                    bufferHP = Math.max(bufferHP - record.damage, 0);

                    // Async function calls
                    await processDownstreamArray(bufferHP, downstreamArray);
                    updateUniqueDownstream(ctAppCopy, record.target_pID, currentRound, downstreamArray);
                } else if (!dataAttributes.tid) {
                    // "x" against a target this action had no row for: a hit that
                    // did no damage, on somebody it was not aimed at before. This
                    // used to test originalvalue for null, which the modal never
                    // leaves it as - it writes "" - so nothing was recorded at all
                    // and the target quietly failed to appear on the action.
                    //
                    // The row is a target row like any other, carrying zero damage;
                    // what marks it as a hit rather than a miss is the action's own
                    // hit flag, which the pass over the target fields above has
                    // already set from this same "x".
                    const damageObj = ctActions.find(item => item.aID === dataAidValue);
                    if (!damageObj) {
                        console.warn('No damage object found for aID:', dataAidValue);
                        return;
                    }

                    // No damage means the target leaves with the HP it came in
                    // with. The route recomputes the whole timeline for this
                    // participant afterwards regardless, so this is a starting
                    // point rather than the last word.
                    const unchangedHP = getDamageNewHP(ctTarget, dataAidValue);

                    const record = {
                        aID: dataAidValue,
                        tID: null,
                        targetID: damageObj.targetID,
                        damage: 0,
                        eID: ctApp[0].eID,
                        round: damageRoundFor(actingPID, dataAttributes.pid, currentRound),
                        target_pID: dataAttributes.pid,
                        originalDamage: 0,
                        maxHP: ctTarget ? ctTarget.max_hp : 0,
                        newHP: unchangedHP != null ? unchangedHP : (ctTarget ? ctTarget.starting_hp : 0),
                        hit: 1,
                        pID: actingPID
                    };

                    update.ct_tbl_target.insert.push(record);
                    // Nothing downstream to redo: a row that takes nothing off
                    // leaves every later HP in this encounter where it was.
                }
            } else if (newValue == "" && dataAttributes.originalvalue) {                    // new value is ""
                if (parseInt(dataAttributes.originalvalue)) {
                    // Initialize newHP based on target and aid value
                    let newHP = getDamageNewHP(ctTarget, dataAidValue);

                    // Correct assignment in find method, and handle potential undefined return
                    let damageObj = ctActions.find(item => item.aID === dataAidValue);
                    if (!damageObj) {
                        console.error('No damage object found for aID:', dataAidValue);
                        return; // Exit if no damage object is found
                    }

                    // Construct the record object
                    let record = {
                        aID: dataAidValue,
                        tID: parseInt(dataAttributes.tid),
                        targetID: damageObj.targetID,
                        damage: 0,
                        eID: ctApp[0].eID,
                        round: currentRound,
                        target_pID: parseInt(dataAttributes.pid),
                        originalDamage: 0,
                        maxHP: ctTarget.maxhp,
                        newHP: Math.max(newHP, 0), // Ensures newHP is not negative
                        hit: 0, // Since diff is always 0, hit will always be 0
                        pID: actingPID
                    };

                    // Update operations based on tID presence
                    if (record.tID != null) {
                        update.ct_tbl_target.delete.push(record);
                    }

                    // Filter and append damage items
                    downstreamArray = filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray);

                    // Fetch damage array and calculate bufferHP
                    let dataArray = await getDamageArrayFromCtApp(Number(record.target_pID));
                    let bufferHP = dataArray ? await getPreviousNewHP(dataArray, dataAidValue) : record.newHP;
                    bufferHP = Math.max(bufferHP - record.damage, 0); // Ensure bufferHP does not go negative

                    // Process downstream array and update uniquely downstream
                    await processDownstreamArray(bufferHP, downstreamArray);
                    updateUniqueDownstream(ctAppCopy, record.target_pID, currentRound, downstreamArray);
                } else if (dataAttributes.tid) {
                    // The field held "x" or "0" - a hit that did no damage, or a
                    // miss - and has been cleared, so this participant is no longer
                    // one of the action's targets and its row goes. This was an
                    // empty block, so clearing an "x" left the row behind and the
                    // action went on showing a target that had been taken off it.
                    //
                    // Only the row: neither an "x" nor a "0" ever took anything off
                    // anyone's HP, so there is nothing downstream to give back. A
                    // cleared damage figure goes through the branch above, which
                    // does have to repair the HP that followed it.
                    update.ct_tbl_target.delete.push({
                        tID: parseInt(dataAttributes.tid),
                        target_pID: parseInt(dataAttributes.pid)
                    });
                }
            }
        }
    }

    // An action that changed hands takes a different place in the initiative
    // order, and which round a damage row is drawn in depends on that place - so
    // the rows this action already had are re-placed too, not only the ones whose
    // damage was touched. Their damage is not being changed, just where the result
    // is shown, which is why this carries the round and nothing else.
    if (actorChanged) {
        for (const target of damageAmountElements) {
            const tID = target.dataset.tid;
            if (!tID || !target.value) {
                continue;
            }
            update.ct_tbl_target.reround.push({
                tID: tID,
                round: damageRoundFor(actingPID, target.dataset.pid, currentRound)
            });
        }
    }

    await dbQueryPost("updateActionDB", update)
    let nextAvailableActionID = await dbQuery("GET", "getNewAID");
    nextAvailableActionID = nextAvailableActionID.length > 0 && nextAvailableActionID[0].aID != undefined ? nextAvailableActionID[0].aID : 1;

    // Put the modal away before reloading, not after - see submitAction for what
    // hiding it second costs. Awaited, unlike there, because what may open next
    // reads the condition and the participants out of ctApp, and until the reload
    // has finished that is still the encounter as it stood before this edit.
    closeModal();
    await load_encounter(ctAppEnc, dataNav);

    const wantsCondition =
        forceCondition == 1 ||
        ((concentrationNext == 1 || holding == 1) && !conditionCurrent?.getAttribute("data-condition-id"));

    if (wantsCondition) {
        // A condition this action still has is opened to be changed rather than
        // joined by a second one: the actions are read back through a join on aID,
        // so two condition rows for one action would draw the action twice.
        //
        // actionObj is this action as it was before the submit, which is the point
        // - an edit that tore its condition down leaves a taID that no longer finds
        // anything, and a fresh condition is what should be offered instead.
        const existing = actionObj.taID != null ? findConditionByTaID(actionObj.taID) : null;
        if (existing) {
            launchEditConditionModal(existing);
        } else {
            launchConditionsModal(
                target_pID,
                concentrationNext,
                conditionName,
                holding,
                holdingOneRound,
                nextAvailableActionID,
                true,
                dataAidValue,
                actingPID,
                currentRound
            );
        }
    }

    //////////////////////////////////////////////////////   HELPERS!!!    ****************************************************

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
                    actingPID
                )
            }
        }

        // What each condition is called and who caused it, read off the one
        // participant whose conditionsArray holds it - the causer. Was an async
        // callback per participant per condition, which threw on every participant
        // that hadn't caused the condition; see submitAction.
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
    async function getPreviousNewHP(dataArray, targetAID) {
        if (!Array.isArray(dataArray)) {
            return null;
        }

        // Flatten, keep valid damage entries, and sort by aID so we can find the prior entry.
        const flat = dataArray
            .flat()
            .filter((item) => item && item.aID != null && !Number.isNaN(Number(item.aID)))
            .sort((a, b) => Number(a.aID) - Number(b.aID));

        if (flat.length === 0) {
            return null;
        }

        const targetIndex = flat.findIndex((item) => Number(item.aID) === Number(targetAID));
        if (targetIndex > 0) {
            return flat[targetIndex - 1].newHP;
        }

        // If exact aID isn't found (or it's the first), return the last entry before targetAID.
        const prior = flat
            .filter((item) => Number(item.aID) < Number(targetAID))
            .pop();

        return prior ? prior.newHP : null;
    }

    async function getDamageArrayFromCtApp(targetPID) {
        for (const item of ctApp) {
            if (item.pID === targetPID) {
                return item.damageArrayNotMapped;
            }
        }
        return null;  // This confirms that no item matched the targetPID
    }

    function filterAndAppendDamageItems(ctApp, record, dataAidValue, downstreamArray) {
        ctApp.forEach(character => {
            if (character.pID == record.target_pID) {
                character.damageArrayNotMapped.forEach(damageArray => {
                    const filteredDamageItems = damageArray.filter(damageItem =>
                        damageItem &&
                        damageItem.aID !== null &&
                        Number(damageItem.aID) > Number(dataAidValue) &&
                        damageItem.tID != null &&
                        Number.isFinite(Number(damageItem.damage))
                    );
                    downstreamArray = downstreamArray.concat(filteredDamageItems);
                });
            }
        });
        return downstreamArray;
    }

    function updateUniqueDownstream(ctAppCopy, targetPID, currentRound, downstreamArray) {
        for (const item of ctAppCopy) {
            if (Number(item.pID) === Number(targetPID)) {
                const notMapped = item.damageArrayNotMapped[currentRound - 1];
                if (Array.isArray(notMapped)) {
                    const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                        return !notMapped.some(notMappedObj => {
                            return Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                        });
                    });
                    uniqueInDownstream.forEach((item) => {
                        update.ct_tbl_target.update.push(item);
                    });
                }
            }
        }
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
                return highestValidDamage.newHP;
            } else {
                // If no valid damage object is found, return the first object in the first sub-array of damageArray
                const defaultDamageObject = ctTarget.damageArray[0][0];
                return defaultDamageObject.newHP;
            }
        } else {
            console.log('No object found or damageArray is empty');
            return null; // Return null if no damageArray is found or it is empty
        }
    }

}

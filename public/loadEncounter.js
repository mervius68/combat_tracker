// this function loads the encounter when the page loads/refreshes

async function load_encounter(encounterCode = 0, dataNav = 1, getCtApp = true) {
        const selectedRound = document.querySelector(".selected_button")
        modalIsOpen = false // global variable is created

        const encounterData = await dbQuery("GET", "getEncounterID")
        const savedEncounterPlaceholder = encounterData.data.info
        try {
            document.removeEventListener("contextmenu", contextMenuListener);
        } catch (err) { }
        document.removeEventListener("keydown", keydownEventListener);
        document.removeEventListener("keydown", clickEventListener);
        cellCountVertical = 1;
        // const getLatestID = await dbQuery("GET", "latest_eID");
        // const latestID = getLatestID.eID;
        const encounterID = savedEncounterPlaceholder || encounterCode // || latestID;
        let encounter = await dbQuery(
            "GET",
            "selected_encounter/" + encounterID
        );
        let header = document.querySelector(".main_header");

        header.textContent = `${encounter[0]?.campaign || "No available encounters yet"
            } - ${encounter[0]?.location || ""} (${encounter[0]?.description || ""
            })`;



        const originalParticipants = getCtApp == true ? await dbQuery("GET", "participants/" + encounterID) : ctApp
        ctApp = originalParticipants ? [...originalParticipants] : null

        for (participant of originalParticipants) {
            const newNames = await dbQuery("GET", "updatedNames/" + participant.pID)
            participant.character_name = newNames[0].character_name
            // "Goblin #2" -> "Goblin", so same-named creatures can still be grouped
            // as one entry in the initiative dropdown and its modal
            participant.base_character_name = baseCharacterName(participant.character_name)
        }

        // set ctApp to originalParticipants before using reduce method on originalParticipants



        // const getEncounter = await dbQuery("GET", "getLatestEncounterID");

        if (encounterCode == 0) {
            ctAppEnc = savedEncounterPlaceholder || getEncounter.eID;
        }
        // A creature's number is assigned when it joins the encounter and is never
        // reassigned, so nothing is renumbered here. Participants added before the
        // number moved into the name keep theirs in the numeric_value column.

        // get all the actions of this encounter as ctActions and ctActionsConditions
        // global variables
        ctActions = await dbQuery("GET", "actions/" + encounterID);
        for (let i = 0; i < ctActions.length; i++) {
            // Assign the value of result_aID to aID
            ctActions[i].aID = ctActions[i].result_aID;
            ctActions[i].eID = ctActions[i].result_eID;
            ctActions[i].pID = ctActions[i].result_pID;
        }
        ctActionsConditions = await dbQuery("GET", "actionsConditions/" + encounterID)



        function mergeArrays(mainArray, secondaryArray) {
            // Create a map of objects in the secondary array using aID as the key
            const secondaryMap = new Map();
            for (const obj of secondaryArray) {
                secondaryMap.set(obj.aID, obj);
            }

            // Iterate through the main array and add properties from the secondary array
            for (const obj of mainArray) {
                const matchingObj = secondaryMap.get(obj.aID);
                if (matchingObj) {
                    // Merge properties from matchingObj into obj
                    Object.assign(obj, matchingObj);
                }
            }
            return mainArray;
        }

        // merge actions and conditions, as ctActions
        ctActions = mergeArrays(ctActions, ctActionsConditions);

        // get all the conditions of this encounter
        let ctConditions = await dbQuery(
            "GET",
            "getConditionsForCtApp/" + encounterID
        );

        // determine how many rounds are represented in the database
        // for this encounter
        let totalRounds = ctActions.reduce((max, obj) => {
            return obj.round > max ? obj.round : max;
        }, -Infinity);

        // calculate # of rounds
        let ct_damages = await dbQuery("GET", "damages/" + encounterID);
        let damageRounds = 1;
        try {
            damageRounds =
                ct_damages?.reduce((max, obj) => {
                    return obj.round > max.round ? obj : max;
                }).round || 1;
        } catch (err) { }

        // get participants hps by round
        participantsHpsByRound = await dbQuery(
            "GET",
            "hpsByRound/" + encounterID
        );

        // build the damageArray property for each participant; sub-arrays represent rounds
        ctApp.forEach((participant) => {
            participant.damageArray = []; // Initialize the damageArray for each participant
            for (let i = 0; i < damageRounds; i++) {
                participant.damageArray[i] = [];
                if (Array.isArray(participant.damageArray[i - 1])) {
                    // Push the last element of the previous round, if it exists
                    participant.damageArray[i].push({
                        aID: participant.damageArray[i - 1][participant.damageArray[i - 1].length - 1].aID,
                        tID: participant.damageArray[i - 1][participant.damageArray[i - 1].length - 1].tID,
                        newHP: participant.damageArray[i - 1][participant.damageArray[i - 1].length - 1].newHP,
                        targetID: ctApp.find(item => item.aID === this.aID)?.targetID
                    });
                } else {
                    // Otherwise, initialize with the participant's starting HP
                    participant.damageArray[i].push({ aID: null, tID: null, newHP: participant.starting_hp, targetID: ctApp.find(item => item.aID === this.aID)?.targetID });
                }
                let x = participantsHpsByRound.filter((target) => {
                    return (
                        target.result_round == i + 1 &&
                        target.target_pID == participant.pID
                    );
                });
                x.forEach((item) => {
                    // For each item, push an object with tID and newHP
                    if (item.target_pID == participant.pID) {
                        participant.damageArray[i].push({ aID: item.aID, tID: item.tID, damage: item.damage, newHP: item.new_hp, targetID: item.targetID });
                    }
                });
                participant.damageArrayNotMapped = participant.damageArray;
                participant.damageArray = participant.damageArray.map((arr) => {
                    return arr.filter((num, index) => {
                        return index === 0 || num.newHP !== arr[index - 1].newHP;
                    });
                });
            }
        });


        // build a conditionsArray and affectedArray properties for the participant
        ctApp.forEach((participant) => {
            participant.conditionsArray = [];
            participant.affectedArray = [];
            ctConditions.forEach((condition) => {
                if (condition.pID == participant.pID) {
                    participant.conditionsArray.push(condition);
                }
                let affectedArray = [];
                if (condition.affected_pID == participant.pID) {
                    participant.affectedArray.push(condition);
                }
                participant.conditionsArray =
                    participant.conditionsArray.filter(
                        (obj, index, self) =>
                            index ===
                            self.findIndex(
                                (t) => t.conditionID === obj.conditionID
                            )
                    );
            });
        });
        totalRounds = Math.max(totalRounds, damageRounds);

        // assign row_start and row_stop properties for affectedArray and conditionsArray items within ctApp
        ctApp.forEach((participant) => {
            participant.affectedArray.forEach((affected) => {
                affected.row_start = ctApp.findIndex(participant => affected.pID === participant.pID) + 1 + ctApp.length * (affected.start_round - 1);
                affected.row_stop = ctApp.findIndex(participant => affected.end_pID === participant.pID) + 1 + ctApp.length * (affected.end_round - 1);
            })
            participant.conditionsArray.forEach((condition) => {
                condition.row_start = ctApp.findIndex(participant => condition.pID === participant.pID) + 1 + ctApp.length * (condition.start_round - 1);
                condition.row_stop = ctApp.findIndex(participant => condition.end_pID === participant.pID) + 1 + ctApp.length * (condition.end_round - 1);
            })
        })

        // start a loop to build each round
        let mainContainer = document.createElement("div");
        let roundButtonElements = document.querySelector(".displayRounds_buttons_here")
        roundButtonElements.innerHTML = ""
        const buttonAll = document.createElement("button");
        buttonAll.setAttribute("onclick", "displayRound()")
        buttonAll.innerText = "ALL"
        buttonAll.classList.add("round-button")
        roundButtonElements.appendChild(buttonAll);
        for (let i = 1; i <= totalRounds + 1; i++) {
            const button = document.createElement("button");
            button.setAttribute("onclick", "displayRound(" + i + ")")
            button.innerText = i
            button.classList.add("round-button")
            roundButtonElements.appendChild(button);

            if (selectedRound && selectedRound.innerText == i) {
                button.classList.add("selected_button")
                displayRound(i)
            }

            // build the wireframe of first section (participants);
            const ctRound = document.createElement("div");
            ctRound.classList.add("ct_round");
            ctRound.setAttribute("data-round", i);

            const section1 = document.createElement("div");
            section1.classList.add("ct_grid4columns");
            section1.setAttribute("data-section", "1");

            const div1 = document.createElement("div");
            div1.classList.add("section");
            div1.classList.add("header");
            div1.classList.add("ct_turn_bookends");
            div1.classList.add("center");
            div1.textContent = "AC";
            const div2 = document.createElement("div");
            div2.classList.add("section");
            div2.classList.add("header");
            div2.classList.add("ct_turn_bookends");
            div2.classList.add("center");
            div2.textContent = "HP";
            const div3 = document.createElement("div");
            div3.classList.add("section");
            div3.classList.add("header");
            div3.classList.add("ct_turn_bookends");
            div3.classList.add("center");
            div3.textContent = "Character";
            const div4 = document.createElement("div");
            div4.classList.add("section");
            div4.classList.add("header");
            div4.classList.add("ct_turn_bookends");
            div4.classList.add("center");
            div4.textContent = "Init";

            section1.appendChild(div1);
            section1.appendChild(div4);
            section1.appendChild(div3);
            section1.appendChild(div2);

            ctRound.appendChild(section1);
            mainContainer.appendChild(ctRound);

            for (let j = 0; j <= ctApp.length - 1; j++) {
                let div5 = document.createElement("div");
                div5.classList.add("section");
                div5.classList.add("ct_turn_bookends");
                div5.classList.add("center");
                div5.classList.add("pointer");
                div5.setAttribute("data-participant", ctApp[j].pID);
                div5.setAttribute("data-nav", cellCountVertical);
                div5.setAttribute("tabindex", cellCountVertical);
                div5.setAttribute("data-round", i);
                div5.classList.add("delete_character")
                cellCountVertical += 1;
                let div6 = document.createElement("div");
                div6.classList.add("section");
                div6.classList.add("ct_turn_bookends");
                div6.classList.add("center");
                let div7 = document.createElement("div");
                div7.classList.add("section");
                div7.classList.add("ct_turn_bookends");
                div7.classList.add("center");
                let div8 = document.createElement("div");
                div8.classList.add("section");
                div8.classList.add("ct_turn_bookends");
                div8.classList.add("center");
                section1.appendChild(div5);
                section1.appendChild(div6);
                section1.appendChild(div7);
                section1.appendChild(div8);
            }
            ctRound.appendChild(section1);

            // how many attack, bonus, and react sections are needed for this round?
            const filterActionsByType = (ctActions, ctApp, actionType, round) =>
                ctApp.map((participant) =>
                    ctActions.filter((action) =>
                        action.pID === participant.pID &&
                        action.action_type === actionType &&
                        action.round === round
                    )
                );

            let attacksThisRound = filterActionsByType(ctActions, ctApp, "attack", i);
            let numAttacks = Math.max(findLargestSubarray(attacksThisRound), 1);

            let bonusThisRound = filterActionsByType(ctActions, ctApp, "bonus", i);
            let bonusActions = findLargestSubarray(bonusThisRound);

            let reactThisRound = filterActionsByType(ctActions, ctApp, "react", i);
            let reactActions = findLargestSubarray(reactThisRound);

            // build the attack section(s), empty; we'll fill 'em up at the end of the loop
            let sectionHTML = buildASection(
                "attack",
                ctRound,
                numAttacks,
                ctApp
            );
            mainContainer.appendChild(sectionHTML);

            // build the bonus section if there is one, empty.
            sectionHTML = buildASection(
                "bonus",
                ctRound,
                bonusActions,
                ctApp
            );
            mainContainer.appendChild(sectionHTML);

            // build the reaction section if there is one, empty
            sectionHTML = buildASection(
                "react",
                ctRound,
                reactActions,
                ctApp
            );
            mainContainer.appendChild(sectionHTML);

            // build the final section, empty
            const section2 = document.createElement("div");
            section2.classList.add("ct_grid4columns");
            section2.setAttribute("data-section", 2);

            const div5 = document.createElement("div");
            div5.classList.add("section");
            div5.classList.add("header");
            div5.classList.add("ct_turn_bookends");
            div5.classList.add("center");
            div5.textContent = "Drop";
            const div6 = document.createElement("div");
            div6.classList.add("section");
            div6.classList.add("header");
            div6.classList.add("ct_turn_bookends");
            div6.classList.add("align_left");
            div6.textContent = "Start";
            const div7 = document.createElement("div");
            div7.classList.add("section");
            div7.classList.add("header");
            div7.classList.add("ct_turn_bookends");
            div7.classList.add("align_right");
            div7.textContent = "End";
            const div8 = document.createElement("div");
            div8.classList.add("section");
            div8.classList.add("header");
            div8.classList.add("ct_turn_bookends");
            div8.classList.add("center");
            div8.textContent = "Notes";

            section2.appendChild(div5);
            section2.appendChild(div6);
            section2.appendChild(div7);
            section2.appendChild(div8);

            ctApp.forEach((participant) => {
                const div9 = document.createElement("div");
                div9.classList.add("section");
                div9.classList.add("ct_turn_bookends");
                div9.classList.add("center");
                div9.setAttribute("div-participant", participant.pID);
                const div10 = document.createElement("div");
                div10.classList.add("section");
                div10.classList.add("ct_turn_bookends");
                div10.classList.add("align_left");
                const div11 = document.createElement("div");
                div11.classList.add("section");
                div11.classList.add("ct_turn_bookends");
                div11.classList.add("align_right");
                const div12 = document.createElement("div");
                div12.classList.add("section");
                div12.classList.add("ct_turn_bookends");
                div12.classList.add("center");

                section2.appendChild(div9);
                section2.appendChild(div10);
                section2.appendChild(div11);
                section2.appendChild(div12);
            });
            ctRound.appendChild(section2);

            mainContainer.appendChild(ctRound);
            const headerText = document.createElement("h2");
            headerText.textContent =
                i == totalRounds + 1 ? "" : "Round " + (i + 1);
            headerText.setAttribute("data-round", i + 1)

            mainContainer.appendChild(headerText);

            const divCM = document.createElement("div");
            divCM.classList.add("custom-cm");
            const divCM2 = document.createElement("div");
            divCM2.classList.add("custom-cm__item");
            divCM2.classList.add("cmEnd");
            divCM2.innerHTML = "End This Condition";

            divCM.appendChild(divCM2);
            mainContainer.prepend(divCM);

            // populate the sections
            let roundActions = ctActions.filter((action) => {
                return action.round == i;
            });

            // populate participants
            let participantHTML;
            ctApp.forEach(async (participant) => {
                // find latest damage report for this user;
                // if no damages at all, apply participant's starting_hp;
                // else, if no damages for this round, check previous round
                // and so on;

                // figure out hit points by round
                let roundDamages = ct_damages.filter((item) => {
                    return (
                        item.round == i && item.target_pID == participant.pID
                    );
                });
                // sort oldest to newest, e.g. hit points cell might read 
                // "22, 15, 13" (hp descending as they take hits)
                roundDamages.sort((a, b) => a.tID - b.tID);

                // locate the HTML elements for this participant
                participantHTML = mainContainer.querySelectorAll(
                    '[data-round="' +
                    i +
                    '"] [data-section="1"] [data-participant="' +
                    participant.pID +
                    '"]'
                );

                // populate row in section 1 (ac, init, character name, and hp)
                participantHTML.forEach((turn, index) => {
                    // show AC on the combat tracker for this participant
                    turn.innerText =
                        participant.ac +
                        (participant.ac_secondary == null || participant.ac_secondary == ""
                            ? ""
                            : " / " + participant.ac_secondary);

                    // show hit points record for each character
                    let damageObjects = roundDamages.filter((item) => {
                        return item.target_pID == participant.pID;
                    });
                    let hps = "";
                    if (participant.damageArray[i - 1]) {
                        participant.damageArray[i - 1].forEach((hp, index) => {
                            // tagged so it can be paired with the damage that caused it
                            hps +=
                                hpValueMarkup(hp, index, participant.starting_hp) +
                                (index <
                                    participant.damageArray[i - 1].length - 1
                                    ? ", "
                                    : "");
                        });
                        turn.nextSibling.nextSibling.nextSibling.innerHTML = hps;
                    } else {
                        participant.damageArray[i - 2].forEach((hp, index) => {
                            hps =
                                (hp.newHP == participant.starting_hp
                                    ? "<b>" + hp.newHP + "</b>"
                                    : hp.newHP) +
                                (index <
                                    participant.damageArray[i - 2].length - 1
                                    ? ", "
                                    : "");
                        });
                        turn.nextSibling.nextSibling.nextSibling.innerHTML = hps;
                    }

                    // show character name
                    let characterDisplay = "";
                    if (participant.join_round <= i && participant.dead_round >= i) {
                        characterDisplay =
                            participant.character_name +
                            (["null", "", " ", "0", 0].includes(participant.numeric_value)
                                ? ""
                                : " #" + participant.numeric_value);
                    } else {
                        let span6 = document.createElement("span");
                        span6.classList.add("participantGray");
                        span6.innerHTML = participant.character_name +
                            (hasNoNumericValue(participant.numeric_value)
                                ? ""
                                : " #" + participant.numeric_value);
                        characterDisplay = span6.outerHTML;
                    }
                    turn.nextSibling.nextSibling.innerHTML = characterDisplay;

                    // if character has a condition/concentration, show icon with tooltip

                    participant.conditionsArray.forEach(async (condition) => {
                        let affecteesStill = await dbQuery(
                            "GET",
                            "anyoneStillAffected/" +
                            condition.conditionID +
                            "/" +
                            i
                        );

                        const maxValue = Math.max(
                            ...affecteesStill.map((obj) => obj.end_round)
                        );
                        const maxObjects = affecteesStill.filter(
                            (obj) => obj.end_round === maxValue
                        );

                        let affectedThisRound = ctApp.filter((item) =>
                            affecteesStill.some(
                                (obj) => obj.affected_pID === item.pID
                            )
                        );
                        let endRound = maxObjects[0]?.end_round;

                        let affectedInitLower = false;
                        if (
                            affectedThisRound.some(
                                (item) => item.init < participant.init
                            )
                        ) {
                            affectedInitLower = true;
                        }

                        let matchingObject = null;

                        // Iterate over the values array in reverse order
                        for (let i = ctApp.length - 1; i >= 0; i--) {
                            const value = ctApp[i].pID;

                            // Find the first object that matches the current value
                            matchingObject = ctApp.find(
                                (obj) => obj.pID === value
                            );

                            // If a matching object is found, exit the loop
                            if (matchingObject) {
                                break;
                            }
                        }

                        if (
                            ((parseInt(condition.concentration) == 1 || parseInt(condition.holding) == 1) &&
                                parseInt(condition.start_round) <= i &&
                                parseInt(endRound) >= i &&
                                affectedInitLower == true) ||
                            ((parseInt(condition.concentration) == 1 || parseInt(condition.holding) == 1) &&
                                parseInt(condition.start_round) <= i &&
                                parseInt(endRound) >= i &&
                                affectedInitLower == false)
                        ) {
                            // get the participants who are affected by this condition.taID
                            let affectees = await dbQuery(
                                "GET",
                                "getAffectees/" + condition.taID + "/" + i
                            );
                            let affecteesString = "";
                            affectees.forEach((affectee, index) => {
                                affecteesString +=
                                    affectee.character_name +
                                    (affectee.numeric_value
                                        ? " #" + affectee.numeric_value
                                        : "") +
                                    (index != affectees.length - 1 ? ", " : "");
                            });

                            const row = turn.getAttribute("data-nav")
                            if (condition.row_start <= row && condition.row_stop >= row) {
                                let toolTipHTML = document.createElement("span");
                                toolTipHTML.classList.add("tooltip");
                                toolTipHTML.classList.add("concentration");
                                toolTipHTML.setAttribute(
                                    "data-condition-id",
                                    condition.conditionID
                                );
                                toolTipHTML.setAttribute(
                                    "data-affected-id",
                                    condition.affected_pID
                                );
                                toolTipHTML.setAttribute(
                                    "data-taid",
                                    condition.taID
                                );
                                toolTipHTML.setAttribute(
                                    "data-causerID",
                                    condition.pID
                                );

                                toolTipHTML.setAttribute("data-this-round", i);
                                if (parseInt(condition.concentration) == 1) {
                                    toolTipHTML.innerText = "C";
                                } else if (parseInt(condition.holding) == 1) {
                                    toolTipHTML.innerText = "H";
                                    // let x = document.querySelector("[data-participant='64'][data-round='1'][data-nav]");
                                    // x.nextSibling.nextSibling.innerText += "H";
                                }
                                toolTipHTML.classList.add("hovertwin");
                                toolTipHTML.setAttribute("data-hover-id", condition.taID);
                                let toolTipText = document.createElement("span");
                                toolTipText.classList.add("tooltiptext");
                                toolTipText.innerHTML =
                                    condition.description.toUpperCase() +
                                    "<br><br>" +
                                    participant.character_name +
                                    (participant.numeric_value
                                        ? " #" + participant.numeric_value
                                        : "") +
                                    " <span class='arrow-container'></span> " +
                                    affecteesString;
                                toolTipHTML.appendChild(toolTipText);

                                // try {
                                //     let x = document.querySelector("[data-participant='64'][data-round='1'][data-nav]");
                                //     x.nextSibling.nextSibling.innerHTML += toolTipHTML.outerHTML;
                                // }
                                // catch(err) {
                                turn.nextSibling.nextSibling.innerHTML +=
                                    toolTipHTML.outerHTML;
                                // }
                            }



                        }
                    });

                    // if participant is affected by a condition, show icon with tooltip
                    participant.affectedArray.forEach((affected) => {
                        const affectedParticipant = ctApp.find(
                            (participant) => participant.pID === affected.pID
                        );
                        let endPosition = ctApp.findIndex((item) => {
                            return item.pID == affected.end_pID;
                        });
                        let causerPosition = ctApp.findIndex((item) => {
                            return item.pID == affected.pID;
                        });
                        let affectedPosition = ctApp.findIndex((item) => {
                            return item.pID == affected.affected_pID;
                        });

                        const affectedInit = affectedParticipant?.init;
                        if (
                            affected.concentration === 0
                                ? affected.pID !=
                                parseInt(affected.affected_pID)
                                : affected.concentration === 1 &&
                                parseInt(affected.start_round) <= i &&
                                parseInt(affected.end_round) >= i
                        ) {
                            let starter = parseInt(affected.start_round);
                            let stopper = parseInt(affected.end_round);

                            if (starter < i && stopper > i) {
                                populateAffected();
                            } else if (
                                affectedPosition == endPosition &&
                                affectedPosition < causerPosition &&
                                starter == i
                            ) {
                            } else if (
                                endPosition <= affectedPosition &&
                                ((starter == i && stopper > i) ||
                                    (endPosition == affectedPosition &&
                                        stopper == i))
                            ) {
                                populateAffected();
                            } else if (
                                affectedPosition <= causerPosition &&
                                starter < i &&
                                stopper == i
                            ) {
                                populateAffected();
                            } else if (
                                causerPosition < affectedPosition &&
                                affectedPosition <= endPosition
                            ) {
                                if (starter == i && stopper == i) {
                                    populateAffected();
                                } else if (starter < i && stopper == i) {
                                    populateAffected();
                                } else if (starter == i && stopper > i) {
                                    populateAffected();
                                }
                            }

                            function populateAffected() {
                                const row = turn.getAttribute("data-nav")
                                if (affected.row_start <= row && affected.row_stop >= row) {
                                    const toolTipHTML =
                                        document.createElement("span");
                                    toolTipHTML.classList.add("tooltip");
                                    toolTipHTML.classList.add("affected");
                                    toolTipHTML.setAttribute(
                                        "data-condition-id",
                                        affected.conditionID
                                    );
                                    toolTipHTML.setAttribute(
                                        "data-affected-id",
                                        affected.affected_pID
                                    );
                                    toolTipHTML.setAttribute("data-this-round", i);
                                    toolTipHTML.innerHTML = "A";
                                    toolTipHTML.classList.add("hovertwin")
                                    toolTipHTML.setAttribute(
                                        "data-taid",
                                        affected.taID
                                    );
                                    toolTipHTML.setAttribute(
                                        "data-hover-id",
                                        affected.taID
                                    );
                                    let span5 = document.createElement("span");
                                    span5.classList.add("tooltiptext");
                                    span5.innerHTML =
                                        affected.description +
                                        "<br><br>" +
                                        ctApp.find((participant) => {
                                            return affected.pID == participant.pID;
                                        }).character_name +
                                        (ctApp.find((participant) => {
                                            return affected.pID == participant.pID;
                                        }).numeric_value
                                            ? " #" +
                                            ctApp.find((participant) => {
                                                return (
                                                    affected.pID ==
                                                    participant.pID
                                                );
                                            }).numeric_value
                                            : "") +
                                        " <span class='arrow-container'></span> " +
                                        participant.character_name +
                                        (participant.numeric_value
                                            ? " #" + participant.numeric_value
                                            : "");
                                    toolTipHTML.appendChild(span5);
                                    turn.nextSibling.nextSibling.appendChild(
                                        toolTipHTML
                                    );
                                }


                            }
                        }
                    });

                    // show initiative value for this character
                    turn.nextSibling.innerText =
                        participant.init;
                });

                // does the row deserve a yellow or red highlight (e.g. 50% hp or 0 hp)
                participantHTML.forEach(async (turn, index) => {
                    let newValue = turn.nextSibling.nextSibling.nextSibling.innerText.split(",");
                    // if newValue contains comma, get what's to the right of the last comma
                    // const arr = previousHP.nextSibling.innerHTML.split(","); // split the string into an array based on comma delimiter
                    const lastNum = newValue.pop().trim(); // remove and return the last element of the array, and trim any whitespace
                    let x =
                        turn.nextSibling.nextSibling.querySelectorAll(
                            ".affected"
                        );
                    // compare that value to participant.max_hp
                    if (lastNum <= participant.max_hp / 2) {
                        turn.classList.add("yellow");
                        turn.nextSibling.classList.add("yellow");
                        turn.nextSibling.nextSibling.classList.add("yellow");
                        turn.nextSibling.nextSibling.nextSibling.classList.add(
                            "yellow"
                        );
                    }
                    if (lastNum <= 0) {
                        turn.classList.add("red");
                        turn.nextSibling.classList.add("red");
                        turn.nextSibling.nextSibling.classList.add("red");
                        x.forEach((y) => {
                            y.parentNode.removeChild(y);
                        });
                        turn.nextSibling.nextSibling.nextSibling.classList.add(
                            "red"
                        );
                    }
                });
            });
        }

        // load the actions into the wireframe
        try {
            for (const action of ctActions) {
                let tool = {};
                if (action.toolID) {
                    tool = await dbQuery("GET", "tool/" + action.toolID);
                    tool = tool[0].toolName;
                } else {
                    tool = action.action;
                }
                let target = {};
                if (action.targetID) {
                    target = await dbQuery("GET", "target/" + action.targetID);
                }

                let targets,
                    targetString = "",
                    damageString = "";
                try {
                    targets = await dbQuery(
                        "GET",
                        "targets/" + target[0].targetID
                    );
                    targetString = "";
                    damageString = "";
                    targets.forEach((item, index) => {
                        targetString +=
                            (index > 0 ? " / " : "") +
                            item.character_name +
                            (item.numeric_value
                                ? " #" + item.numeric_value
                                : "");
                        // tagged so it can be paired with the HP value it produced
                        damageString +=
                            (index > 0 ? " / " : "") + hpDamageMarkup(item);
                    });
                } catch (err) { }

                let actionObject = {};
                actionObject.tool = tool || "";
                actionObject.hit =
                    action.hit == 1 ? "<b>✅</b>" : "";
                actionObject.targetName = targetString || "";
                actionObject.damage = damageString || "";
                actionObject.notes = action.notes || "";
                actionObject.end = action.end_note || "";
                actionObject.start = action.start_note || "";
                actionObject.aID = action.result_aID || "";

                await sendToCoordinate(
                    action.round,
                    action.pID,
                    action.action_type || "",
                    actionObject,
                    action.taID || "0"
                );
            }
        } catch (err) { }

        // size the sections
        document.querySelector(".ct_round_container").innerHTML =
            mainContainer.innerHTML;
        // let the user drag participant rows to reorder initiative
        enableInitiativeRowDragging();
        // pair each damage with its HP result, and each action with its comments
        enableLinkedHighlighting();
        resizeSections();
        // score the battle beneath the rounds: killing blows and spent ammunition
        renderBattleTally(ctApp, ctActions, ct_damages);

        // assign background colors to show selected line
        let startNav = document.querySelector(`[data-nav="${dataNav}"]`);
        try {
            startNav.classList.add("selected");
            startNav.nextSibling.classList.add("selected");
            startNav.nextSibling.nextSibling.classList.add("selected");
            startNav.nextSibling.nextSibling.nextSibling.classList.add(
                "selected"
            );
            navify();
        } catch (err) { }

        if (selectedRound) {
            displayRound(selectedRound.innerText)
        }

        // function to populate the individual actions
        function sendToCoordinate(round, participant, actionType, actionObject, taID) {
            try {
                let y = mainContainer.querySelector(
                    `[data-round="${round}"] [data-section="2"] [div-participant="${participant}"]`
                );
                let y_drop = y;
                let y_start = y.nextSibling;
                let y_notes = y.nextSibling.nextSibling.nextSibling
                let y_end = y.nextSibling.nextSibling;

                if (
                    (actionObject.notes && actionObject.notes != "-")
                ) {
                    y_notes.innerHTML =
                        y.nextSibling.nextSibling.nextSibling.innerHTML +
                        (y.nextSibling.nextSibling.nextSibling.innerHTML == ""
                            ? ""
                            : " | ") +
                        `<span class="notes" data-aid=${actionObject.aID}>${actionObject.notes}</span>` +
                        " ";
                }

                // tagged so each comment pairs with the action that wrote it
                if (actionObject.start && actionObject.start != "-") {
                    y_start.innerHTML = actionNoteMarkup(actionObject.start, actionObject.aID);
                }

                if (actionObject.end && actionObject.end != "-") {
                    y_end.innerHTML = actionNoteMarkup(actionObject.end, actionObject.aID);
                }

                if (actionObject.drop && actionObject.drop != "-") {
                    y_drop.innerHTML = actionObject.drop;
                }
            } catch (err) { }

            let actionHTML = "data-" + actionType;
            let action = 1;
            let x;
            try {
                do {
                    x = mainContainer.querySelector(
                        `[data-round="${round}"] [${actionHTML}="${action}"] [data-participant="${participant}"]`
                    );
                    action += 1;
                } while (x.innerHTML !== "");
                if (taID != "0") {
                    x.classList.add("hovertwin");
                    x.setAttribute("data-hover-id", taID || "0")
                }
                x.innerHTML = `<span class="mouse-able" data-aid=${actionObject.aID}>${actionObject.tool}</span>`;
                x.nextSibling.innerHTML = actionObject.hit
                x.nextSibling.nextSibling.innerHTML = actionObject.targetName;
                x.nextSibling.nextSibling.nextSibling.innerHTML =
                    actionObject.damage;


            } catch (err) { }
        }

        let xyz;
        try {
            xyz = document.querySelectorAll(".ct_round");
            xyz[xyz.length - 1].classList.add("hidden");
            xyz[xyz.length - 1].classList.add("sometimes_hidden");
            xyz[xyz.length - 1].previousSibling.classList.add("hidden");
            xyz[xyz.length - 1].previousSibling.classList.add("sometimes_hidden");
            startNav.parentNode.parentNode.classList.remove("hidden");
            startNav.parentNode.parentNode.previousSibling.classList.remove(
                "hidden"
            );
        }
        catch (err) { }


        const cm = document.querySelector(".custom-cm");

        const contextMenuListener = function (e) {
            e.preventDefault();
            const element = e.target;
            let dataAidValue;

            // First, check if the element itself or its parent (if it's a <span>) has the data-aid attribute
            dataAidValue = element.dataset.aid || (element.tagName.toLowerCase() === 'span' && element.parentElement.dataset.aid) || null;

            // If dataAidValue is still null, check for other attributes or log an error if none are relevant
            if (!dataAidValue) {
                if (!element.dataset.nav && !element.dataset.taid) {
                    return; // Exit the event handler if no relevant data attributes are found
                }
                // Additional logic for when element has data-nav but no data-aid
            }

            const contextMenu = document.querySelector(".custom-cm__item")
            contextMenu.innerText = "";
            if (element.classList.contains("affected") || element.classList.contains("concentration")) {
                const scrollLeft =
                    window.pageXOffset || document.documentElement.scrollLeft;
                const scrollTop =
                    window.pageYOffset || document.documentElement.scrollTop;
                const menuHeight = cm.offsetHeight;
                const menuWidth = cm.offsetWidth;
                const clickY = e.clientY + scrollTop;
                const clickX = e.clientX + scrollLeft;
                const maxY = window.innerHeight + scrollTop;
                const maxX = window.innerWidth + scrollLeft;

                const top = clickY + menuHeight > maxY ? maxY - menuHeight : clickY;
                const left = clickX + menuWidth > maxX ? maxX - menuWidth : clickX;

                const editCondition = document.createElement("div");
                editCondition.classList.add("clickable_area")
                editCondition.classList.add("context_div");
                editCondition.textContent = "Edit Condition";
                editCondition.setAttribute("onclick", "editCondition()");

                const stopCondition = document.createElement("div");
                stopCondition.classList.add("clickable_area")
                stopCondition.classList.add("context_div");
                stopCondition.textContent = "Stop Condition";
                stopCondition.setAttribute("onclick", "endCondition()");

                const endCondition = document.createElement("div");
                endCondition.classList.add("clickable_area")
                endCondition.classList.add("context_div");
                endCondition.textContent = "Delete Condition";
                endCondition.setAttribute("onclick", "deleteCondition()");

                contextMenu.appendChild(editCondition);
                contextMenu.appendChild(stopCondition);
                contextMenu.appendChild(endCondition);

                let cmEnd = document.querySelector(".cmEnd");
                cmEnd.setAttribute(
                    "data-cm-condition-id",
                    element.getAttribute("data-condition-id")
                );
                cmEnd.setAttribute(
                    "data-cm-causer-id",
                    element.getAttribute("data-causerID")
                );
                cmEnd.setAttribute(
                    "data-cm-affected-id",
                    element.getAttribute("data-affected-id")
                );
                cmEnd.setAttribute(
                    "data-cm-taid",
                    element.getAttribute("data-taid")
                );
                cmEnd.setAttribute(
                    "data-cm-round",
                    element.getAttribute("data-this-round")
                );
                cmEnd.setAttribute(
                    "data-cm-concentration-or-affected",
                    element.classList.contains("affected")
                        ? "affected"
                        : "concentration"
                );
                showContextMenu()
            }
            else if ((element.classList.contains("attack") || element.classList.contains("attack_alt") || element.parentElement.classList.contains("attack") || element.parentElement.classList.contains("attack_alt")) && element.innerText !== "" && (element.hasAttribute("data-participant") || element.parentElement.hasAttribute("data-participant"))) {
                const editAction = document.createElement("div");
                editAction.classList.add("clickable_area")
                editAction.classList.add("context_div");
                editAction.textContent = "Edit Action";
                editAction.addEventListener("click", () => modalUpdateAction(dataAidValue));

                const deleteActionEl = document.createElement("div");
                deleteActionEl.classList.add("clickable_area")
                deleteActionEl.classList.add("context_div");
                deleteActionEl.textContent = "Delete Action";
                deleteActionEl.addEventListener("click", () => deleteAction(dataAidValue));

                contextMenu.appendChild(editAction);
                const br = document.createElement("br");
                // contextMenu.appendChild(br);
                contextMenu.appendChild(deleteActionEl);
                showContextMenu()
            }
            else if ((element.classList.contains("bonus") || element.parentElement.classList.contains("bonus")) && element.innerText !== "") {
                const editAction = document.createElement("div");
                editAction.classList.add("clickable_area")
                editAction.classList.add("context_div");
                editAction.textContent = "Edit Action";
                editAction.addEventListener("click", () => modalUpdateAction(dataAidValue));

                const deleteBonusActionEl = document.createElement("div");
                deleteBonusActionEl.innerHTML = "Delete Action";
                deleteBonusActionEl.classList.add("context_div")
                deleteBonusActionEl.addEventListener("click", () => deleteAction(dataAidValue));

                contextMenu.appendChild(editAction);
                contextMenu.appendChild(deleteBonusActionEl)
                showContextMenu()
            }
            else if ((element.classList.contains("react") || element.parentElement.classList.contains("react")) && element.innerText !== "") {
                const editAction = document.createElement("div");
                // editAction.classList.add("clickable_area")
                editAction.classList.add("context_div");
                editAction.textContent = "Edit Action";
                editAction.addEventListener("click", () => modalUpdateAction(dataAidValue));

                const deleteReactionEl = document.createElement("div");
                deleteReactionEl.classList.add("context_div")
                deleteReactionEl.innerHTML = "Delete Reaction";
                deleteReactionEl.addEventListener("click", () => deleteAction(dataAidValue));

                contextMenu.appendChild(editAction);
                contextMenu.appendChild(deleteReactionEl)
                showContextMenu()
            }
            else if (element.classList.contains("notes") && element.innerText !== "") {
                const editAction = document.createElement("div");
                editAction.classList.add("context_div");
                editAction.textContent = "Edit Action";
                editAction.addEventListener("click", () => modalUpdateAction(dataAidValue));

                const deleteOption = document.createElement("div");
                deleteOption.classList.add("context_div");
                deleteOption.textContent = "Delete Note";
                deleteOption.addEventListener("click", () => deleteNote(dataAidValue));

                contextMenu.appendChild(editAction);
                contextMenu.appendChild(deleteOption);
                showContextMenu()
            }
            else if (element.classList.contains("delete_character") && element.innerText !== "") {
                const characterToAdjustInit = element.getAttribute("data-participant")
                const divAdjustInit = document.createElement("div");
                divAdjustInit.classList.add("context_div");
                divAdjustInit.textContent = "Adjust Initiative";
                divAdjustInit.addEventListener("click", () => adjustInitModal(characterToAdjustInit));

                const characterToAdjustHP = element.getAttribute("data-participant")
                const divAdjustHP = document.createElement("div");
                divAdjustHP.classList.add("context_div");
                divAdjustHP.textContent = "Adjust Starting HP";
                divAdjustHP.addEventListener("click", (e) => adjustHPModal(e, characterToAdjustHP));

                const characterToDelete = element.getAttribute("data-participant")
                const deleteCharacter = document.createElement("div");
                deleteCharacter.classList.add("context_div");
                deleteCharacter.textContent = "Delete Character";
                deleteCharacter.addEventListener("click", () => deleteParticipant(characterToDelete));

                const br = document.createElement("br");
                const br2 = document.createElement("br");
                contextMenu.appendChild(divAdjustInit);
                // contextMenu.appendChild(br);
                contextMenu.appendChild(divAdjustHP);
                // contextMenu.appendChild(br2);
                contextMenu.appendChild(deleteCharacter);
                showContextMenu();
            }
        };

        function showContextMenu(show = true) {
            cm.style.display = show ? "block" : "none";

            // Adjust for scroll position
            const scrollX = window.scrollX || window.pageXOffset || document.documentElement.scrollLeft;
            const scrollY = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

            cm.style.left = event.clientX + scrollX + "px";
            cm.style.top = event.clientY + scrollY + "px";
        }

        window.addEventListener("click", () => {
            showContextMenu(false);
        });

        const keyupEventListener = (e) => {
            const modal = document.querySelector(".modal");
            if (e.key === "Escape" && modalIsOpen) {
                modal.style.display = "none";
                modalIsOpen = false;
            } else if (e.key === "Enter") {
                if (!modalIsOpen) {
                    e.altKey ? launchConditionsModal("turn") : launchActionModal("turn");
                } else {
                    const modalType = modal.querySelector(".modal-body").getAttribute("data-modal-type");
                    if (modalType === "action") {
                        submitAction();
                    } else if (modalType === "condition") {
                        submitCondition();
                    }
                    modalIsOpen = false;
                    document.removeEventListener("keyup", keyupEventListener);
                }
            }

        }

        document.addEventListener("keyup", keyupEventListener);
        document.addEventListener("contextmenu", contextMenuListener);
        document.addEventListener('contextmenu', function (event) {
            console.log('Right-clicked element:', event.target);
            // console.log("Right-clicked element's parent:", event.target.parentElement)
        });


        // fill values for dropdown
        // fillDropdown(encounterCode);
        fillInitDropdown();
        fillEncounterDropdown();

        // Get all elements with the specified data-hover-id attribute
        const elements = document.querySelectorAll('[data-hover-id]');

        // Attach hover event listeners to each element
        elements.forEach(element => {
            element.addEventListener('mouseenter', handleMouseEnter);
            element.addEventListener('mouseleave', handleMouseLeave);
        });

        function handleMouseEnter(event) {
            // Get the data-hover-id attribute value of the current element
            const hoverId = event.target.getAttribute('data-hover-id');

            // Find all elements with the same data-hover-id attribute
            const twinElements = document.querySelectorAll(`[data-hover-id="${hoverId}"]`);

            // Apply the hover effect to all twin elements
            twinElements.forEach(twinElement => {
                twinElement.classList.add('hovered');
            });
        }

        function handleMouseLeave(event) {
            // Get the data-hover-id attribute value of the current element
            const hoverId = event.target.getAttribute('data-hover-id');

            // Find all elements with the same data-hover-id attribute
            const twinElements = document.querySelectorAll(`[data-hover-id="${hoverId}"]`);

            // Remove the hover effect from all twin elements
            twinElements.forEach(twinElement => {
                twinElement.classList.remove('hovered');
            });
        }
    }
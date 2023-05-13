
    let cellCountVertical;
    let participantsHpsByRound;

    async function load_encounter(encounterCode = 0, dataNav = 1) {
        document.removeEventListener("keydown", keydownEventListener);
        document.removeEventListener("keydown", clickEventListener);
        cellCountVertical = 1;
        let latestID = await dbQuery("GET", "latest_eID");
        let encounterID;
        if (encounterCode == 0) {
            encounterID = latestID[0]?.eID || 0;
        } else if (encounterCode == 1) {
            // get encounterID from selected value in dropdown
            let html = document
                .querySelector(".indexDrpDwn")
                .getAttribute("value");
        }
        if (encounterID == 0) {
            // initiate modal to request info for new encounter:
            // name of the encounter;
            // participants;
            // initiative

            new_encounter(encounterID);
        }
        let encounter = await dbQuery(
            "GET",
            "selected_encounter/" + encounterID
        );
        let header = document.querySelector(".main_header");

        header.textContent = `${
            encounter[0]?.campaign || "No available encounters yet"
        } - ${encounter[0]?.location || ""} (${
            encounter[0]?.description || ""
        })`;

        ctApp = await dbQuery("GET", "participants/" + encounterID);

        // get all the actions of this encounter
        let ctActions = await dbQuery("GET", "actions/" + encounterID);

        // get all the conditions of this encounter
        let ctConditions = await dbQuery(
            "GET",
            "getConditionsForCtApp/" + encounterID
        );

        // determine how many rounds are represented in the database
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
        } catch (err) {}

        // get participants hps by round
        participantsHpsByRound = await dbQuery(
            "GET",
            "hpsByRound/" + encounterID
        );

        // build the damageArray property for each participant; sub-arrays represent rounds
        ctApp.forEach((participant) => {
            participant.damageArray = [];
            for (let i = 0; i < damageRounds; i++) {
                participant.damageArray[i] = [];
                if (Array.isArray(participant.damageArray[i - 1])) {
                    participant.damageArray[i].push(
                        participant.damageArray[i - 1][
                            participant.damageArray[i - 1].length - 1
                        ]
                    );
                } else {
                    participant.damageArray[i].push(participant.starting_hp);
                }
                let x = participantsHpsByRound.filter((target) => {
                    return (
                        target.round == i + 1 &&
                        target.target_pID == participant.pID
                    );
                });
                x.forEach((item) => {
                    if (item.target_pID == participant.pID) {
                        participant.damageArray[i].push(item.new_hp);
                    }
                });
                participant.damageArray = participant.damageArray.map((arr) => {
                    return arr.filter((num, i) => {
                        return i === 0 || num !== arr[i - 1];
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

        // start a loop
        let mainContainer = document.createElement("div");
        for (let i = 1; i <= totalRounds + 1; i++) {
            // determine which of the participants should be in this round
            let roundParticipants = ctApp.filter(
                (participant) =>
                    participant.join_round <= i &&
                    (participant.dead_round || 500) >= i
            );

            // build the wireframe of first section (participants);

            let ctRound = document.createElement("div");
            ctRound.classList.add("ct_round");
            ctRound.setAttribute("data-round", i);

            let section1 = document.createElement("div");
            section1.classList.add("ct_grid4columns");
            section1.setAttribute("data-section", "1");

            let div1 = document.createElement("div");
            div1.classList.add("section");
            div1.classList.add("header");
            div1.classList.add("ct_turn_bookends");
            div1.classList.add("center");
            div1.textContent = "AC";
            let div2 = document.createElement("div");
            div2.classList.add("section");
            div2.classList.add("header");
            div2.classList.add("ct_turn_bookends");
            div2.classList.add("center");
            div2.textContent = "HP";
            let div3 = document.createElement("div");
            div3.classList.add("section");
            div3.classList.add("header");
            div3.classList.add("ct_turn_bookends");
            div3.classList.add("center");
            div3.textContent = "Character";
            let div4 = document.createElement("div");
            div4.classList.add("section");
            div4.classList.add("header");
            div4.classList.add("ct_turn_bookends");
            div4.classList.add("center");
            div4.textContent = "Init";

            section1.appendChild(div1);
            section1.appendChild(div2);
            section1.appendChild(div3);
            section1.appendChild(div4);

            ctRound.appendChild(section1);
            mainContainer.appendChild(ctRound);

            for (let j = 0; j <= roundParticipants.length - 1; j++) {
                let div5 = document.createElement("div");
                div5.classList.add("section");
                div5.classList.add("ct_turn_bookends");
                div5.classList.add("center");
                div5.classList.add("pointer");
                div5.setAttribute("data-participant", roundParticipants[j].pID);
                div5.setAttribute("data-nav", cellCountVertical);
                div5.setAttribute("tabindex", cellCountVertical);
                div5.setAttribute("data-round", i);
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
            let attacksThisRound = [];
            let bonusThisRound = [];
            let reactThisRound = [];
            roundParticipants.forEach((participant) => {
                attacksThisRound.push(
                    ctActions.filter((action) => {
                        return (
                            action.pID == participant.pID &&
                            action.action_type == "attack" &&
                            action.round == i
                        );
                    })
                );
            });
            roundParticipants.forEach((participant) => {
                bonusThisRound.push(
                    ctActions.filter((action) => {
                        return (
                            action.pID == participant.pID &&
                            action.action_type == "bonus" &&
                            action.round == i
                        );
                    })
                );
            });
            roundParticipants.forEach((participant) => {
                reactThisRound.push(
                    ctActions.filter((action) => {
                        return (
                            action.pID == participant.pID &&
                            action.action_type == "react" &&
                            action.round == i
                        );
                    })
                );
            });
            let numAttacks = findLargestSubarray(attacksThisRound);
            numAttacks = Math.max(numAttacks, 1);
            let bonusActions = findLargestSubarray(bonusThisRound);
            let reactActions = findLargestSubarray(reactThisRound);

            // build the attack section(s), empty; we'll fill 'em up at the end of the loop
            let sectionHTML = buildASection(
                "attack",
                ctRound,
                numAttacks,
                roundParticipants
            );
            mainContainer.appendChild(sectionHTML);

            // build the bonus section if there is one, empty.
            sectionHTML = buildASection(
                "bonus",
                ctRound,
                bonusActions,
                roundParticipants
            );
            mainContainer.appendChild(sectionHTML);

            // build the reaction section if there is one, empty
            sectionHTML = buildASection(
                "react",
                ctRound,
                reactActions,
                roundParticipants
            );
            mainContainer.appendChild(sectionHTML);

            // build the final section, empty
            let section2 = document.createElement("div");
            section2.classList.add("ct_grid4columns");
            section2.setAttribute("data-section", 2);

            let div5 = document.createElement("div");
            div5.classList.add("section");
            div5.classList.add("header");
            div5.classList.add("ct_turn_bookends");
            div5.classList.add("center");
            div5.textContent = "Drop";
            let div6 = document.createElement("div");
            div6.classList.add("section");
            div6.classList.add("header");
            div6.classList.add("ct_turn_bookends");
            div6.classList.add("align_left");
            div6.textContent = "Start";
            let div7 = document.createElement("div");
            div7.classList.add("section");
            div7.classList.add("header");
            div7.classList.add("ct_turn_bookends");
            div7.classList.add("align_right");
            div7.textContent = "End";
            let div8 = document.createElement("div");
            div8.classList.add("section");
            div8.classList.add("header");
            div8.classList.add("ct_turn_bookends");
            div8.classList.add("center");
            div8.textContent = "Notes";
            section2.appendChild(div5);
            section2.appendChild(div6);
            section2.appendChild(div7);
            section2.appendChild(div8);

            roundParticipants.forEach((participant) => {
                let div9 = document.createElement("div");
                div9.classList.add("section");
                div9.classList.add("ct_turn_bookends");
                div9.classList.add("center");
                div9.setAttribute("div-participant", participant.pID);
                let div10 = document.createElement("div");
                div10.classList.add("section");
                div10.classList.add("ct_turn_bookends");
                div10.classList.add("align_left");
                let div11 = document.createElement("div");
                div11.classList.add("section");
                div11.classList.add("ct_turn_bookends");
                div11.classList.add("align_right");
                let div12 = document.createElement("div");
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
            let headerText = document.createElement("h2");
            headerText.textContent =
                i == totalRounds + 1 ? "" : "Round " + (i + 1);
            mainContainer.appendChild(headerText);

            // populate the sections
            let roundActions = ctActions.filter((action) => {
                return action.round == i;
            });

            // populate participants
            let participantHTML;
            roundParticipants.forEach(async (participant) => {
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
                // sort oldest to newest, e.g. hit points cell might read "22, 15, 13" (hp descending as they take hits)
                roundDamages.sort((a, b) => a.tID - b.tID);

                // locate the HTML elements for this participant
                participantHTML = mainContainer.querySelectorAll(
                    '[data-round="' +
                        i +
                        '"] [data-section="1"] [data-participant="' +
                        participant.pID +
                        '"]'
                );

                // populate row in section 1 (ac, hp, character name, and initiative value)
                participantHTML.forEach((turn, index) => {
                    // show AC on the combat tracker for this participant
                    turn.innerText =
                        participant.ac +
                        (participant.ac_secondary == null
                            ? ""
                            : " / " + participant.ac_secondary);

                    // show hit points record for each character
                    let damageObjects = roundDamages.filter((item) => {
                        return item.target_pID == participant.pID;
                    });
                    let hps = "";
                    if (participant.damageArray[i - 1]) {
                        participant.damageArray[i - 1].forEach((hp, index) => {
                            hps +=
                                (hp == participant.starting_hp
                                    ? "<b>" + hp + "</b>"
                                    : hp) +
                                (index <
                                participant.damageArray[i - 1].length - 1
                                    ? ", "
                                    : "");
                        });
                        turn.nextSibling.innerHTML = hps;
                    } else {
                        participant.damageArray[i - 2].forEach((hp, index) => {
                            hps =
                                (hp == participant.starting_hp
                                    ? "<b>" + hp + "</b>"
                                    : hp) +
                                (index <
                                participant.damageArray[i - 2].length - 1
                                    ? ", "
                                    : "");
                        });
                        turn.nextSibling.innerHTML = hps;
                    }

                    // show character name
                    turn.nextSibling.nextSibling.innerText =
                        participant.character_name +
                        (participant.numeric_value == null
                            ? ""
                            : " #" + participant.numeric_value);

                    // if character has a condition/concentration, show icon with tooltip
                    participant.conditionsArray.forEach((condition) => {
                        if (
                            parseInt(condition.concentration) == 1 &&
                            parseInt(condition.start_round) <= i &&
                            parseInt(condition.end_round) >= i
                        ) {
                            let toolTipHTML = document.createElement("span");
                            toolTipHTML.classList.add("tooltip");
                            toolTipHTML.classList.add("concentration");
                            toolTipHTML.innerText = "C";
                            let toolTipText = document.createElement("span");
                            toolTipText.classList.add("tooltiptext");
                            toolTipText.innerText = condition.description;
                            toolTipHTML.appendChild(toolTipText);
                            turn.nextSibling.nextSibling.innerHTML +=
                                toolTipHTML.outerHTML;
                        }
                    });

                    // if participant is affected by a condition, show icon with tooltip
                    participant.affectedArray.forEach((affected) => {
                        const affectedParticipant = ctApp.find(
                            (participant) => participant.pID === affected.pID
                        );
                        const affectedInit = affectedParticipant?.init;
                        if (
                            affected.concentration === 0
                                ? affected.pID !=
                                  parseInt(affected.affected_pID)
                                : affected.concentration === 1 &&
                                  affected.pID !=
                                      parseInt(affected.affected_pID) &&
                                  parseInt(affected.start_round) <= i &&
                                  parseInt(affected.end_round) >= i
                        ) {
                            if (
                                (parseInt(affected.start_round) === i &&
                                    participant.init > affectedInit) ||
                                (parseInt(affected.end_round) === i &&
                                    participant.init < affectedInit)
                            ) {
                                // ...
                            } else {
                                const toolTipHTML =
                                    document.createElement("span");
                                toolTipHTML.className = "tooltip affected";
                                toolTipHTML.innerHTML = `A<span class="tooltiptext">${affected.description}</span>`;
                                turn.nextSibling.nextSibling.appendChild(
                                    toolTipHTML
                                );
                            }
                        }
                    });

                    // show initiative value for this character
                    turn.nextSibling.nextSibling.nextSibling.innerText =
                        participant.init;
                });

                // does the row deserve a yellow or red highlight (e.g. 50% hp or 0 hp)
                participantHTML.forEach(async (turn, index) => {
                    let newValue = turn.nextSibling.innerText.split(",");
                    // if newValue contains comma, get what's to the right of the last comma
                    // const arr = previousHP.nextSibling.innerHTML.split(","); // split the string into an array based on comma delimiter
                    const lastNum = newValue.pop().trim(); // remove and return the last element of the array, and trim any whitespace
                    let x =
                        turn.nextSibling.nextSibling.querySelectorAll(
                            ".affected"
                        );
                    // compare that value to participant.starting_hp
                    if (lastNum <= participant.starting_hp / 2) {
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
                        damageString += (index > 0 ? " / " : "") + item.damage;
                    });
                } catch (err) {}

                let actionArray = [];

                actionArray[0] = tool;
                actionArray[1] =
                    action.hit == 1 ? "<b class='lightred'>X</b>" : "";
                actionArray[2] = targetString;
                actionArray[3] = damageString;
                await sendToCoordinate(
                    action.round,
                    action.pID,
                    action.action_type || action.action,
                    actionArray
                );
            }
        } catch (err) {}

        document.querySelector(".ct_round_container").innerHTML =
            mainContainer.innerHTML;
        resizeSections();

        let startNav = document.querySelector(`[data-nav="${dataNav}"]`);
        try {
            startNav.classList.add("selected");
            startNav.nextSibling.classList.add("selected");
            startNav.nextSibling.nextSibling.classList.add("selected");
            startNav.nextSibling.nextSibling.nextSibling.classList.add(
                "selected"
            );
            navify();
        } catch (err) {}

        function sendToCoordinate(round, participant, actionType, actionArray) {
            let actionHTML = "data-" + actionType;
            let action = 1;
            let x;
            do {
                x = mainContainer.querySelector(
                    `[data-round="${round}"] [${actionHTML}="${action}"] [data-participant="${participant}"]`
                );
                action += 1;
            } while (x.innerHTML !== "");
            x.innerHTML = actionArray[0];
            x.nextSibling.innerHTML = actionArray[1];
            x.nextSibling.nextSibling.innerHTML = actionArray[2];
            x.nextSibling.nextSibling.nextSibling.innerHTML = actionArray[3];
        }

        let xyz = document.querySelectorAll(".ct_round");
        xyz[xyz.length - 1].classList.add("hidden");
        xyz[xyz.length - 1].classList.add("sometimes_hidden");
        xyz[xyz.length - 1].previousSibling.classList.add("hidden");
        xyz[xyz.length - 1].previousSibling.classList.add("sometimes_hidden");

        // fill values for dropdown
        fillDropdown(encounterCode);
    }

    async function modalTurn() {
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
            return (
                participant.join_round <= currentRound &&
                (participant.dead_round >= currentRound ||
                    participant.dead_round == "")
            );
        });
        // conditions in effect (with option to end them)
        let conditionsInEffect = await dbQuery(
            "GET",
            "conditionsInEffect/" + encounter + "/" + currentRound
        );
        // build the HTML
        let container = document.createElement("div");
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

        participantTools.forEach((item) => {
            let tool = document.createElement("input");
            tool.setAttribute("type", "radio");
            tool.setAttribute("value", item.toolID);
            tool.setAttribute("id", item.toolID);
            tool.classList.add("pointer");
            tool.setAttribute("name", "weapons");
            tool.setAttribute("data-concentration", item.concentration);
            let label = document.createElement("label");
            label.setAttribute("for", item.toolID);
            label.classList.add("radio_buttons");
            label.classList.add("pointer");
            label.innerHTML =
                item.toolName +
                (item.damage_dice ? " (" + item.damage_dice + ")" : "");
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
        });

        divLeft.appendChild(div13);

        let weaponTextInput = document.createElement("input");
        weaponTextInput.setAttribute("type", "text");
        weaponTextInput.setAttribute("name", "weaponsText");
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
        let actionsArray = [
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
                    action == "help" ||
                    action == "ready" ||
                    action == "shove"
                    ? 1
                    : 0
            );
            let label = document.createElement("label");
            label.setAttribute("for", action);
            label.classList.add("pointer");
            label.classList.add("radio_buttons");
            label.innerHTML = action;
            let span2;
            if (
                action == "grapple" ||
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
        let actions2 = ["action", "bonus", "reaction", "other"];

        actions2.forEach((action) => {
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
        allParticipants.forEach((participant) => {
            let target = document.createElement("input");
            target.setAttribute("type", "text");
            target.setAttribute("value", "");
            target.classList.add("text_field");
            target.classList.add("numeric");
            target.setAttribute("name", "participants");
            target.setAttribute("id", participant.pID);
            target.setAttribute("autocomplete", "off");
            let targetLabel = document.createElement("label");
            targetLabel.setAttribute("for", participant.pID);
            targetLabel.classList.add("p" + participant.pID);
            targetLabel.classList.add("modal_text_inputs");
            targetLabel.innerHTML =
                participant.character_name +
                (participant.numeric_value
                    ? " #" + participant.numeric_value
                    : "");
            // let span = document.createElement("span");
            // span.classList.add("conSavingThrowCheck");
            // targetLabel.appendChild(span);

            let br3 = document.createElement("br");
            div16.appendChild(target);
            div16.appendChild(targetLabel);

            div16.appendChild(br3);
        });

        divRight.appendChild(div16);

        let notesLabel = document.createElement("h3");
        notesLabel.innerText = "Notes";
        // let br4 = document.createElement("br");
        let notes = document.createElement("textarea");
        notes.setAttribute("rows", "5");
        notes.setAttribute("cols", "30");
        notes.setAttribute("name", "notes");
        notes.classList.add("notes_text");

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

        let condition = conditionsInEffect.forEach((condition) => {
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
                let label = document.createElement("label");

                label.setAttribute("for", "b" + condition.affected_pID);
                label.classList.add("pointer");
                let causer = ctApp.find((participant) => {
                    return condition.pID == participant.pID;
                });
                let causerName = causer.character_name;
                if (
                    condition.pID == causer.pID &&
                    condition.concentration == 1
                ) {
                    causerName =
                        "<span class='concentration'>" + causerName + "</span>";
                }
                let affected = ctApp.find((participant) => {
                    return parseInt(condition.affected_pID) == participant.pID;
                    // return condition.targets_affected.includes(
                    //     participant.pID.toString()
                    // );
                }).character_name;
                let numeric = ctApp.find((participant) => {
                    return parseInt(condition.affected_pID) == participant.pID;
                    // return condition.targets_affected.includes(
                    //     participant.pID.toString()
                    // );
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
                if (condition.concentration == 1) {
                    let concentrationSpan = document.createElement("span");
                    concentrationSpan.textContent = "C";
                    concentrationSpan.classList.add("concentration");
                    let html = divRight.querySelector(".p" + condition.pID);
                    html.innerHTML += concentrationSpan.outerHTML;
                }
            }
        });

        container.appendChild(divModalBottom);

        let buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button_container");
        let submit = document.createElement("button");
        submit.innerText = "SUBMIT";
        submit.setAttribute("onclick", "submitAction()");

        buttonContainer.appendChild(submit);
        container.appendChild(buttonContainer);

        modal.innerHTML = container.outerHTML;
        modal.addEventListener("input", function (e) {
            if (e.target.parentElement.classList.contains("conSaveParent")) {
                let concentrationStuff =
                    e.target.parentNode.querySelectorAll(".concentration");
                concentrationStuff.forEach((participant) => {
                    let z = participant.parentElement;
                    if (participant.parentNode.previousSibling.value != "") {
                        try {
                            let x = z.querySelector(".conSavingThrowCheck");
                            z.removeChild(x);
                        } catch (err) {}
                        let input =
                            participant.parentNode.previousSibling.value;
                        if (input / 2 <= 10) {
                            input = 10;
                        } else {
                            input = Math.floor(input / 2);
                        }
                        let span3 = document.createElement("span");
                        span3.classList.add("conSavingThrowCheck");
                        span3.innerHTML = `DC CON ${input}`;
                        participant.parentNode.appendChild(span3);
                    } else {
                        try {
                            let x = z.querySelector(".conSavingThrowCheck");
                            z.removeChild(x);
                        } catch (err) {}
                    }
                });
            }
        });
    }

    async function submitAction() {
        // get current round
        let html = document.querySelector(".selected");
        let currentRound = html.getAttribute("data-round");
        let pID = html.getAttribute("data-participant");
        let dataNav = html.getAttribute("data-nav");
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

        let weaponsText = document.getElementsByName("weaponsText");
        let concentrationNext = 0;
        let holding = 0;
        let weapons,
            tool = [],
            actionString = "",
            nextToolID = "";
        if (weaponsText[0].value == "") {
            weapons = document.getElementsByName("weapons");
            tool = Array.from(weapons).find((weapon) => {
                return weapon.checked == true;
            }).value;
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
            tool = weaponsText[0].value;
            actionString = weaponsText[0].value;
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
            targetsArray.map(async (target) => {
                if (parseInt(target.value) && target.value != 0) {
                    targetHits.push("1 ");
                    target_pID.push(target.id);
                    damage.push(target.value);
                    let x = await dbQuery("GET", "targetsHP/" + target.id);
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id;
                        }).starting_hp;
                    }
                    targetHPsArray.push(x);
                } else if (target.value == "0") {
                    targetHits.push("0 ");
                    target_pID.push(target.id);
                    damage.push(target.value);
                    let x = await dbQuery("GET", "targetsHP/" + target.id);
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id;
                        }).starting_hp;
                    }
                    targetHPsArray.push(x);
                } else if (target.value == "x") {
                    targetHits.push("1 ");
                    target_pID.push(target.id);
                    damage.push("0");
                    let x = await dbQuery("GET", "targetsHP/" + target.id);
                    if (x.length > 0 && x[0].new_hp != undefined) {
                        x = x[0].new_hp;
                    } else {
                        x = ctApp.find((participant) => {
                            return participant.pID == target.id;
                        }).starting_hp;
                    }
                    targetHPsArray.push(x);
                }
            })
        );

        if (damage == "") {
            damage = "-";
        }
        if (target_pID == [""]) {
            target_pID = ["-"];
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
        notes = notes.replace("'", "&apos;").replace("#", "&num;");
        if (notes == "") {
            notes = "-";
        }

        let disableConditionsEle = document.getElementsByName("conditions");
        let disableConditionsString = "";
        disableConditionsEle.forEach(async (condition) => {
            if (condition.checked == true) {
                await dbQuery(
                    "GET",
                    "disableCondition/" +
                        condition.value +
                        "/" +
                        currentRound +
                        "/" +
                        pID
                );
                disableConditionsString += condition.value;
            }
        });
        if (disableConditionsString == "") {
            disableConditionsString = "-";
        }
        let hit = 0;
        if (
            targetHits.find((item) => {
                return item == 1;
            })?.length >= 1
        ) {
            hit = 1;
        }

        let dataAction = `submitAction/${ctApp[0].eID}/${currentRound}/${tool}/${actionString}/${pID}/${nextTargetID}/${hit}/${actionCategory}/${damage}/${notes}/${disableConditionsString}/${nextAID}/${nextToolID}/${target_pID}`;
        await dbQuery("GET", dataAction);

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

            let dataTarget = `submitTargets/${
                ctApp[0].eID
            }/${round}/${tool}/${actionString}/${pID}/${nextTargetID}/${targetHits[
                index
            ].trim()}/${actionCategory}/${
                damage[index]
            }/${notes}/${disableConditionsString}/${nextAID}/${nextToolID}/${
                target_pID[index]
            }/${targetHPsArray[index]}`;
            await dbQuery("GET", dataTarget);
            // if (targetHPsArray[index] - damage[index] <= 0) {
            //     await dbQuery(
            //         "GET",
            //         "terminate/" + target_pID[index] + "/" + round
            //     );
            //     await dbQuery(
            //         "GET",
            //         "endConditions/" + target_pID[index] + "/" + round
            //     )
            // }
        });

        load_encounter(0, dataNav);
        let modal = document.querySelector(".modal");
        modal.style.display = "none";
        if (concentrationNext == 1 || holding == 1) {
            launchConditionsModal(
                target_pID,
                concentrationNext,
                conditionName,
                holding
            );
        }
    }

    async function modalConditions(
        affected,
        concentration,
        conditionName,
        holding
    ) {
        let modal = document.querySelector("#modal-body");
        let html = document.querySelector(".selected");
        let dataNavSelected = html.getAttribute("data-nav");
        let participantID = html.getAttribute("data-participant");
        // let causerObject = ctApp.find((participant) => {
        //     return participantID == participant.pID
        // })
        // let affecteeObject = ctApp.find((participant) => {
        //     return participant.pID == 
        // })
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
            return (
                participant.join_round <= currentRound &&
                (participant.dead_round >= currentRound ||
                    participant.dead_round == "")
            );
        });
        // conditions in effect (with option to end them)
        let conditionsInEffect = await dbQuery(
            "GET",
            "conditionsInEffect/" + encounter + "/" + currentRound
        );

        // build the HTML
        let container = document.createElement("div");
        container.classList.add("container");

        let topLeftDiv = document.createElement("div");
        topLeftDiv.classList.add("topLeftDiv");

        let h2 = document.createElement("h3");
        h2.innerHTML = "Condition Causer";
        topLeftDiv.appendChild(h2);

        // build the causers radio buttons
        ctApp.forEach((participant) => {
            let checkbox = document.createElement("input");
            checkbox.setAttribute("type", "radio");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("name", "causers");
            checkbox.setAttribute("id", participant.pID);
            if (participantID == participant.pID) {
                checkbox.setAttribute("checked", "true");
            }
            let label = document.createElement("label");
            label.classList.add("pointer");
            label.setAttribute("for", participant.pID);
            label.innerHTML =
                participant.character_name +
                (participant.numeric_value
                    ? " #" + participant.numeric_value
                    : "");
            let br = document.createElement("br");

            topLeftDiv.appendChild(checkbox);
            topLeftDiv.appendChild(label);
            topLeftDiv.appendChild(br);
        });

        let topMiddleDiv = document.createElement("div");
        topMiddleDiv.classList.add("topMiddleDiv");

        let h6 = document.createElement("h3");
        h6.innerHTML = "Condition Affectee(s)";
        topMiddleDiv.appendChild(h6);

        // build the affectees checkboxes
        ctApp.forEach((participant) => {
            let checkbox = document.createElement("input");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("type", "checkbox");
            checkbox.setAttribute("name", "affectees");
            checkbox.setAttribute("id", "a" + participant.pID);
            if (affected.includes(participant.pID.toString())) {
                checkbox.setAttribute("checked", "true");
            }
            let label = document.createElement("label");
            label.classList.add("pointer");
            label.setAttribute("for", "a" + participant.pID);
            label.innerHTML =
                participant.character_name +
                (participant.numeric_value
                    ? " #" + participant.numeric_value
                    : "");
            let br = document.createElement("br");

            topMiddleDiv.appendChild(checkbox);
            topMiddleDiv.appendChild(label);
            topMiddleDiv.appendChild(br);
        });

        let topRightDiv = document.createElement("div");
        topRightDiv.classList.add("topRightDiv");

        let h3 = document.createElement("h3");
        h3.innerHTML = "Whose Round It Ends On:";
        topRightDiv.appendChild(h3);

        // build the radio buttons for whose turn an affect ends on
        ctApp.forEach((participant) => {
            let checkbox = document.createElement("input");
            checkbox.setAttribute("type", "radio");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("name", "condition_ends");
            checkbox.setAttribute("id", "x" + participant.pID);
            if (affected.includes(participant.pID.toString()) && holding == 1) {
                checkbox.setAttribute("checked", "true");
            } else {
                if (participantID == participant.pID) {
                    checkbox.setAttribute("checked", "true");
                }
            }

            let label = document.createElement("label");
            label.classList.add("pointer");
            label.setAttribute("for", "x" + participant.pID);
            label.innerHTML =
                participant.character_name +
                (participant.numeric_value
                    ? " #" + participant.numeric_value
                    : "");
            let br = document.createElement("br");

            topRightDiv.appendChild(checkbox);
            topRightDiv.appendChild(label);
            topRightDiv.appendChild(br);
        });

        container.appendChild(topLeftDiv);
        container.appendChild(topMiddleDiv);
        container.appendChild(topRightDiv);

        let div17 = document.createElement("div");
        div17.classList.add("topLeftDiv");

        let textHeader = document.createElement("h3");
        textHeader.innerHTML = "Describe the Condition";
        let textInput = document.createElement("input");
        textInput.setAttribute("type", "text");
        textInput.classList.add("conditionsText");
        textInput.setAttribute("value", conditionName || "");
        textInput.setAttribute("name", "conditionsText");
        textInput.classList.add("text_field");
        let br7 = document.createElement("br");
        div17.appendChild(textHeader);
        div17.appendChild(textInput);
        div17.appendChild(br7);

        let h7 = document.createElement("h3");
        h7.innerHTML = "Concentration Begins?";
        // let br8 = document.createElement("br");
        let radioButton1 = document.createElement("input");
        radioButton1.setAttribute("type", "radio");
        radioButton1.setAttribute("name", "concentration");
        radioButton1.setAttribute("id", "concentration_yes");
        radioButton1.classList.add("pointer");
        radioButton1.setAttribute("value", 1);
        if (concentration == 1) {
            radioButton1.setAttribute("checked", "true");
        }
        let label2 = document.createElement("label");
        label2.setAttribute("for", "concentration_yes");
        label2.classList.add("pointer");
        label2.innerText = "YES";
        let radioButton2 = document.createElement("input");
        radioButton2.setAttribute("type", "radio");
        radioButton2.setAttribute("name", "concentration");
        radioButton2.setAttribute("id", "concentration_no");
        radioButton2.classList.add("pointer");
        radioButton2.setAttribute("value", 0);
        if (radioButton1.checked == false) {
            radioButton2.setAttribute("checked", "true");
        }
        let label3 = document.createElement("label");
        label3.setAttribute("for", "concentration_no");
        label3.classList.add("pointer");
        label3.innerText = "NO";
        let br9 = document.createElement("br");

        div17.appendChild(h7);
        // div17.appendChild(br8);
        div17.appendChild(radioButton1);
        div17.appendChild(label2);
        div17.appendChild(radioButton2);
        div17.appendChild(label3);
        div17.appendChild(br9);

        let h9 = document.createElement("h3");
        h9.innerHTML = "Holding Begins?";
        // let br10 = document.createElement("br");
        let radioButton3 = document.createElement("input");
        radioButton3.setAttribute("type", "radio");
        radioButton3.setAttribute("name", "holding");
        radioButton3.setAttribute("id", "holding_yes");
        radioButton3.classList.add("pointer");
        radioButton3.setAttribute("value", 1);
        if (holding == 1) {
            radioButton3.setAttribute("checked", "true");
        }
        let label4 = document.createElement("label");
        label4.setAttribute("for", "holding_yes");
        label4.classList.add("pointer");
        label4.innerText = "YES";
        let radioButton4 = document.createElement("input");
        radioButton4.setAttribute("type", "radio");
        radioButton4.setAttribute("name", "holding");
        radioButton4.setAttribute("id", "holding_no");
        radioButton4.classList.add("pointer");
        radioButton4.setAttribute("value", 0);
        if (radioButton3.checked == false) {
            radioButton4.setAttribute("checked", "true");
        }
        let label5 = document.createElement("label");
        label5.setAttribute("for", "holding_no");
        label5.classList.add("pointer");
        label5.innerText = "NO";
        let br11 = document.createElement("br");

        div17.appendChild(h9);
        // div17.appendChild(br10);
        div17.appendChild(radioButton3);
        div17.appendChild(label4);
        div17.appendChild(radioButton4);
        div17.appendChild(label5);
        div17.appendChild(br11);

        let buttonContainer = document.createElement("div");
        buttonContainer.classList.add("button_container");
        let submit = document.createElement("button");
        submit.classList.add("pointer");
        submit.innerText = "SUBMIT";
        submit.setAttribute("onclick", "submitCondition()");

        container.appendChild(div17);

        let bottomMiddleDiv = document.createElement("div");
        bottomMiddleDiv.classList.add("topRightDiv");

        let h4 = document.createElement("h3");
        h4.innerHTML = "Beginning Round";
        let beginRound = document.createElement("select");
        beginRound.classList.add("beginRound");
        beginRound.classList.add("pointer");
        beginRound.setAttribute("name", "beginRound");
        for (let i = 1; i <= 50; i++) {
            let option = document.createElement("option");
            option.setAttribute("value", i);
            option.classList.add("pointer");
            option.innerHTML = i;
            if (currentRound == i) {
                option.setAttribute("selected", "true");
            }
            beginRound.appendChild(option);
        }

        bottomMiddleDiv.appendChild(h4);
        bottomMiddleDiv.appendChild(beginRound);

        let h5 = document.createElement("h3");
        h5.innerHTML = "Ending Round";
        let endRound = document.createElement("select");
        endRound.classList.add("endRound");
        endRound.classList.add("pointer");
        endRound.setAttribute("name", "endRound");

        // determine whose init is higher, causer or affectee
        

        for (let i = 1; i <= 20; i++) {
            let option = document.createElement("option");
            option.setAttribute("value", i);
            option.classList.add("pointer");
            option.innerHTML = i;
            if (currentRound == i - 10 && holding == 0) {
                option.setAttribute("selected", "true");
            } else {
                if (currentRound == i) {
                    option.setAttribute("selected", "true");
                }
            }
            endRound.appendChild(option);
        }

        bottomMiddleDiv.appendChild(h5);
        bottomMiddleDiv.appendChild(endRound);

        let bottomRightDiv = document.createElement("div");
        let h8 = document.createElement("h3");
        h8.innerHTML = "Submit";

        bottomRightDiv.appendChild(h8);
        bottomRightDiv.appendChild(submit);

        container.appendChild(bottomMiddleDiv);
        container.appendChild(bottomRightDiv);
        container.appendChild(buttonContainer);
        // container.appendChild(submit);

        modal.innerHTML = container.outerHTML;
    }

    async function submitCondition() {
        let html = document.querySelector(".selected");
        let currentRound = html.getAttribute("data-round");
        let pID = html.getAttribute("data-participant");
        let dataNav = html.getAttribute("data-nav");
        let causerHTML = document.getElementsByName("causers");
        let affecteesHTML = document.getElementsByName("affectees");
        let conditionEndsHTML = document.getElementsByName("condition_ends");
        let conditionDescription =
            document.querySelector(".conditionsText").value;
        conditionDescription = conditionDescription
            .replace("'", "&apos;")
            .replace("#", "&num;");
        let startRoundHTML = document.querySelector(".beginRound");
        let endRoundHTML = document.querySelector(".endRound");
        let concentrationHTML = document.getElementsByName("concentration");

        let causerPID;
        causerPID = Array.from(causerHTML).find((causer) => {
            return causer.checked == true;
        }).id;
        let concentration;
        concentration = Array.from(concentrationHTML).find(
            (concentrationValue) => {
                return concentrationValue.checked == true;
            }
        ).value;

        let affecteesHTMLArray = [];
        affecteesHTMLArray = Array.from(affecteesHTML).filter((affected) => {
            return affected.checked == true;
        });
        let affecteesPID = [];
        affecteesHTMLArray.forEach((affectee) => {
            affecteesPID.push(affectee.getAttribute("id").substring(1));
        });
        let affecteesString = affecteesPID.join(", ");

        let conditionEndsPID = Array.from(conditionEndsHTML)
            .find((item) => {
                return item.checked == true;
            })
            .id.substring(1);

        let startRound = Array.from(startRoundHTML).find((item) => {
            return item.selected == true;
        }).value;

        let endRound = Array.from(endRoundHTML).find((item) => {
            return item.selected == true;
        }).value;

        // get next cpID
        let latestConditionID = await dbQuery("GET", "getNextcpID");
        let newCpID = parseInt(latestConditionID[0]?.cpID || 0) + 1;

        // send info to tbl_condition_pool
        let dataPool = `newConditionPoolItem/${conditionDescription.substring(
            0,
            15
        )}/${conditionDescription}`;
        await dbQuery("GET", dataPool);

        // determine next available taID in ct_tbl_condition_affectee
        let getNextTAID = await dbQuery("GET", "getNextTAID");
        let taID = getNextTAID.taID + 1;

        // send condition affectee info
        let dataConditionsAffectees = `addConditionAffectees/${taID}/${startRound}/${endRound}/${affecteesString}`;
        await dbQuery("GET", dataConditionsAffectees);

        // send condition info
        let dataConditions = `addCondition/${ctApp[0].eID}/${causerPID}/${taID}/${conditionEndsPID}/${newCpID}/${concentration}`;
        await dbQuery("GET", dataConditions);

        load_encounter(0, dataNav);
        let modal = document.querySelector(".modal");
        modal.style.display = "none";
    }

    async function dbQuery(httpReqType, httpReqString) {
        // arguments should look something like "GET" and "getSomethingFromBackEnd/42/true"
        let dbReturn = makePromise(httpReqType, httpReqString);
        let dbReturnJSON = await dbReturn;
        let unpackdbReturn = JSON.parse(dbReturnJSON);
        return unpackdbReturn;

        function makePromise(httpReqType, httpReqString) {
            httpReqString = httpReqString;
            let request = new Promise((resolve, reject) => {
                let xhr = new XMLHttpRequest();
                xhr.open(httpReqType, "../" + httpReqString, true);
                xhr.onload = () => {
                    const text = xhr.responseText;
                    resolve(text);
                };
                xhr.onerror = () => resolve("Request Failed");
                xhr.send();
            });
            return request;
        }
    }

    function findLargestSubarray(arr) {
        let largestSubarray = arr[0];
        let largestLength = arr[0]?.length;
        for (let i = 1; i < arr?.length; i++) {
            if (arr[i].length > largestLength) {
                largestSubarray = arr[i];
                largestLength = arr[i].length;
            }
        }
        return largestLength;
    }

    function buildASection(
        actionType,
        ctRound,
        numberActions,
        roundParticipants
    ) {
        let round = ctRound;
        for (let j = 1; j <= numberActions; j++) {
            let section2 = document.createElement("div");

            section2.classList.add("ct_grid4columns");
            section2.setAttribute("data-" + actionType, j);

            let div5 = document.createElement("div");
            div5.classList.add("section");
            div5.classList.add("header");
            div5.classList.add(
                actionType +
                    (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
            );
            div5.classList.add("center");
            div5.textContent =
                actionType.charAt(0).toUpperCase() +
                actionType.substring(1) +
                (numberActions > 1 ? " #" + j : "");
            let div6 = document.createElement("div");
            div6.classList.add("section");
            div6.classList.add("header");
            div6.classList.add(
                actionType +
                    (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
            );
            div6.classList.add("center");
            div6.textContent = "Hit?";
            let div7 = document.createElement("div");
            div7.classList.add("section");
            div7.classList.add("header");
            div7.classList.add(
                actionType +
                    (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
            );
            div7.classList.add("center");
            div7.textContent = "Target(s)";
            let div8 = document.createElement("div");
            div8.classList.add("section");
            div8.classList.add("header");
            div8.classList.add(
                actionType +
                    (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
            );
            div8.classList.add("center");
            div8.textContent = "hp";
            section2.appendChild(div5);
            section2.appendChild(div6);
            section2.appendChild(div7);
            section2.appendChild(div8);
            roundParticipants.forEach((participant) => {
                let div9 = document.createElement("div");
                div9.classList.add("section");
                div9.classList.add(
                    actionType +
                        (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
                );
                div9.classList.add("center");
                div9.setAttribute("data-participant", participant.pID);
                let div10 = document.createElement("div");
                div10.classList.add("section");
                div10.classList.add(
                    actionType +
                        (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
                );
                div10.classList.add("center");
                let div11 = document.createElement("div");
                div11.classList.add("section");
                div11.classList.add(
                    actionType +
                        (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
                );
                div11.classList.add("center");
                let div12 = document.createElement("div");
                div12.classList.add("section");
                div12.classList.add(
                    actionType +
                        (actionType == "attack" && j % 2 == 0 ? "_alt" : "")
                );
                div12.classList.add("center");
                section2.appendChild(div9);
                section2.appendChild(div10);
                section2.appendChild(div11);
                section2.appendChild(div12);
                round.appendChild(section2);
            });
        }
        return round;
    }

    async function fillDropdown(encounterID) {
        let encounters = await dbQuery("GET", "encounters");
        let html = document.querySelector(".indexDrpDwn");
        let container = document.createElement("div");

        encounters.forEach((encounter, index) => {
            let option = document.createElement("option");
            option.setAttribute("value", encounter.eID);
            option.innerText =
                "(" +
                encounter.eID +
                ") " +
                encounter.campaign +
                ": " +
                encounter.location +
                " (" +
                encounter.description +
                ")";
            if (encounterID == encounter.eID) {
                option.setAttribute("selected", "true");
            } else if (encounterID == 0 && index == encounters.length - 1) {
                option.setAttribute("selected", "true");
            }
            html.appendChild(option);
        });
    }

    function resizeSections() {
        let variety = [
            "section='1'",
            "attack",
            "bonus",
            "react",
            "section='2'",
        ];
        variety.forEach((item) => {
            let grab = document.querySelectorAll(`[data-round] [data-${item}]`);
            let maxWidth = 0;
            grab.forEach((round) => {
                maxWidth =
                    maxWidth > round.clientWidth ? maxWidth : round.clientWidth;
            });
            grab.forEach((round) => {
                round.style.width = maxWidth + "px";
            });
        });
    }

    function navify() {
        document.addEventListener("keydown", keydownEventListener);
        document.addEventListener("click", clickEventListener);

        document.addEventListener("click", function (event) {
            if (event.target.getAttribute("data-nav")) {
                let myElement = document.querySelectorAll(".selected");
                let nav = myElement[0].getAttribute("data-nav");
                let targetNum = Number(nav) + 1;
                let newTarget;
                if (nav < cellCountVertical - 1) {
                    myElement.forEach((ele) => {
                        ele.classList.remove("selected");
                    });
                    newTarget = document.querySelector(
                        '[data-nav="' + targetNum + '"]'
                    );
                    event.target.classList.add("selected");
                    event.target.nextSibling.classList.add("selected");
                    event.target.nextSibling.nextSibling.classList.add(
                        "selected"
                    );
                    event.target.nextSibling.nextSibling.nextSibling.classList.add(
                        "selected"
                    );
                }
            }
        });
    }

    function new_encounter(encounterID) {
        let modalContainer = document.createElement("div");
        modalContainer.innerHTML;

        let innerContainer = document.createElement("div");
        innerContainer.classList.add("modalContainer");

        let participantsHeader = document.createElement("h2");
        participantsHeader.innerText = "Participants";
        // choose participants

        // assign initiative

        // app.js:
        // insert encounter into db with encounterID
        // insert participants with encounterID and initiative

        let x = document.getElementById("modal-body");
        x.innerHTML = modalContainer.outerHTML;
        launchActionModal();
    }

    function launchActionModal(event) {
        modalTurn();
        let modal = document.querySelector(".modal");
        let closeModal = document.querySelector(".close-modal");
        modal.style.display = "block";
        closeModalBox(closeModal);
    }

    function closeModalBox(closeModal) {
        closeModal.addEventListener("click", function (e) {
            modal.style.display = "none";
        });
        window.addEventListener("click", function (e) {
            if (e.target == modal) {
                modal.style.display = "none";
            }
        });
    }

    const keydownEventListener = function (event) {
        if (event.key === "ArrowDown") {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) + 1;
            let newTarget;
            if (nav < cellCountVertical - 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector(
                    '[data-nav="' + targetNum + '"]'
                );
                newTarget.classList.add("selected");
                newTarget.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.nextSibling.classList.add(
                    "selected"
                );
                if (newTarget.classList.contains("selected")) {
                    if (
                        newTarget.parentElement.parentElement.classList.contains(
                            "sometimes_hidden"
                        ) &&
                        newTarget.classList.contains("selected")
                    ) {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.remove("hidden");
                        });
                    } else {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.add("hidden");
                        });
                    }
                }
                // newTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start'})
                newTarget.scrollIntoViewIfNeeded(true);
            }
        }
        if (event.key === "ArrowUp") {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) - 1;
            let newTarget;
            if (nav != 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector(
                    '[data-nav="' + targetNum + '"]'
                );
                newTarget.classList.add("selected");
                newTarget.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.nextSibling.classList.add(
                    "selected"
                );
                if (newTarget.classList.contains("selected")) {
                    if (
                        newTarget.parentElement.parentElement.classList.contains(
                            "sometimes_hidden"
                        ) &&
                        newTarget.classList.contains("selected")
                    ) {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.remove("hidden");
                        });
                    } else {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.add("hidden");
                        });
                    }
                }
                // newTarget.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'start'})
                newTarget.scrollIntoViewIfNeeded(true);
            }
        }
        if (event.altKey && event.key == "Enter") {
            launchActionModal("turn");
        }
        if (event.altKey && event.keyCode == 81) {
            launchConditionsModal("turn");
        }
        if (event.altKey && event.keyCode == 67) {
            alert("HUZZAH!");
        }
    };

    function launchConditionsModal(
        affected,
        concentration,
        conditionName,
        holding
    ) {
        if (affected == "turn") {
            concentration == 0;
        }
        modalConditions(affected, concentration, conditionName, holding);
        let modal = document.querySelector(".modal");
        let closeModal = document.querySelector(".close-modal");
        modal.style.display = "block";
        closeModalBox(closeModal);
    }

    const clickEventListener = function (event) {
        if (event.target.getAttribute("data-nav")) {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) + 1;
            let newTarget;
            if (nav < cellCountVertical - 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector(
                    '[data-nav="' + targetNum + '"]'
                );
                event.target.classList.add("selected");
                event.target.nextSibling.classList.add("selected");
                event.target.nextSibling.nextSibling.classList.add("selected");
                event.target.nextSibling.nextSibling.nextSibling.classList.add(
                    "selected"
                );
            }
        }
    };


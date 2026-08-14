let cellCountVertical, participantsHpsByRound;
const g = "got here"
async function dbQuery(httpReqType, httpReqString) {
    // arguments should look something like "GET" and "getSomethingFromBackEnd/42/true"
    let dbReturn = makePromise(httpReqType, httpReqString);
    let response = await dbReturn;
    // A request that fails comes back as an error page, or as the words "Request
    // Failed", and used to die here in JSON.parse. That took whatever was halfway
    // through down with it: submitAction stopped before it could put the modal
    // away, so a submit that had already ended conditions in the database looked
    // like nothing at all had happened. Say what broke instead of failing mute.
    if (!response.ok) {
        const message =
            "Something went wrong talking to the database" +
            (response.status ? " (" + response.status + ")" : "") +
            ", and this did not go through:\n\n" +
            httpReqString;
        alert(message);
        throw new Error(message);
    }
    return JSON.parse(response.body);
    function makePromise(httpReqType, httpReqString) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open(httpReqType, `../${httpReqString}`, true);
            // onload fires for 404 and 500 as well as for success, so the status
            // is what says whether the body is any use.
            xhr.onload = () =>
                resolve({
                    ok: xhr.status >= 200 && xhr.status < 300 && isJSON(xhr.responseText),
                    status: xhr.status,
                    body: xhr.responseText,
                });
            xhr.onerror = () => resolve({ ok: false, status: 0, body: "" });
            xhr.send();
        });
    }
    function isJSON(text) {
        try {
            JSON.parse(text);
            return true;
        } catch (err) {
            return false;
        }
    }
}

// Text typed into a modal - notes, a free-text action - travels to the server as
// one path segment of a GET URL and is written straight into a single-quoted SQL
// string, so anything that would end the segment or the string has to leave as an
// HTML entity. The page draws notes as HTML, so they read back as what was typed.
//
// Every occurrence, not just the first. "Drow #1 and #2" used to keep its second
// "#", which cut the URL off at the fragment and left the route unmatched, and the
// 404 that came back aborted the submit where it stood.
//
// "&" is deliberately not on the list: the entities below, and the ones the
// condition sentences are built out of, are written with real ampersands.
const REQUEST_TEXT_ENTITIES = [
    ["'", "&apos;"],   // ends the SQL string
    ["#", "&num;"],    // starts the URL fragment, so the rest is never sent
    ["?", "&quest;"],  // starts the query string, same again
    ["/", "&sol;"],    // an extra path segment: the route no longer matches
    ["\\", "&bsol;"],  // which the browser reads as "/" in a URL
    ["%", "&percnt;"], // starts a percent-escape the server then cannot decode
];

function escapeTextForRequest(text) {
    return REQUEST_TEXT_ENTITIES.reduce(
        (escaped, [character, entity]) => escaped.replaceAll(character, entity),
        String(text ?? "")
    );
}

// The other way round, for putting stored text back in a field to be edited.
function unescapeTextForEditing(text) {
    return REQUEST_TEXT_ENTITIES.reduce(
        (plain, [character, entity]) => plain.replaceAll(entity, character),
        String(text ?? "")
    );
}
async function dbQueryPost(httpReqString, requestData) {
    try {
        const response = await fetch(`../${httpReqString}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData),
        });
        if (response.ok) {
            const responseData = await response.json();
            return responseData;
        }
        else {
            throw new Error('Request Failed');
        }
    }
    catch (error) {
        console.error('Error:', error);
        throw error; // Rethrow the error for handling in the caller
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
function buildASection(actionType, ctRound, numberActions, ctApp) {
    let round = ctRound;
    for (let j = 1; j <= numberActions; j++) {
        let section2 = document.createElement("div");
        section2.classList.add("ct_grid4columns");
        section2.setAttribute("data-" + actionType, j);
        let div5 = document.createElement("div");
        div5.classList.add("section");
        div5.classList.add("header");
        div5.classList.add(actionType + (actionType == "attack" && j % 2 == 0 ? "_alt" : ""));
        div5.classList.add("center");
        div5.textContent =
            actionType.charAt(0).toUpperCase() +
            actionType.substring(1) +
            (numberActions > 1 ? " #" + j : "");
        let div6 = document.createElement("div");
        div6.classList.add("section");
        div6.classList.add("header");
        div6.classList.add(actionType + (actionType == "attack" && j % 2 == 0 ? "_alt" : ""));
        div6.classList.add("center");
        div6.textContent = "Hit?";
        let div7 = document.createElement("div");
        div7.classList.add("section");
        div7.classList.add("header");
        div7.classList.add(actionType + (actionType == "attack" && j % 2 == 0 ? "_alt" : ""));
        div7.classList.add("center");
        div7.textContent = "Target(s)";
        let div8 = document.createElement("div");
        div8.classList.add("section");
        div8.classList.add("header");
        div8.classList.add(actionType + (actionType == "attack" && j % 2 == 0 ? "_alt" : ""));
        div8.classList.add("center");
        div8.textContent = "hp";
        section2.appendChild(div5);
        section2.appendChild(div6);
        section2.appendChild(div7);
        section2.appendChild(div8);
        ctApp.forEach((participant) => {
            let div9 = document.createElement("div");
            div9.classList.add("section");
            div9.classList.add(actionType + (actionType == "attack" && j % 2 == 0 ? "_alt" : ""));
            div9.classList.add("center");
            div9.setAttribute("data-participant", participant.pID);
            let div10 = document.createElement("div");
            div10.classList.add("section");
            div10.classList.add(actionType + (actionType === "attack" && j % 2 === 0 ? "_alt" : ""));
            div10.classList.add("center");
            let div11 = document.createElement("div");
            div11.classList.add("section");
            div11.classList.add(actionType + (actionType === "attack" && j % 2 === 0 ? "_alt" : ""));
            div11.classList.add("center");
            let div12 = document.createElement("div");
            div12.classList.add("section");
            div12.classList.add(actionType + (actionType === "attack" && j % 2 === 0 ? "_alt" : ""));
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
async function fillEncounterDropdown() {
    const encounterList = await dbQuery("GET", "availableEncounters");
    let select = document.querySelector(".encounterDropdown");
    select.innerHTML = "";
    encounterList.forEach((enc) => {
        const option = document.createElement("option");
        option.setAttribute("value", enc.eID);
        option.innerText = `(${enc.eID}) ${enc.campaign} - ${enc.location} - ${enc.description}`;
        option.removeAttribute("selected");
        if (enc.eID == ctAppEnc) {
            option.setAttribute("selected", "selected");
        }
        // else {
        //     option.removeAttribute("selected")
        // }
        select.appendChild(option);
    });
}
async function fillInitDropdown() {
    // get an array of unique participant names where pc = 0
    // grouped on the base name, so "Goblin #1".."#5" are one "Goblin" entry
    let names = [];
    ctApp.forEach((participant) => {
        if (participant.pc === 0) {
            names.push(participant.base_character_name || baseCharacterName(participant.character_name));
        }
    });
    let uniqueCombatantNames = [...new Set(names)];
    let select = document.querySelector(".initDropdown");
    select.innerHTML = "";
    // let container = document.createElement("div");
    let option = document.createElement("option");
    option.setAttribute("value", "Party");
    option.setAttribute("selected", "selected");
    option.innerText = "Party";
    select.appendChild(option);
    uniqueCombatantNames.forEach((combatant, index) => {
        let option2 = document.createElement("option");
        option2.setAttribute("value", combatant);
        option2.innerText = combatant;
        select.appendChild(option2);
    });
    // div.appendChild(select);
    // select.appendChild(div);
}
function init_modal() {
    let initDropdown = document.querySelector(".initDropdown");
    let selectedOptionText;
    for (let i = 0; i < initDropdown.options.length; i++) {
        if (initDropdown.options[i].selected) {
            selectedOptionText = initDropdown.options[i].text;
            break; // Exit the loop when the selected option is found
        }
    }
    modalInit();
    pushModal();
    modalIsOpen = true;
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
    document.addEventListener("click", async function (event) {
        if (event.target.getAttribute("data-nav")) {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) + 1;
            let newTarget;
            if (nav < cellCountVertical - 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector('[data-nav="' + targetNum + '"]');
                event.target.classList.add("selected");
                event.target.nextSibling.classList.add("selected");
                event.target.nextSibling.nextSibling.classList.add("selected");
                event.target.nextSibling.nextSibling.nextSibling.classList.add("selected");
            }
            // }
        }
    });
    // Get a reference to the initiative dropdown element
    let dropdown = document.querySelector(".initDropdown");
    // Add an event listener to the initiative dropdown to detect changes
    dropdown.addEventListener("change", function () {
        // Loop through the options to find the selected one
        let options = dropdown.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                // Remove the selected attribute from all options
                for (let j = 0; j < options.length; j++) {
                    options[j].removeAttribute("selected");
                }
                // Add the selected attribute to the currently selected option
                options[i].setAttribute("selected", "selected");
                break; // Exit the loop when the selected option is found
            }
        }
    });
}
function launchActionModal(event) {
    modalActions();
    pushModal();
}
function closeModalBox(closeModal) {
    closeModal.addEventListener("click", function (e) {
        modal.style.display = "none";
        // the same lie the other way round: left set, the flag says a modal is up
        // after the X has put it away, and Enter goes on submitting to it
        modalIsOpen = false;
    });
    window.addEventListener("click", function (e) {
        if (e.target == modal) {
            modal.style.display = "none";
            modalIsOpen = false;
        }
    });
    modalIsOpen = false;
}
const keydownEventListener = async function (event) {
    const modal = document.querySelector(".modal");
    if (!modalIsOpen) {
        blurAllElements();
    }
    if (event.key === "Tab" && !modalIsOpen) {
        event.preventDefault();
    }
    if (event.key === "ArrowUp" || event.shiftKey && event.key === "Tab") {
        if (modal?.style?.display == "none" || modal.style.display == "") {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) - 1;
            let newTarget;
            if (nav != 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector('[data-nav="' + targetNum + '"]');
                const selectedRound = document.querySelector(".selected_button");
                if (selectedRound) {
                    displayRound(newTarget.getAttribute("data-round"));
                }
                newTarget.classList.add("selected");
                newTarget.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.nextSibling.classList.add("selected");
                if (newTarget.classList.contains("selected")) {
                    if (newTarget.parentElement.parentElement.classList.contains("sometimes_hidden") &&
                        newTarget.classList.contains("selected")) {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.remove("hidden");
                        });
                    }
                    else {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.add("hidden");
                        });
                    }
                }
                newTarget.scrollIntoViewIfNeeded(true);
            }
        }
    }
    else if (event.key === "ArrowDown" || event.key === "Tab") {
        if (modal?.style?.display == "none" || modal.style.display == "") {
            let myElement = document.querySelectorAll(".selected");
            let nav = myElement[0].getAttribute("data-nav");
            let targetNum = Number(nav) + 1;
            let newTarget;
            if (nav < cellCountVertical - 1) {
                myElement.forEach((ele) => {
                    ele.classList.remove("selected");
                });
                newTarget = document.querySelector('[data-nav="' + targetNum + '"]');
                const selectedRound = document.querySelector(".selected_button");
                if (selectedRound) {
                    displayRound(newTarget.getAttribute("data-round"));
                }
                newTarget.classList.add("selected");
                newTarget.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.classList.add("selected");
                newTarget.nextSibling.nextSibling.nextSibling.classList.add("selected");
                if (newTarget.classList.contains("selected")) {
                    if (newTarget.parentElement.parentElement.classList.contains("sometimes_hidden") &&
                        newTarget.classList.contains("selected")) {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.remove("hidden");
                        });
                    }
                    else {
                        let p = document.querySelectorAll(".sometimes_hidden");
                        p.forEach((element) => {
                            element.classList.add("hidden");
                        });
                    }
                }
                newTarget.scrollIntoViewIfNeeded(true);
            }
        }
    }
    else if (event.altKey && event.keyCode == 81) {
        launchConditionsModal("turn");
    }
    else if (event.altKey && event.keyCode == 67) {
        alert("HUZZAH!");
    }
};

function launchConditionsModal(affected, concentration, conditionName, holding, holdingOneRound, nextAID, updateCondition, currentAID, pID, round) {
    if (affected == "turn") {
        concentration = 0;
    }
    modalConditions(affected, concentration, conditionName, holding, holdingOneRound, nextAID, updateCondition, currentAID, pID, round);
    pushModal();
}

function pushModal() {
    let modal = document.querySelector(".modal");
    let closeModalButtons = document.querySelectorAll(".close-modal");
    modal.style.display = "block";
    // Add the event listener or perform actions for each close button
    closeModalButtons.forEach((closeModal) => {
        closeModalBox(closeModal);
    });
}

function closeModal() {
    let modal = document.querySelector(".modal");
    let closeModalButtons = document.querySelectorAll(".close-modal");
    modal.style.display = "none";
    modalIsOpen = false;
}

// A participant's armour class. Empty for a participant with no AC at all rather
// than the word "null".
function armourClass(participant) {
    const ac = participant?.ac;
    return ac == null || ac === "" ? "" : String(ac);
}

// That AC as the element the action modals put beside a target, or null for a
// participant with no AC recorded.
function targetAcMarkup(participant) {
    const ac = armourClass(participant);
    if (!ac) {
        return null;
    }
    const acLabel = document.createElement("span");
    acLabel.classList.add("target-ac");
    acLabel.textContent = "AC " + ac;
    return acLabel;
}

// Whether the modal is actually on screen. modalIsOpen is only a flag, and it has
// to be told; when it says "closed" while the modal is still up,
// keydownEventListener blurs whatever is focused on every keystroke, so the fields
// can be clicked into but not typed in. The same "none or unset means closed" test
// that keydownEventListener uses.
function modalIsDisplayed() {
    const modal = document.querySelector(".modal");
    const display = modal?.style?.display;
    return !!modal && display !== "none" && display !== "";
}

const clickEventListener = async function (event) {
    if (event.target.getAttribute("data-nav")) {
        let myElement = document.querySelectorAll(".selected");
        let nav = myElement[0].getAttribute("data-nav");
        let targetNum = Number(nav) + 1;
        let newTarget;
        if (nav < cellCountVertical - 1) {
            myElement.forEach((ele) => {
                ele.classList.remove("selected");
            });
            newTarget = document.querySelector('[data-nav="' + targetNum + '"]');
            event.target.classList.add("selected");
            event.target.nextSibling.classList.add("selected");
            event.target.nextSibling.nextSibling.classList.add("selected");
            event.target.nextSibling.nextSibling.nextSibling.classList.add("selected");
        }
        // }
    }
};

async function deleteNote(dataAidValue) {
    const data = {
        aID: dataAidValue
    };
    
    const action = ctActions.find((obj) => {
        return obj.aID = dataAidValue
    })

    console.log(action);

    if (!action.targetID && action.action_type == "other") {
        await dbQueryPost("deleteAction", data)
    } else {
        console.log(g)
        console.log(g)
        console.log(g)
        await dbQueryPost("deleteNote", data)
            .then((data) => {
            })
            .catch((error) => {
            });
    }
    // console.log(action);
    // if action type is Other and there are no targets, then delete the Action
    // else delete the Note

    refresh_encounter();
}

async function deleteParticipant(pID) {
    const data = {
        pID: pID,
        eID: ctAppEnc
    };
    await dbQueryPost("deleteParticipant", data)
        .then((data) => {
        })
        .catch((error) => {
        });
    refresh_encounter();
}
// async function deleteAction(dataAidValue) {
//     const update = {
//         ct_tbl_action: {
//             update: {
//             }
//         },
//         ct_tbl_target: {
//             insert: [],
//             update: [],
//             delete: []
//         },
//         ct_tbl_condition: {
//             delete: {
//             }
//         },
//         ct_tbl_condition_affectee: {
//             delete: {
//             }
//         },
//         // tbl_tool: {
//         //     insert: {
//         //     },
//         //     delete: {
//         //     }
//         // }
//     }
//     const ctAppCopy = await deepCopy(ctApp);
//     const data = {
//         aID: dataAidValue
//     }
//     const deleteEm = await dbQuery("GET", "getDeleteActionData/" + dataAidValue)
//     deleteEm.forEach((obj) => {
//         obj.aID = dataAidValue
//     })
//     const deleteData = {
//         aID: dataAidValue,
//         targetID: deleteEm[0].targetID,
//         taID: deleteEm[0].taID,
//         conditionID: deleteEm[0].conditionID
//     }
//     await dbQueryPost("deleteAction", deleteData)
//         .then((data) => {
//         })
//         .catch((error) => {
//         });
//     let updateData = {};
//     let uniqueObjectsSet = new Set();
//     deleteEm.forEach((obj, index) => {
//         const object = {
//             tID: obj.tID,
//             damage: obj.damage,
//             target_pID: obj.target_pID
//         };
//         // Create a string representation of the object for easy comparison
//         const objectString = JSON.stringify(object);
//         // Check if the object is unique before adding it to updateData
//         if (!uniqueObjectsSet.has(objectString)) {
//             uniqueObjectsSet.add(objectString);
//             updateData[index] = { object };
//         }
//     });
//     // figure out any changes in damage
//     let downstreamArray = [];
//     for (target of deleteEm) {
//         // are there any affected records downstream?
//         ctApp.forEach(character => {
//             // Check if the character's pID matches the given value
//             if (character.pID == target.target_pID) {
//                 // Iterate through each array in the damageArray
//                 character.damageArrayNotMapped.forEach(damageArray => {
//                     // Filter the damageArray based on the condition that aID is greater than the given threshold
//                     const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID >= dataAidValue);
//                     // Append the filtered items to the result array
//                     downstreamArray = downstreamArray.concat(filteredDamageItems);
//                 });
//             }
//         });
//         let dataArray = await getDamageArrayFromCtApp(Number(target.target_pID));
//         dataArray[0] = dataArray[0].filter(item => item.aID != target.aID);
//         let bufferHP = 0;
//         // if (dataArray) {
//         // Assuming you want to check for the previous newHP of a specific action ID, say 186 as an example
//         bufferHP = await getPreviousNewHP(dataArray, dataAidValue);
//         // }
//         // bufferHP -= target.damage
//         if (bufferHP < 0) {
//             bufferHP = 0
//         }
//         // Call the async function with bufferHP as argument
//         await processDownstreamArray(bufferHP, downstreamArray, 1);
//         for (const item of ctAppCopy) {
//             if (item.pID === target.target_pID) {
//                 const notMapped = item.damageArrayNotMapped[target.round - 1];
//                 if (Array.isArray(notMapped)) {
//                     const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
//                         const isDuplicated = notMapped.some(notMappedObj => {
//                             // Explicitly convert and compare if necessary
//                             const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
//                                 Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
//                                 Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
//                                 Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
//                                 Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
//                             return isEqual;
//                         });
//                         return !isDuplicated;
//                     });
//                     uniqueInDownstream.forEach((item, index) => {
//                         // if (index != 0) {
//                         update.ct_tbl_target.update.push(item);
//                         // }
//                     })
//                 }
//             }
//         }
//         let uniqueArray = downstreamArray.filter((item, index, self) => {
//             index == self.findIndex((t) => {
//                 t.aID == item.aID && t.targetID == item.targetID
//             })
//         })
//         downstreamArray = uniqueArray;
//     }
//     await dbQueryPost("updateActionDB", update)
//     let html = document.querySelector(".selected");
//     let dataNav = html.getAttribute("data-nav");
//     load_encounter(ctAppEnc, dataNav);
//     async function getDamageArrayFromCtApp(targetPID) {
//         for (const item of ctApp) {
//             if (item.pID === targetPID) {
//                 return item.damageArrayNotMapped;
//             }
//         }
//         return null;  // This confirms that no item matched the targetPID
//     }
//     async function getPreviousNewHP(dataArray, targetAID) {
//         let prevNewHP = null;  // Default to null if no previous object or not found
//         // Assuming dataArray is correctly formatted and it's a double array as observed
//         if (dataArray && dataArray[0]) {
//             let bestIndex = -1; // Initialize the best index to an invalid value
//             // Iterate through the array
//             for (let i = 0; i < dataArray[0].length; i++) {
//                 // Check if current aID is less than targetAID and higher than any previously found aID that also was less than targetAID
//                 if (dataArray[0][i].aID < targetAID && (bestIndex === -1 || dataArray[0][i].aID > dataArray[0][bestIndex].aID)) {
//                     bestIndex = i; // Update the best index to current index
//                 }
//             }
//             // After finding the highest aID less than targetAID, return its newHP
//             if (bestIndex !== -1) {
//                 return dataArray[0][bestIndex].newHP; // Return the newHP of the best matched element
//             } else {
//                 // If no such element exists, log a warning and return null
//                 console.warn("No entry exists with aID less than the targetAID.");
//                 return null; // No matching element was found
//             }
//         }
//         return prevNewHP;
//     }
// }
function add_participants_modal() {
    modalParticipants();
    pushModal();
}
async function change_encounter() {
    // Get the select element
    const selectElement = document.querySelector(".encounterDropdown");
    // Get the selected option
    var selectedOption = selectElement.options[selectElement.selectedIndex];
    ctAppEnc = selectedOption.value;
    const data = {
        id: ctAppEnc
    };
    await dbQueryPost("saveEncounterID", data);
    refresh_encounter();
}
async function refresh_encounter() {
    // Numbers are no longer reassigned on refresh. This used to blank one
    // participant's numeric_value each time, which paired with the renumbering in
    // load_encounter; without that renumbering it would just lose the number.
    let html = document?.querySelector(".selected");
    let dataNav = html?.getAttribute("data-nav") || 1;
    await load_encounter(ctAppEnc, dataNav);
    load_encounter(ctAppEnc, dataNav);
}
function blurAllElements() {
    // Get all focusable elements
    const focusableElements = document.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    // Blur each focusable element
    focusableElements.forEach(element => {
        element.blur();
    });
}
// Clicking on target's name toggles X in the text input
const modalClickListener = function (event) {
    if (event.target.classList.contains("modal_text_inputs")) {
        if (event.target.previousSibling.value === "") {
            event.target.previousSibling.value = "x";
        }
        else if (event.target.previousSibling.value === "x") {
            event.target.previousSibling.value = "";
        }
    }
};
// The free-text weapon/action field and the weapon radios are two ways of saying
// the same thing, and one radio is always checked, so without this the typed text
// could never win. Typing clears the radios; picking a radio clears the text.
// Whichever the user touched last is the one submitAction/submitUpdateAction sees.
function wireActionTextInput(modal) {
    const textInput = modal.querySelector('input[name="weaponTextInput"]');
    if (!textInput) {
        return;
    }
    const radios = modal.querySelectorAll('input[name="weapons"]');
    textInput.addEventListener("input", function () {
        if (textInput.value === "") {
            return;
        }
        radios.forEach((radio) => {
            radio.checked = false;
        });
    });
    radios.forEach((radio) => {
        // "click" as well as "change", so that clicking NONE clears text carried
        // over from the action being edited even though NONE was already checked.
        ["click", "change"].forEach((eventName) => {
            radio.addEventListener(eventName, function () {
                textInput.value = "";
            });
        });
    });
}

async function endCondition() {
    const htmlSelected = document.querySelector(".selected");
    const selectedID = htmlSelected.getAttribute("data-participant");
    const endThisCondition = document.querySelector("[data-cm-condition-id]");
    const conditionID = endThisCondition.getAttribute("data-cm-condition-id");
    let affecteeID = endThisCondition.getAttribute("data-cm-affected-id");
    const round = endThisCondition.getAttribute("data-cm-round");
    const taid = endThisCondition.getAttribute("data-cm-taid");
    const conditionState = endThisCondition.getAttribute("data-cm-concentration-or-affected");
    if (conditionState == "concentration") {
        affecteeID = htmlSelected.getAttribute("data-cm-causer-id");
    }
    await dbQuery("GET", "endCondition/" +
        conditionID +
        "/" +
        affecteeID +
        "/" +
        round +
        "/" +
        conditionState +
        "/" +
        taid);
    refresh_encounter();
}
async function deleteCondition(data) {
    await dbQueryPost("deleteCondition", data);
    refresh_encounter();
}
async function editCondition() {
    // await dbQueryPost("deleteCondition", data)
    refresh_encounter();
}
// handleNumericValues used to run on every load and rewrite each duplicate-named
// participant's numeric_value by initiative position, so "Goblin #1" was whichever
// goblin currently rolled highest. A creature's number is now a fixed identity
// assigned when it joins the encounter, so nothing renumbers by initiative.
// See participantNames.js.
function displayRound(roundValue) {
    // collect the data-round values
    // Select all divs with the data-round attribute that are direct children of .ct_round_container elements
    // Selects direct child divs and h2s with the data-round attribute within .ct_round_container elements
    const roundElements = document.querySelectorAll('.ct_round_container > div[data-round], .ct_round_container > h2[data-round], .round_header_text');
    const roundButtons = document.querySelectorAll('.round-button');
    roundElements.forEach((ele) => {
        let dataRound = ele.getAttribute("data-round");
        if (roundValue != dataRound) {
            ele.classList.add("dont_show");
        }
        else {
            ele.classList.remove("dont_show");
        }
        if (!roundValue) {
            ele.classList.remove("dont_show");
        }
    });
    roundButtons.forEach((button) => {
        if (roundValue == button.innerText) {
            button.classList.add("selected_button");
        }
        else {
            button.classList.remove("selected_button");
        }
    });
}
function scrollUp() {
    const scrollableDiv = document.querySelector(".modal");
    scrollableDiv.scrollTop = 150;
}
function deepCopy(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (obj instanceof Array) {
        let copy = [];
        for (let i = 0; i < obj.length; i++) {
            copy[i] = deepCopy(obj[i]);
        }
        return copy;
    }
    if (obj instanceof Object) {
        let copy = {};
        for (let key in obj) {
            if (obj.hasOwnProperty(key)) {
                copy[key] = deepCopy(obj[key]);
            }
        }
        return copy;
    }
    throw new Error("Unable to copy object! Its type isn't supported.");
}
async function processDownstreamArray(bufferHP, downstreamArray, startIndex = 0) {
    let conditionMet = false;
    let indexToRemove = -1;
    for (let index = startIndex; index < downstreamArray.length; index++) {
        const target = downstreamArray[index];
        if (bufferHP <= 0) {
            bufferHP = 0;
            target.newHP = 0;
        }
        // Process the target based on bufferHP and target's properties
        // Adjust target.newHP based on bufferHP and target conditions
        if (bufferHP > 0) {
            target.newHP = bufferHP - target.damage;
        }
        else if (bufferHP === 0) {
            if (target.newHP === 0) {
                if (target.damage < 0) {
                    target.newHP = -target.damage; // Convert negative damage to positive HP
                }
                else {
                    target.newHP = bufferHP - target.damage;
                }
            }
            else if (target.newHP > 0 && target.damage <= 0) {
                target.newHP = 0;
                conditionMet = true;
            }
            else if (target.newHP <= 0 && target.damage <= 0) {
                target.newHP = -target.damage; // Convert negative damage to restore to HP
                bufferHP = target.newHP;
            }
        }
        // Ensure newHP is not negative
        target.newHP = Math.max(target.newHP, 0);
        // Check if condition is met to set the removal index
        if (conditionMet) {
            indexToRemove = index;
            break;
        }
        // Update bufferHP for the next iteration
        bufferHP = target.newHP;
    }
    // If a condition is met, truncate the array from the found index
    if (indexToRemove >= 0) {
        downstreamArray.splice(indexToRemove);
    }
}
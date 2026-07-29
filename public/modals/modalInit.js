// modalInit defines the modal for adjusting group initiative

async function modalInit() {
        const modal = document.querySelector("#modal-body");
        const dropdown = document.querySelector(".initDropdown");
        const selectedOptionValue = dropdown.options[dropdown.selectedIndex].value;

        const container = document.createElement("div");
        container.classList.add("modal-body");
        let div = document.createElement("div");
        div.classList.add("modal-content");
        let h1 = document.createElement("h1");
        h1.classList.add("center");
        h1.innerText = "INITIATIVE";
        div.appendChild(h1);

        if (selectedOptionValue == "Party") {
            // get the character_names and their pID
            let partyParticipants = ctApp.filter((participant) => {
                return participant.pc == 1
            })

            const h2 = document.createElement("h2");
            h2.classList.add("center");
            h2.innerText = "Our Heroes!"
            div.appendChild(h2);
            const div4 = document.createElement("div");
            div4.classList.add("center-div-align-left");

            partyParticipants.forEach((participant, index) => {
                const div2 = document.createElement("div");
                div2.classList.add("line", "initiative-row");
                div2.setAttribute("draggable", "true");
                div2.setAttribute("data-initiative-row", participant.pID);
                const input = document.createElement("input");
                input.classList.add("initValues")
                input.setAttribute("type", "text");
                input.setAttribute("maxLength", "2");
                input.setAttribute("data-init-pid", participant.pID);

                const input2 = document.createElement("input");
                input2.classList.add("secondaryInitValues")
                input2.classList.add("secondary-init-off")
                input2.setAttribute("type", "text");
                input2.setAttribute("maxLength", "2");
                input2.setAttribute("data-init-pid-secondary", participant.pID);
                input2.defaultValue = "10";

                const span = document.createElement("span");
                span.innerText = participant.character_name;
                div2.appendChild(input);
                div2.appendChild(input2);
                div2.appendChild(span);
                div4.appendChild(div2);
            })
            div.appendChild(div4)
            container.appendChild(div);

            const br = document.createElement("br");
            container.appendChild(br);
            const br2 = document.createElement("br");

            const button = document.createElement("button");
            button.setAttribute("onclick", "submitInitModal(1)")
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
            container.appendChild(div3);
            container.appendChild(br2);

            modal.innerHTML = container.outerHTML;

            const initiativeRows = () => Array.from(div4.querySelectorAll(".initiative-row"));

            const renumberInitiativeRows = () => {
                const rows = initiativeRows();
                if (!rows.length) {
                    return;
                }

                const firstInitInput = rows[0].querySelector(".initValues");
                const firstSecondaryInput = rows[0].querySelector(".secondaryInitValues");
                const firstInitValue = parseInt(firstInitInput.value || firstInitInput.defaultValue || "10", 10) || 10;
                firstInitInput.value = firstInitValue;
                firstSecondaryInput.value = firstSecondaryInput.value || firstSecondaryInput.defaultValue || "10";

                rows.slice(1).forEach((row, index) => {
                    const previousRow = rows[index];
                    const previousInitInput = previousRow.querySelector(".initValues");
                    const previousSecondaryInput = previousRow.querySelector(".secondaryInitValues");
                    const previousInit = parseInt(previousInitInput.value || previousInitInput.defaultValue || "10", 10) || 10;
                    const previousSecondary = parseInt(previousSecondaryInput.value || previousSecondaryInput.defaultValue || "10", 10) || 10;
                    const proposedMain = Math.max(previousInit - 1, 1);
                    const currentInitInput = row.querySelector(".initValues");
                    const currentSecondaryInput = row.querySelector(".secondaryInitValues");

                    if (proposedMain < previousInit) {
                        currentInitInput.value = proposedMain;
                        currentSecondaryInput.value = "10";
                    } else {
                        currentInitInput.value = previousInit;
                        currentSecondaryInput.value = previousSecondary + 1;
                    }
                });
            };

            let draggedRow = null;

            div4.addEventListener("dragstart", (event) => {
                const row = event.target.closest(".initiative-row");
                if (!row) {
                    return;
                }
                draggedRow = row;
                row.classList.add("dragging");
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", row.getAttribute("data-initiative-row"));
            });

            div4.addEventListener("dragover", (event) => {
                const row = event.target.closest(".initiative-row");
                if (!row || row === draggedRow) {
                    return;
                }
                event.preventDefault();
                row.classList.add("drop-target");
            });

            div4.addEventListener("dragleave", (event) => {
                const row = event.target.closest(".initiative-row");
                if (row) {
                    row.classList.remove("drop-target");
                }
            });

            div4.addEventListener("drop", (event) => {
                event.preventDefault();
                const row = event.target.closest(".initiative-row");
                if (!row || !draggedRow || row === draggedRow) {
                    return;
                }

                const rows = initiativeRows();
                const fromIndex = rows.indexOf(draggedRow);
                const toIndex = rows.indexOf(row);
                if (fromIndex < 0 || toIndex < 0) {
                    return;
                }

                const [movedRow] = rows.splice(fromIndex, 1);
                rows.splice(toIndex, 0, movedRow);
                const fragment = document.createDocumentFragment();
                rows.forEach((item) => fragment.appendChild(item));
                div4.innerHTML = "";
                div4.appendChild(fragment);
                renumberInitiativeRows();
                draggedRow = null;
            });

            div4.addEventListener("dragend", () => {
                document.querySelectorAll(".initiative-row").forEach((row) => {
                    row.classList.remove("dragging", "drop-target");
                });
                draggedRow = null;
            });

            renumberInitiativeRows();

            setTimeout(() => {
                let cursorField = document.querySelector('input[data-init-pid]')
                cursorField.focus();
            }, 90)

            modal.addEventListener("input", function (e) {
                // Get all left input elements
                const leftInputs = document.querySelectorAll('[data-init-pid]');

                // Create a Set to store encountered values
                const encounteredValues = new Set();
                const duplicatedNumbers = new Set();

                // Iterate through each left input element
                leftInputs.forEach(leftInput => {
                    // Get the value of the left input
                    const leftInputValue = leftInput.value.trim();

                    // Check if the value is not empty
                    if (leftInputValue !== '') {
                        // Check if the value has been encountered before
                        if (encounteredValues.has(leftInputValue)) {
                            // If yes, add it to the Set of duplicated numbers
                            duplicatedNumbers.add(leftInputValue);
                        } else {
                            // If not, add it to the Set of encountered values
                            encounteredValues.add(leftInputValue);
                        }
                    }
                });

                // Iterate through each left input element
                leftInputs.forEach(leftInput => {
                    // Get the value of the left input
                    const leftInputValue = leftInput.value.trim();

                    // Check if the value is in the duplicatedNumbers array
                    if (duplicatedNumbers.has(leftInputValue)) {
                        // Get the value of data-init-pid for the matching left input
                        const dataInitPidValue = leftInput.getAttribute('data-init-pid');

                        // Select all elements with data-init-pid-secondary matching the value
                        const secondaryInitOffElements = document.querySelectorAll(`[data-init-pid-secondary="${dataInitPidValue}"]`);

                        // Remove the secondary-init-off class from matching elements
                        secondaryInitOffElements.forEach(element => {
                            element.classList.remove('secondary-init-off');
                        });
                    }
                });

                // Iterate through each left input element
                leftInputs.forEach(leftInput => {
                    // Get the value of the left input
                    const leftInputValue = leftInput.value.trim();

                    // Check if the value is NOT in the duplicatedNumbers array
                    if (!duplicatedNumbers.has(leftInputValue)) {
                        // Get the value of data-init-pid for the matching left input
                        const dataInitPidValue = leftInput.getAttribute('data-init-pid');

                        // Select all elements with data-init-pid-secondary matching the value
                        const secondaryInitOffElements = document.querySelectorAll(`[data-init-pid-secondary="${dataInitPidValue}"]`);

                        // Add the secondary-init-off class to matching elements
                        secondaryInitOffElements.forEach(element => {
                            element.classList.add('secondary-init-off');
                        });
                    }
                });
            });

        } else {
            // the dropdown holds base names, so "Goblin" selects every "Goblin #n"
            const creatureParticipants = ctApp.filter((participant) => {
                return baseCharacterName(participant.character_name) == selectedOptionValue
            })
            // get their init_modifiers
            const initModifier = creatureParticipants[0].init_modifier

            // write the HTML that fits
            const h2 = document.createElement("h2");
            h2.classList.add("center");
            h2.innerText = (
                creatureParticipants.length > 1
                    ? creatureParticipants.length
                    : ""
            )
                + " "
                + selectedOptionValue + "(s)"
            div.appendChild(h2);

            const divOpponents = document.createElement("div");
            divOpponents.classList.add("center-div-align-left");

            creatureParticipants.forEach((creature, index) => {
                let div2 = document.createElement("div");
                div2.classList.add("line")
                let input = document.createElement("input");
                input.setAttribute("type", "text");
                input.setAttribute("data-init-modifier", creature.init_modifier || 0);
                // input.setAttribute("value", creature.pID);
                input.setAttribute("maxLength", "2");
                let span = document.createElement("span");
                span.innerText = (creature.init_modifier >= 0 ? " + " : " - ") + Math.abs(creature.init_modifier) + " = ";
                let strong = document.createElement("strong");
                strong.setAttribute("data-init-pid", creature.pID);
                strong.innerText = "0";
                // each row's roll goes to that row's creature, and the number is a
                // fixed identity rather than a rank, so say which creature it is.
                // Appended after the strong so submitInitModal's
                // 'input + span + strong' selector still matches.
                let nameSpan = document.createElement("span");
                nameSpan.classList.add("initiative-row-name");
                nameSpan.innerText = creature.character_name;

                div2.appendChild(input);
                div2.appendChild(span);
                div2.appendChild(strong);
                div2.appendChild(nameSpan);
                divOpponents.appendChild(div2);
            })
            div.appendChild(divOpponents);
            container.appendChild(div);

            let br = document.createElement("br");
            container.appendChild(br);
            let br2 = document.createElement("br");

            let button = document.createElement("button");
            button.setAttribute("onclick", "submitInitModal(0)")
            button.innerText = "SUBMIT";
            button.classList.add("center")

            let button2 = document.createElement("button");
            button2.setAttribute("onclick", "closeModal()")
            button2.classList.add("close-modal")
            button2.innerText = "CLOSE";
            button2.classList.add("center");

            let div3 = document.createElement("div");
            div3.classList.add("center")

            div3.appendChild(button)
            div3.appendChild(button2)
            container.appendChild(div3);
            container.appendChild(br2);

            modal.innerHTML = container.outerHTML;

            modal.innerHTML = container.outerHTML;
            setTimeout(() => {
                let cursorField = document.querySelector('input[data-init-modifier]')
                cursorField.focus();
            }, 90)

            modal.addEventListener("input", function (e) {

                const inputElement = e.target;
                const parentDiv = inputElement.parentElement;
                let strongElement = parentDiv.querySelector('strong');
                const inputValue = inputElement.value.trim(); // Trim leading/trailing white spaces
                if (inputValue === "") {
                    strongElement.innerText = "0";
                } else {
                    let parsedValue = parseInt(inputValue, 10);
                    let initModifier = parseInt(inputElement.getAttribute('data-init-modifier'), 10);
                    let newValue = parsedValue + initModifier;
                    strongElement.innerText = newValue;
                }
                const allInputs = e.target.parentElement;
            });
        }
        const cm = document.querySelector(".modal-content");
        function showContextMenu(show = true) {
            cm.style.display = show ? "block" : "none";
        }
    }
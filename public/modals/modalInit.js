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
                div2.classList.add("line");
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

                // Log the array of duplicated numbers to the console
                console.log('Duplicated Numbers:', Array.from(duplicatedNumbers));

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
            // determine which participants in ctApp have character_name that matches selectedOptionValue
            const creatureParticipants = ctApp.filter((participant) => {
                return participant.character_name == selectedOptionValue
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
                + creatureParticipants[0].character_name + "(s)"
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

                div2.appendChild(input);
                div2.appendChild(span);
                div2.appendChild(strong);
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
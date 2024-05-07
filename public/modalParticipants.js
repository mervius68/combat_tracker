// modalParticipants defines the modal for adding participants

async function modalParticipants() {
        const modal = document.querySelector("#modal-body");
        modal.innerHTML = "";
        const container = document.createElement("div");
        container.classList.add("modal-body");
        const div = document.createElement("div");
        div.classList.add("modal-content");

        const h1 = document.createElement("h1");
        h1.classList.add("center");
        h1.innerText = "ADD PARTICIPANTS";
        div.appendChild(h1);
        container.appendChild(div);

        const container2 = document.createElement("div");
        container2.classList.add("participant-container");

        // left container
        const leftContainer = document.createElement("div");
        leftContainer.classList.add("left-container");
        const h3 = document.createElement("h3");
        h3.innerText = "Character List";

        leftContainer.appendChild(h3);

        // get a list of the characters who are available, i.e. pc = 1
        const availablePCs = await dbQuery("GET", "getCharacters?isPC=1");

        const toggle = document.createElement("div");
        toggle.classList.add("list-item");

        const oppInput = document.createElement("input");
        oppInput.setAttribute("type", "checkbox");
        oppInput.setAttribute("id", "toggleSelect")
        oppInput.classList.add("toggle-participants");
        const oppInputLabel = document.createElement("label");
        oppInputLabel.setAttribute("for", "toggleSelect")
        oppInputLabel.innerText = "SELECT/UNSELECT ALL (toggle) ";

        toggle.appendChild(oppInput);
        toggle.appendChild(oppInputLabel);

        leftContainer.appendChild(toggle);

        let div2;
        // for each list item
        availablePCs.forEach((pc, index) => {
            div2 = document.createElement("div");
            div2.classList.add("list-item");
            const hpLabel = document.createElement("span");
            hpLabel.classList.add("hideHP")
            hpLabel.innerText = "HP: ";
            const hp = document.createElement("input");
            hp.setAttribute("type", "text");
            hp.classList.add("hideHP")
            hp.value = pc.max_hp
            hp.classList.add("hp-input");
            const input = document.createElement("input");
            input.setAttribute("type", "checkbox");
            input.setAttribute("id", "char" + index);
            input.setAttribute("data-chid", pc.chID);
            input.setAttribute("data-ac", pc.ac);
            input.classList.add("character-checkbox");
            input.setAttribute("data-name", pc.character_name)
            const label = document.createElement("label");
            label.setAttribute("for", "char" + index);
            label.innerText = pc.character_name;
            div2.appendChild(hpLabel);
            div2.appendChild(hp);
            div2.appendChild(input);
            div2.appendChild(label);
            leftContainer.appendChild(div2);
        })

        /////////////////////////////////

        // right container
        const rightContainer = document.createElement("div");
        rightContainer.classList.add("right-container");
        const h32 = document.createElement("h3");
        h32.innerText = "Opponent List";

        rightContainer.appendChild(h32);

        const monsterContainer = document.createElement("div");
        monsterContainer.style.height = "35px";
        monsterContainer.classList.add("monster-input-container")

        const select = document.createElement("select");
        select.setAttribute("id", "monsterSelect");

        const opponents = await dbQuery("GET", "getCharacters?isPC=0")

        const option = document.createElement("option");
        option.setAttribute("value", "monster0");
        option.setAttribute("data-hp", "0");
        option.setAttribute("data-chid", "0");
        option.setAttribute("data-ac", "0")
        option.innerText = "None";
        select.appendChild(option);

        // for each opponent...
        opponents.forEach((opponent, index) => {
            const option = document.createElement("option");
            option.setAttribute("value", "monster" + opponent.chID);
            option.setAttribute("data-hp", opponent.max_hp);
            option.setAttribute("data-chid", opponent.chID);
            option.setAttribute("data-ac", opponent.ac)
            option.innerText = opponent.character_name;
            select.appendChild(option);
        })


        /////////////////////////////

        monsterContainer.appendChild(select);

        const detailsContainer = document.createElement("div");
        const detailsInput = document.createElement("input");
        detailsInput.setAttribute("id", "detailsInput")
        const detailsInputLabel = document.createElement("label");
        detailsInputLabel.setAttribute("for", "detailsInput");
        detailsInputLabel.innerText = "New Name: "
        detailsContainer.appendChild(detailsInputLabel);
        detailsContainer.appendChild(detailsInput);



        const detailsContainer2 = document.createElement("div");
        detailsContainer2.classList.add("details-container")
        const hpInput = document.createElement("input");
        hpInput.setAttribute("id", "hpInputOpp")
        hpInput.classList.add("hp-input")
        hpInput.value = "";
        const hpInputLabel = document.createElement("label");
        hpInputLabel.setAttribute("for", "hpInputOpp");
        hpInputLabel.innerText = "HP: "

        const numOpponents = document.createElement("select");
        numOpponents.setAttribute("id", "numOpp")
        const numOpponentsLabel = document.createElement("label");
        numOpponentsLabel.setAttribute("for", "numOpp");
        numOpponentsLabel.innerText = "# of Opponents: "

        for (let i = 1; i <= 30; i++) {
            const option = document.createElement("option");
            option.setAttribute("value", i);
            option.innerText = i;
            numOpponents.appendChild(option);
        }

        detailsContainer2.appendChild(hpInputLabel);
        detailsContainer2.appendChild(hpInput);
        detailsContainer2.appendChild(numOpponentsLabel);
        detailsContainer2.appendChild(numOpponents);


        const btnContainer = document.createElement("div");
        btnContainer.classList.add("update-close-container");
        const button1 = document.createElement("button");
        button1.setAttribute("onclick", "updateParticipantList()");
        button1.innerText = "ADD";
        const button2 = document.createElement("button");
        button2.setAttribute("onclick", "closeModal()");
        button2.innerText = "CLOSE";

        btnContainer.appendChild(button1);
        btnContainer.appendChild(button2);

        leftContainer.appendChild(div2);

        rightContainer.appendChild(h32);
        rightContainer.appendChild(monsterContainer);
        rightContainer.appendChild(detailsContainer);
        rightContainer.appendChild(detailsContainer2);
        rightContainer.appendChild(btnContainer);


        container2.appendChild(leftContainer)
        container2.appendChild(rightContainer)
        div.appendChild(container2);
        container.appendChild(div);
        modal.appendChild(container);
        const cm = document.querySelector(".modal-content");
        function showContextMenu(show = true) {
            cm.style.display = show ? "block" : "none";
        }

        const toggler = document.querySelector(".toggle-participants");
        const participants = document.querySelectorAll(".character-checkbox");

        toggler.addEventListener("change", () => {
            participants.forEach((participant) => {
                participant.checked = toggler.checked;
                toggleHideHP(participant);
            });
        });

        participants.forEach((participant) => {
            participant.addEventListener("change", () => {
                toggleHideHP(participant);
            });
        });

        function toggleHideHP(participant) {
            const hideHPInputs = [
                participant.previousElementSibling,
                participant.previousElementSibling.previousElementSibling
            ];

            hideHPInputs.forEach((input) => {
                input.classList.toggle("hideHP", !participant.checked);
            });
        }

        // const options = document.querySelectorAll('.monsterSelect option');
        // Select the elements
        const monsterSelect = document.getElementById('monsterSelect');
        const hpInputOpp = document.getElementById('hpInputOpp');

        // Add event listener to the monsterSelect
        monsterSelect.addEventListener('change', () => {
            // Get the selected option
            const selectedOption = monsterSelect.options[monsterSelect.selectedIndex];

            // Update the value of hpInputOpp with the data-hp attribute of the selected option
            hpInputOpp.value = selectedOption.dataset.hp || '';

            const resetNewName = document.getElementById("detailsInput");
            resetNewName.value = ""
        });
        modalIsOpen = true;


    }
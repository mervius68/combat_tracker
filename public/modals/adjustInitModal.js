// adjustInitModal defines the modal for adjusting a single participant's initiative
// submitAdjustInit takes that info and updates database

async function adjustInitModal(characterToAdjustInit) {
        const pIDObject = ctApp.find(obj => obj.pID == characterToAdjustInit);

        const modal = document.querySelector("#modal-body");

        const container = document.createElement("div");
        container.classList.add("modal-body");
        let div = document.createElement("div");
        div.classList.add("modal-content");
        let h1 = document.createElement("h1");
        h1.classList.add("center");
        h1.innerText = "INITIATIVE FOR " + pIDObject.character_name + ((pIDObject.numeric_value) ? " #" + pIDObject.numeric_value : "");
        div.appendChild(h1);

        // html
        // div containing first line: rolled d20
        const rolledD20Div = document.createElement("div");
        rolledD20Div.classList.add("line");
        const rolledD20Input = document.createElement("input");
        rolledD20Input.setAttribute("type", "text");
        rolledD20Input.setAttribute("id", "rolledD20")
        rolledD20Input.classList.add("initValues");
        rolledD20Input.setAttribute("maxLength", "2");
        rolledD20Input.setAttribute("data-init-rolled-pid", pIDObject.pID);
        rolledD20Input.defaultValue = parseInt(pIDObject.init) - parseInt(pIDObject.init_modifier);
        const rolledD20Label = document.createElement("label")
        rolledD20Label.setAttribute("for", "rolledD20");
        rolledD20Label.innerText = "Rolled d20";
        rolledD20Div.appendChild(rolledD20Input);
        rolledD20Div.appendChild(rolledD20Label)

        // div containing DEX modifier info
        const modifierDiv = document.createElement("div");
        modifierDiv.classList.add("line");
        const modifierText = document.createElement("span");
        modifierText.innerText = (pIDObject.init_modifier > -1 ? "+" : "") + pIDObject.init_modifier;
        const modifierTextDesc = document.createElement("span");
        modifierTextDesc.innerText = " DEX Modifier";
        modifierDiv.appendChild(modifierText);
        modifierDiv.appendChild(modifierTextDesc);

        // div containing third line (d20 plus modifier)
        const initDiv = document.createElement("div");
        initDiv.classList.add("line");
        const initInput = document.createElement("input");
        initInput.setAttribute("type", "text");
        initInput.setAttribute("id", "initValue")
        initInput.classList.add("initValues");
        initInput.setAttribute("maxLength", "2");
        initInput.setAttribute("data-init-pid", pIDObject.pID);
        initInput.defaultValue = parseInt(pIDObject.init);
        const initLabel = document.createElement("label")
        initLabel.setAttribute("for", "initValue");
        initLabel.innerText = "Adjusted Initiative";
        initDiv.appendChild(initInput);
        initDiv.appendChild(initLabel);

        // div containing 4th line (secondary init);
        const secondaryInitDiv = document.createElement("div");
        secondaryInitDiv.classList.add("line");
        const secondaryInitInput = document.createElement("input");
        secondaryInitInput.setAttribute("type", "text");
        secondaryInitInput.setAttribute("id", "secondaryInit")
        secondaryInitInput.classList.add("initValues");
        secondaryInitInput.setAttribute("maxLength", "2");
        secondaryInitInput.setAttribute("data-init-secondary-pid", pIDObject.pID);
        secondaryInitInput.defaultValue = pIDObject.secondary_init;
        const secondaryInitLabel = document.createElement("label")
        secondaryInitLabel.setAttribute("for", "secondaryInit");
        secondaryInitLabel.innerText = "Secondary Initiative";
        secondaryInitDiv.appendChild(secondaryInitInput);
        secondaryInitDiv.appendChild(secondaryInitLabel)

        const div4 = document.createElement("div");
        div4.classList.add("center-div-align-left");
        div4.appendChild(rolledD20Div);
        div4.appendChild(modifierDiv);
        div4.appendChild(initDiv);
        div4.appendChild(secondaryInitDiv);


        div.appendChild(div4)
        container.appendChild(div);

        const br = document.createElement("br");
        container.appendChild(br);
        const br2 = document.createElement("br");

        const button = document.createElement("button");
        button.setAttribute("onclick", "submitAdjustInit()")
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
            if (e.target.getAttribute("id") == "initValue") {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                modal.querySelector("#rolledD20").value = modal.querySelector("#initValue").value - (pIDObject.init_modifier || 0);
            } else if (e.target.getAttribute("id") == "rolledD20") {
                e.target.value = e.target.value.replace(/[^0-9]/g, '');
                modal.querySelector("#initValue").value = (parseInt(modal.querySelector("#rolledD20").value) + parseInt(pIDObject.init_modifier || 0)) || pIDObject.init_modifier;
            }
        });

        const cm = document.querySelector(".modal-content");
        function showContextMenu(show = true) {
            cm.style.display = show ? "block" : "none";
        }
        pushModal();
        modalIsOpen = true;
    }

async function submitAdjustInit() {
        // get new initiative and pID
        const newInitEle = document.querySelector("#initValue")
        const newInit = newInitEle.value;
        const pID = newInitEle.getAttribute("data-init-pid")
        // get secondary initiative
        const newSecondaryInit = document.querySelector("#secondaryInit").value

        const data = {
            init: newInit,
            secondary_init: newSecondaryInit,
            pID: pID
        }

        // submit to database
        await dbQueryPost("adjustInit", data)
        refresh_encounter()
        closeModal()
    }
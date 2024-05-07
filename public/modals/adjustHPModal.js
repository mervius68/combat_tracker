// adjustHPModal defines the modal for adjust a participant's hit points
// submitAdjustHP takes that info and updates database

 async function adjustHPModal(e, characterToAdjustHP) {
        // alert(e.target.outerHTML)
        const pIDObject = ctApp.find(obj => obj.pID == characterToAdjustHP);
        const modal = document.querySelector("#modal-body");

        const container = document.createElement("div");
        container.classList.add("modal-body");
        let div = document.createElement("div");
        div.classList.add("modal-content");
        let h1 = document.createElement("h1");
        h1.classList.add("center");
        h1.innerText = "ADJUST Starting Hit Points FOR " + pIDObject.character_name + ((pIDObject.numeric_value) ? " #" + pIDObject.numeric_value : "");
        div.appendChild(h1);

        const div2 = document.createElement("div");
        div2.classList.add("center-div-align-left");

        // div containing given Max HP info
        const changeHPDiv = document.createElement("div");
        changeHPDiv.classList.add("line");
        const maxHPSpan = document.createElement("span");
        maxHPSpan.innerText = pIDObject.max_hp;
        const maxHPDesc = document.createElement("span");
        maxHPDesc.innerText = " Max HP";
        changeHPDiv.appendChild(maxHPSpan);
        changeHPDiv.appendChild(maxHPDesc);
        div2.appendChild(changeHPDiv);

        // div containing new HP input
        const startingHPDiv = document.createElement("div");
        startingHPDiv.classList.add("line");
        const startingHPInput = document.createElement("input");
        startingHPInput.setAttribute("type", "text");
        startingHPInput.setAttribute("id", "startingHP")
        startingHPInput.classList.add("startingHP");
        startingHPInput.setAttribute("maxLength", "2");
        startingHPInput.setAttribute("data-starting-hp-pid", pIDObject.pID);
        // startingHPInput.defaultValue = pIDObject.max_hp;
        const startingHPLabel = document.createElement("label")
        startingHPLabel.setAttribute("for", "startingHP");
        startingHPLabel.innerHTML = "&nbsp;&nbsp;&nbsp;Starting HP";
        startingHPDiv.appendChild(startingHPInput);
        startingHPDiv.appendChild(startingHPLabel)
        div2.appendChild(startingHPDiv)

        const br = document.createElement("br");
        const br2 = document.createElement("br");
        const br3 = document.createElement("br");

        const button = document.createElement("button");
        button.setAttribute("onclick", `submitAdjustHP(${pIDObject.pID})`)
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

        container.appendChild(div);
        container.appendChild(div2);
        container.appendChild(br);
        container.appendChild(br2);
        container.appendChild(div3);
        container.appendChild(br3);


        modal.innerHTML = container.outerHTML;
        setTimeout(() => {
            let cursorField = document.querySelector('input[data-starting-hp-pid]')
            cursorField.focus();
        }, 90)

        const cm = document.querySelector(".modal-content");
        function showContextMenu(show = true) {
            cm.style.display = show ? "block" : "none";
        }
        pushModal();
        modalIsOpen = true;
    }

    async function submitAdjustHP(characterToAdjustHP) {
        const startingHPEle = document.querySelector("#startingHP")
        const starting_hp = startingHPEle.value;
        const pIDObject = ctApp.find(obj => obj.pID == characterToAdjustHP);
        const pID = pIDObject.pID;
        const max_hp = pIDObject.max_hp;

        const data = {
            pID: pID,
            max_hp: max_hp,
            starting_hp: starting_hp
        }

        await dbQueryPost("submitStartingHP", data)
        refresh_encounter()
        closeModal()

    }
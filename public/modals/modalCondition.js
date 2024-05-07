// this function defines the condition modal

async function modalConditions(
        affected,
        concentration,
        conditionName,
        holding,
        holdingOneRound,
        nextAID
    ) {
        let html = document.querySelector(".selected");
        let modal = document.querySelector("#modal-body");
        let participantID = await html.getAttribute("data-participant");
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
        let causerPosition;
        ctApp.forEach((participant, index) => {
            let checkbox = document.createElement("input");
            checkbox.setAttribute("type", "radio");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("name", "causers");
            checkbox.setAttribute("id", participant.pID);
            if (participantID == participant.pID) {
                checkbox.setAttribute("checked", "true");
                causerPosition = index;
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
        let affecteePosition;
        let affecteesCount = 0;
        ctApp.forEach((participant, index) => {
            let checkbox = document.createElement("input");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("type", "checkbox");
            checkbox.setAttribute("name", "affectees");
            checkbox.setAttribute("id", "a" + participant.pID);
            if (affected.includes(participant.pID.toString())) {
                checkbox.setAttribute("checked", "true");
                affecteePosition = index;
                affecteesCount += 1;
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

        // build the radio buttons for whose turn a condition ends on
        ctApp.forEach((participant) => {
            let checkbox = document.createElement("input");
            checkbox.setAttribute("type", "radio");
            checkbox.classList.add("pointer");
            checkbox.setAttribute("name", "condition_ends");
            checkbox.setAttribute("id", "x" + participant.pID);
            if (
                affected.includes(participant.pID.toString()) &&
                holding == 1 &&
                affecteesCount == 1
            ) {
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
        submit.setAttribute("onclick", `submitCondition(${nextAID})`);

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

            if (currentRound == i && holding == 0) {
                option.setAttribute("selected", "true");
            } else {
                if (currentRound == i && causerPosition <= affecteePosition) {
                    option.setAttribute("selected", "true");
                }
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
            if (currentRound == i - 10 && holdingOneRound == 0) {
                option.setAttribute("selected", "true");
            } else {
                if (currentRound == i && causerPosition < affecteePosition) {
                    option.setAttribute("selected", "true");
                } else if (
                    currentRound == i - 1 &&
                    causerPosition >= affecteePosition
                ) {
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
        modalIsOpen = true;
    }
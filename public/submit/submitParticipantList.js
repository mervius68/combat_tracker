// updateParticipantList takes info from participants modal and updates database

async function updateParticipantList() {
        // get characters
        // Select all elements with class "list-item" (excluding the first match) where the child checkbox is checked
        const selectedCharacters = document.querySelectorAll('.list-item:not(:first-child) input.character-checkbox:checked');

        let group = []
        // Do something with the selected elements
        selectedCharacters.forEach((item, index) => {
            const currentItem = {
                chID: item.getAttribute("data-chid"),
                character_name: item.getAttribute("data-name"),
                ac: item.getAttribute("data-ac"),
                eID: ctAppEnc,
                max_hp: item.previousElementSibling.value,
                numeric_value: ""
            }
            aaa = currentItem;
            group.push(currentItem);
        });

        const monsters = document.querySelector("#monsterSelect")
        const monsterSelected = monsters.options[monsters.selectedIndex];
        if (monsterSelected.textContent != "None") {
            const chID = monsterSelected.getAttribute("data-chid");
            const ac = monsterSelected.getAttribute("data-ac");

            let participantName = document.querySelector("#detailsInput").value;
            participantName = participantName == "" ? monsterSelected.textContent : participantName;
            let hp = document.querySelector("#hpInputOpp").value;
            let numOpponents = document.querySelector("#numOpp")
            let number = numOpponents.options[numOpponents.selectedIndex].value;

            // let highestNumericKey = Math.max(...Object.keys(group).map(Number), 0) + 1;

            for (let i = 0; i <= number - 1; i++) {
                const currentItem = {
                    chID: chID,
                    character_name: participantName,
                    eID: ctAppEnc,
                    ac: ac,
                    max_hp: hp,
                    numeric_value: number > 1 ? i + 1 : ""
                }
                bbb = currentItem
                group.push(currentItem);
            }
        }

        // we have a group array containing objects, where each object gets action in the db
        for (const obj of group) {
            // get number to assign new participant in ct_tbl_participant
            let latestParticipant = await dbQuery("GET", "getLatestParticipant")
            // give each new character a pID; if the db is zero-day fresh, character gets "1"
            obj.pID = parseInt(latestParticipant[0]?.pID || 0) + 1
            await dbQueryPost("updateEncounterParticipants", obj)
            await dbQueryPost("addParticipant", obj)
        }

        // await dbQueryPost("addParticipants", group)
        refresh_encounter();
    }
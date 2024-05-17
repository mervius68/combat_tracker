// this function takes info from condition modal and updates database

async function submitCondition(nextAID) {
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
            .replace("#", "&num;")
            .replace("/", "&sol;");
        let startRoundHTML = document.querySelector(".beginRound");
        let endRoundHTML = document.querySelector(".endRound");
        let concentrationHTML = document.getElementsByName("concentration");
        let holdingHTML = document.getElementsByName("holding");

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

        let holding;
        holding = Array.from(holdingHTML).find(
            (holdingValue) => {
                return holdingValue.checked == true;
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
        let end_pID = Array.from(conditionEndsHTML).find((participant) => {
            return participant.checked == true;
        }).id;
        end_pID = end_pID.substring(1);

        let conditionEndsPID = Array.from(conditionEndsHTML)
            .find(item => item.checked)
            .id.slice(1);
        let startRound = Array.from(startRoundHTML).find(item => item.selected).value;
        let endRound = Array.from(endRoundHTML).find(item => item.selected).value;

        // get next cpID
        let latestConditionID = await dbQuery("GET", "getNextcpID/");
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
        let dataConditionsAffectees = `addConditionAffectees/${taID}/${startRound}/${endRound}/${affecteesString}/${end_pID}`;

        await dbQuery("GET", dataConditionsAffectees);

        // send condition info
        let dataConditions = `addCondition/${ctApp[0].eID}/${causerPID}/${taID}/${conditionEndsPID}/${newCpID}/${concentration}/${holding}/${nextAID}`;
        await dbQuery("GET", dataConditions);

        load_encounter(ctAppEnc, dataNav);
        closeModal();
    }
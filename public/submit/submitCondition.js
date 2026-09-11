// this function takes info from condition modal and updates database

// What the condition modal currently says, read the same way whether the condition
// is being recorded for the first time or edited. The modal is rebuilt from scratch
// each time it opens, so everything here comes off the elements that are on screen.
function readConditionModal() {
    let html = document.querySelector(".selected");
    let causerHTML = document.getElementsByName("causers");
    let affecteesHTML = document.getElementsByName("affectees");
    let conditionEndsHTML = document.getElementsByName("condition_ends");
    let startRoundHTML = document.querySelector(".beginRound");
    let endRoundHTML = document.querySelector(".endRound");
    let concentrationHTML = document.getElementsByName("concentration");
    let holdingHTML = document.getElementsByName("holding");

    // Every occurrence, and "?" and "%" as well: this description is a segment
    // of the URL the condition is saved with, and one stray character in it lost
    // the whole submit.
    let conditionDescription = escapeTextForRequest(
        document.querySelector(".conditionsText").value
    );

    let causerPID = Array.from(causerHTML).find((causer) => {
        return causer.checked == true;
    }).id;

    let concentration = Array.from(concentrationHTML).find(
        (concentrationValue) => {
            return concentrationValue.checked == true;
        }
    ).value;

    let holding = Array.from(holdingHTML).find((holdingValue) => {
        return holdingValue.checked == true;
    }).value;

    let affecteesPID = Array.from(affecteesHTML)
        .filter((affected) => {
            return affected.checked == true;
        })
        .map((affectee) => {
            return affectee.getAttribute("id").substring(1);
        });

    let endPID = Array.from(conditionEndsHTML)
        .find((participant) => {
            return participant.checked == true;
        })
        .id.substring(1);

    return {
        currentRound: html.getAttribute("data-round"),
        pID: html.getAttribute("data-participant"),
        dataNav: html.getAttribute("data-nav"),
        conditionDescription: conditionDescription,
        causerPID: causerPID,
        concentration: concentration,
        holding: holding,
        affecteesPID: affecteesPID,
        affecteesString: affecteesPID.join(", "),
        endPID: endPID,
        startRound: Array.from(startRoundHTML).find((item) => item.selected)
            .value,
        endRound: Array.from(endRoundHTML).find((item) => item.selected).value,
    };
}

async function submitCondition(nextAID) {
        const modalValues = readConditionModal();
        let dataNav = modalValues.dataNav;
        let conditionDescription = modalValues.conditionDescription;
        let causerPID = modalValues.causerPID;
        let concentration = modalValues.concentration;
        let holding = modalValues.holding;
        let affecteesString = modalValues.affecteesString;
        let end_pID = modalValues.endPID;
        let conditionEndsPID = modalValues.endPID;
        let startRound = modalValues.startRound;
        let endRound = modalValues.endRound;

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

        // Closed first and the reload waited for. Two reloads running at once each
        // reset the counter that numbers the rows and then both number their own
        // grid from where the other had got to, so the second one comes out
        // starting at 197 instead of 1 - and the row the tracker was sitting on no
        // longer exists to be reselected. Everything that reads .selected, this
        // modal's own save included, then has nothing to read.
        closeModal();
        await load_encounter(ctAppEnc, dataNav);
    }

// Save an edit to a condition that already exists. The one request rewrites the
// condition, its description and its affectees together, so a save that fails part
// way through does not leave the condition half changed - and the action that caused
// it, which the condition still hangs off, is not touched at all.
async function submitConditionUpdate(taID) {
    const modalValues = readConditionModal();

    if (modalValues.affecteesPID.length == 0) {
        alert("A condition needs at least one affectee.");
        return;
    }

    try {
        await dbQueryPost("updateCondition", {
            taid: taID,
            description: modalValues.conditionDescription,
            causerPID: modalValues.causerPID,
            concentration: modalValues.concentration,
            holding: modalValues.holding,
            startRound: modalValues.startRound,
            endRound: modalValues.endRound,
            endPID: modalValues.endPID,
            affectees: modalValues.affecteesPID,
        });
    } catch (err) {
        // The modal stays up with the changes still in it, so the edit can be tried
        // again rather than being lost to a closed modal.
        alert("This edit did not save, and the condition is unchanged.");
        return;
    }

    // The same ordering as submitCondition above, and for the same reason.
    closeModal();
    await load_encounter(ctAppEnc, modalValues.dataNav);
}

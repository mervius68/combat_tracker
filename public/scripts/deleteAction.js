async function deleteAction(dataAidValue) {
    const update = {
        ct_tbl_action: {
            update: {}
        },
        ct_tbl_target: {
            insert: [],
            update: [],
            delete: []
        },
        ct_tbl_condition: {
            delete: {}
        },
        ct_tbl_condition_affectee: {
            delete: {}
        },
        // tbl_tool: {
        //     insert: {
        //     },
        //     delete: {
        //     }
        // }
    };
    const ctAppCopy = await deepCopy(ctApp);
    const data = {
        aID: dataAidValue
    };
    const deleteEm = await dbQuery("GET", "getDeleteActionData/" + dataAidValue);
    deleteEm.forEach((obj) => {
        obj.aID = dataAidValue;
    });
    const deleteData = {
        aID: dataAidValue,
        targetID: deleteEm[0].targetID,
        taID: deleteEm[0].taID,
        conditionID: deleteEm[0].conditionID
    };
    await dbQueryPost("deleteAction", deleteData)
        .then((data) => {
        })
        .catch((error) => {
        });
    let updateData = {};
    let uniqueObjectsSet = new Set();

    deleteEm.forEach((obj, index) => {
        const object = {
            tID: obj.tID,
            damage: obj.damage,
            target_pID: obj.target_pID
        };
        // Create a string representation of the object for easy comparison
        const objectString = JSON.stringify(object);
        // Check if the object is unique before adding it to updateData
        if (!uniqueObjectsSet.has(objectString)) {
            uniqueObjectsSet.add(objectString);
            updateData[index] = { object };
        }
    });
    // figure out any changes in damage
    let downstreamArray = [];
    for (target of deleteEm) {
        // are there any affected records downstream?
        ctApp.forEach(character => {
            // Check if the character's pID matches the given value
            if (character.pID == target.target_pID) {
                // Iterate through each array in the damageArray
                character.damageArrayNotMapped.forEach(damageArray => {
                    // Filter the damageArray based on the condition that aID is greater than the given threshold
                    const filteredDamageItems = damageArray.filter(damageItem => damageItem.aID !== null && damageItem.aID >= dataAidValue);
                    // Append the filtered items to the result array
                    downstreamArray = downstreamArray.concat(filteredDamageItems);
                });
            }
        });

        let bufferHP = 0;
        let dataArray = await getDamageArrayFromCtApp(Number(target.target_pID));

        if (dataArray) {
            dataArray[0].filter(item => item.aID != target.aID);
            bufferHP = await getPreviousNewHP(dataArray, dataAidValue);
        }
      
        if (bufferHP < 0) {
            bufferHP = 0;
        }
        // Call the async function with bufferHP as argument
        await processDownstreamArray(bufferHP, downstreamArray, 1);
        for (const item of ctAppCopy) {
            if (item.pID === target.target_pID) {
                const notMapped = item.damageArrayNotMapped[target.round - 1];
                if (Array.isArray(notMapped)) {
                    const uniqueInDownstream = downstreamArray.filter(downstreamObj => {
                        const isDuplicated = notMapped.some(notMappedObj => {
                            // Explicitly convert and compare if necessary
                            const isEqual = Number(notMappedObj.aID) === Number(downstreamObj.aID) &&
                                Number(notMappedObj.tID) === Number(downstreamObj.tID) &&
                                Number(notMappedObj.damage) === Number(downstreamObj.damage) &&
                                Number(notMappedObj.newHP) === Number(downstreamObj.newHP) &&
                                Number(notMappedObj.targetID) === Number(downstreamObj.targetID);
                            return isEqual;
                        });
                        return !isDuplicated;
                    });
                    uniqueInDownstream.forEach((item, index) => {
                        // if (index != 0) {
                        update.ct_tbl_target.update.push(item);
                        // }
                    });
                }
            }
        }
        let uniqueArray = downstreamArray.filter((item, index, self) => {
            index == self.findIndex((t) => {
                t.aID == item.aID && t.targetID == item.targetID;
            });
        });
        downstreamArray = uniqueArray;
    }

    await dbQueryPost("updateActionDB", update);
    let html = document.querySelector(".selected");
    let dataNav = html.getAttribute("data-nav");
    load_encounter(ctAppEnc, dataNav);

    async function getDamageArrayFromCtApp(targetPID) {
        for (const item of ctApp) {
            if (item.pID === targetPID) {
                return item.damageArrayNotMapped;
            }
        }
        return null; // This confirms that no item matched the targetPID
    }

    async function getPreviousNewHP(dataArray, targetAID) {
        let prevNewHP = null; // Default to null if no previous object or not found
        // Assuming dataArray is correctly formatted and it's a double array as observed
        if (dataArray && dataArray[0]) {
            let bestIndex = -1; // Initialize the best index to an invalid value
            // Iterate through the array
            for (let i = 0; i < dataArray[0].length; i++) {
                // Check if current aID is less than targetAID and higher than any previously found aID that also was less than targetAID
                if (dataArray[0][i].aID < targetAID && (bestIndex === -1 || dataArray[0][i].aID > dataArray[0][bestIndex].aID)) {
                    bestIndex = i; // Update the best index to current index
                }
            }
            // After finding the highest aID less than targetAID, return its newHP
            if (bestIndex !== -1) {
                return dataArray[0][bestIndex].newHP; // Return the newHP of the best matched element
            }
            else {
                // If no such element exists, log a warning and return null
                console.warn("No entry exists with aID less than the targetAID.");
                return null; // No matching element was found
            }
        }
        return prevNewHP;
    }
}

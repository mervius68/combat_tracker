// submitInitModal takes info from initiative modal and updates database

async function submitInitModal(PC) {

        if (PC == 0) {
            // Assuming you have a NodeList, for example:
            let nodeList = document.querySelectorAll('input[type="text"] + span + strong');

            let strongValuesArray = Array.from(nodeList).map(function (element) {
                return element.innerText;
            });
            // Now strongValuesArray contains the innerText values of the <strong> elements

            const initialOrderPids = Array.from(nodeList).map(function (element) {
                return element.getAttribute('data-init-pid')
            })

            // sort strongValuesArray in descending order
            let sortedValues = strongValuesArray.slice().sort((a, b) => b - a);
            let indexMapping = strongValuesArray.map((_, index) => index)
                .sort((a, b) => strongValuesArray[b] - strongValuesArray[a]);

            const newOrderPids = indexMapping.map(index => initialOrderPids[index]);
            const reorderedNumericValues = Array.from({ length: sortedValues.length }, (_, index) => index + 1);

            let stringToSend = ""
            initialOrderPids.forEach((creature, index) => {
                stringToSend += (index > 0 ? " | " : "") + newOrderPids[index] + ", " + reorderedNumericValues[index] + ", " + sortedValues[index]
            })

            let postData = initialOrderPids.map((creature, index) => ({
                pID: newOrderPids[index],
                numeric_value: "", // Set this to the appropriate value or an empty string
                init: sortedValues[index],
            }));

            await dbQueryPost("orderInitiative", postData)
                .then((data) => {
                })
                .catch((error) => {
                });

            // where pID = newOrderPids[x], set numeric_value = reorderedNumericValues[x] and init = sortedValues[x]
        } else { // if PC == 1
            let nodeList = document.querySelectorAll('.initValues');
            let secondaryNodeList = document.querySelectorAll(".secondaryInitValues:not(.secondary-init-off)");

            let strongValuesArray = Array.from(nodeList).map(function (element) {
                return element.value;
            });

            // Now strongValuesArray contains the input values
            const initialOrderPids = Array.from(nodeList).map(function (element) {
                return element.getAttribute('data-init-pid');
            });

            // sort strongValuesArray in descending order
            let sortedValues = strongValuesArray.slice().sort((a, b) => b - a);
            let indexMapping = strongValuesArray.map((_, index) => index)
                .sort((a, b) => strongValuesArray[b] - strongValuesArray[a]);

            const newOrderPids = indexMapping.map(index => initialOrderPids[index]);

            // Create a mapping of data-init-pid to secondary_init values
            const secondaryInitValuesMap = {};
            document.querySelectorAll('.secondaryInitValues').forEach(element => {
                const secondaryInitValue = element.value || element.defaultValue || '10';
                const secondaryInitPid = element.getAttribute('data-init-pid-secondary');
                secondaryInitValuesMap[secondaryInitPid] = secondaryInitValue;
            });

            let stringToSend = "";
            const postData = initialOrderPids.map((creature, index) => {
                const secondaryInitValue = secondaryInitValuesMap[newOrderPids[index]];
                stringToSend += (index > 0 ? " | " : "") + newOrderPids[index] + ", " + "0" + ", " + sortedValues[index];

                return {
                    pID: newOrderPids[index],
                    numeric_value: "", // Set this to the appropriate value or an empty string
                    init: sortedValues[index],
                    secondary_init: secondaryInitValue, // Add secondary_init to the postData object
                };
            });

            await dbQueryPost("orderInitiative", postData)
                .then((data) => {
                })
                .catch((error) => {
                });


        }

        let html = document.querySelector(".selected");
        let dataNav = html.getAttribute("data-nav");
        load_encounter(ctAppEnc, dataNav);
    }
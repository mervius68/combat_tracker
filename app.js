const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const app = express();

const databaseFolder = "databases"; // Name of the folder

// Get the full path to the folder
const folderPath = path.join(__dirname, databaseFolder);

// Read the contents of database.txt in the folder
const databaseName = fs.readFileSync(path.join(folderPath, "database.txt"), "utf8").trim();
if (!databaseName) databaseName = "combat_template"
// Construct the path to the database file
const dbPath = path.join(folderPath, `${databaseName}.db`);

const db = new sqlite3.Database(
    dbPath,
    sqlite3.OPEN_READWRITE,
    (err) => {
        if (err) return console.error(err.message);
    }
);

// Now, the code reads the database name from the database.txt file
// located in the combat_databases folder.


app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");

// This pulls index.ejs to the root folder location of the site.
app.get("/", function (req, res) {
    res.render("index");
});

app.get("/selected_encounter/:eID", (req, res) => {
    eID = req.params.eID;
    let sql = `SELECT *
                FROM tbl_encounter
                WHERE eID = ${eID}
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        res.send(results);
    });
});

app.get("/updatedNames/:pID", (req, res) => {
    pID = req.params.pID;
    let sql = `SELECT character_name
                FROM ct_tbl_participant
                WHERE pID = ${pID}
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        res.send(results);
    });
});

app.post('/saveEncounterID', (req, res) => {
    const eID = req.body;
    const dataToWrite = `${eID.id}`;

    fs.writeFile('databases/encounter_id.txt', dataToWrite, (err) => {
        if (err) {
            console.error('Error writing to file:', err);
            res.status(500).json({ success: false, error: err.message });
        } else {
            res.json({ success: true });
        }
    });
});

app.get('/getEncounterID', (req, res) => {
    try {
      const data = fs.readFileSync('databases/encounter_id.txt', 'utf-8');
      const responseObj = { info: data.trim() };
      res.json({ success: true, data: responseObj });
    } catch (err) {
      console.error('Error reading file:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  });

app.post('/your-server-endpoint', (req, res) => {
    // Get the data sent from the client
    const data = req.body.option; // Assuming you expect JSON with a property 'option'

    // Define the file path where you want to write the data
    const filePath = 'databases/database.txt';

    // Write the data to the file (overwrite existing content)
    fs.writeFileSync(filePath, data, 'utf-8');

    // Send a JSON response to the client
    res.status(200).json({ message: 'Data written to the file.' });

});




app.get('/availableEncounters', (req, res) => {
    let sql = `SELECT *
                FROM tbl_encounter
                ORDER BY eID DESC
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get('/getLatestEncounterID', (req, res) => {
    let sql = `SELECT eID
                FROM ct_tbl_encounter
                ORDER BY eID DESC limit 1
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        res.send(...results);
    });
});

app.get("/latest_eID/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_encounter
                ORDER BY eID DESC limit 1
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        res.send(...results);
    });
});

app.get("/getLatestActionRow", (req, res) => {
    let sql = `SELECT row
                FROM ct_tbl_action
                ORDER BY row DESC limit 1;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/participants/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT *
    FROM ct_tbl_participant
    JOIN tbl_character ON ct_tbl_participant.chID = tbl_character.chID
    JOIN ct_tbl_encounter ON ct_tbl_participant.pID = ct_tbl_encounter.pID
    WHERE ct_tbl_encounter.eID = ${encounter}
    ORDER BY init DESC, secondary_init DESC, character_name, numeric_value ASC;
     `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/hpsByRound/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT *
                FROM ct_tbl_target
                WHERE eID = ${encounter} ORDER BY tID;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/damages/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT *
                FROM ct_tbl_target
                WHERE eID = ${encounter} ORDER BY round ;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getNewAID", (req, res) => {
    let sql = `SELECT aID
        FROM ct_tbl_action
                ORDER by aID DESC limit 1
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getNextTargetID", (req, res) => {
    let sql = `SELECT targetID
        FROM ct_tbl_target
                ORDER by targetID DESC limit 1
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getAffectees/:taID/:round", (req, res) => {
    let taID = req.params.taID;
    let round = req.params.round;
    let sql = `SELECT *
        FROM ct_tbl_condition_affectee
        JOIN ct_tbl_participant ON ct_tbl_condition_affectee.affected_pID = ct_tbl_participant.pID
        WHERE ct_tbl_condition_affectee.taID = ${taID} AND ct_tbl_condition_affectee.start_round <= ${round} AND ct_tbl_condition_affectee.end_round >= ${round}
                ORDER by caID ASC
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get(
    "/submitTargets/:encounter/:round/:tool/:actionString/:pID/:nextTargetID/:hit/:actionCategory/:damage/:notes/:disable_condition/:nextAID/:nextToolID/:target_pID/:targetHP",
    (req, res) => {
        let encounter = req.params.encounter;
        let round = req.params.round;
        let targetHP = req.params.targetHP;
        let toolID = req.params.tool; // may be toolID or descriptive string (e.g. disengage)
        let actionString = req.params.action_type || "";
        actionString = (actionString === "-") ? "" : actionString;
        if (isNaN(parseInt(toolID))) {
            actionString = toolID;
            toolID = "";
        }
        let pID = req.params.pID;
        let nextTargetID = req.params.nextTargetID;
        let nextToolID = req.params.nextToolID;
        let hit = req.params.hit;
        let actionCategory = req.params.actionCategory;
        let damage = req.params.damage;
        let newHP = targetHP - damage;
        if (isNaN(newHP)) {
            newHP = targetHP;
        }
        if (newHP <= 0) {
            newHP = 0;
        }
        let notes = req.params.notes;
        let disable_condition = req.params.disable_condition;
        let nextAID = req.params.nextAID;
        let target_pID = req.params.target_pID;

        let sql = `INSERT into ct_tbl_target
        (targetID, eID, round, pID, target_pID, damage, new_hp, temp_hp)
        values ('${nextTargetID}', '${encounter}', '${round}', '${pID}', '${target_pID}', '${damage}', '${newHP}', 0);
    `;
        let query = db.all(sql, (err, results) => {
            if (err) {
                console.log(err);
                throw err;
            }
            res.send(results);
        });
    }
);

app.get(
    "/submitAction/:encounter/:round/:tool/:actionString/:pID/:nextTargetID/:hit/:actionCategory/:damage/:notes/:disable_condition/:nextAID/:nextToolID/:target_pID",
    (req, res) => {
        const encounter = req.params.encounter;
        let round = req.params.round;
        let toolID = req.params.tool; // may be toolID or descriptive string (e.g. disengage)
        let actionString = req.params.action_type == "-"
            ? ""
            : req.params.action_type || "";
        toolID = isNaN(parseInt(toolID)) ? (actionString = toolID, "") : toolID;

        let pID = req.params.pID;
        let nextTargetID = req.params.nextTargetID;

        let hit = req.params.hit;

        let damage = req.params.damage;
        if (hit == "x") {
            hit = 1;
            damage = 0;
        } else if (hit == 0) {
            hit = 0;
            damage = 0;
        } else {
            hit = 1;
        }
        let actionCategory = req.params.actionCategory;
        actionCategory = actionCategory.trim();

        let notes = req.params.notes;
        let disable_condition = req.params.disable_condition;
        let nextAID = req.params.nextAID;
        let target_pID = req.params.target_pID;
        if (actionString != "" && target_pID == "-") {
            nextTargetID = "NULL";
        }

        // build multiple INSERTs if needed

        let target_pIDArray = target_pID.split(" ").map;

        let sql = `INSERT into ct_tbl_action
                    (eID, round, pID, targetID, hit, action_type, action, toolID, notes)
                    values (${encounter}, ${round}, ${pID}, ${nextTargetID}, '${hit}', '${actionCategory}', '${actionString}', '${toolID}', '${notes}');
                `;
        let query = db.all(sql, (err, results) => {
            if (err) {
                console.log(err);
                throw err;
            }
            res.send({});
        });
    }
);

app.get("/targetsHP/:target_pID", (req, res) => {
    let target_pID = req.params.target_pID;
    let sql = `SELECT *
    FROM ct_tbl_target
    where target_pID = '${target_pID}'
            ORDER by tID DESC limit 1;
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        // console.log(results);
        res.send(results);
    });
});

app.get(
    "/addCondition/:eID/:creator/:taID/:end_pID/:newCpID/:concentration/:holding/:nextAID",
    (req, res) => {
        let eID = req.params.eID;
        let creator = req.params.creator;
        let taID = req.params.taID;
        let end_pID = req.params.end_pID;
        let newCpID = req.params.newCpID;
        let concentration = req.params.concentration;
        let holding = req.params.holding;
        let nextAID = req.params.nextAID;

        let sql = `INSERT into ct_tbl_condition
                (aID, eID, pID, taID, cpID, concentration, holding)
                values ('${nextAID}', '${eID}', '${creator}', '${taID}', '${newCpID}', '${concentration}', '${holding}')
            `;
        let query = db.run(sql, [], (err, results) => {
            if (err) {
                console.log(err);
                throw err;
            }
            res.json({});
        });
    }
);

app.get("/getNextTAID", (req, res) => {
    let sql = `SELECT * FROM ct_tbl_condition_affectee ORDER BY caID DESC limit 1`;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results[0] || { taID: 0 });
    });
});

app.get(
    "/addConditionAffectees/:taID/:startRound/:endRound/:affecteesString/:end_pID",
    (req, res) => {
        let taID = req.params.taID;
        let startRound = req.params.startRound;
        let endRound = req.params.endRound;
        let affecteesString = req.params.affecteesString;
        let affecteesArray = affecteesString.split(", ");
        let end_pID = req.params.end_pID;
        affecteesArray.forEach((affectee) => {
            let sql = `INSERT into ct_tbl_condition_affectee
                (taID, start_round, end_round, affected_pID, end_pID)
                values ('${taID}', '${startRound}', '${endRound}', '${affectee}', '${end_pID}')
            `;
            db.all(sql, [], (err, results) => {
                if (err) {
                    console.log(err);
                    throw err;
                }
            });
        });
        res.json({});
    }
);

app.get("/newConditionPoolItem/:conditionName/:description", (req, res) => {
    let conditionName = req.params.conditionName;
    let description = req.params.description
    let sql = `INSERT into tbl_condition_pool
                (condition_name, description)
                values ('${conditionName}', '${description}')
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/terminate/:targeted_pID/:round", (req, res) => {
    let targeted_pID = req.params.targeted_pID;
    let round = req.params.round;
    let sql = `UPDATE ct_tbl_participant SET dead_round = '${round}'
        where pID = '${targeted_pID}'
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/arrangeParticipantsByInit/:pID/:numeric_value", (req, res) => {
    let pID = req.params.pID;
    let numeric_value = req.params.numeric_value;
    let sql = `UPDATE ct_tbl_participant SET numeric_value = '${numeric_value}'
        where pID = '${pID}'
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getCharacters", (req, res) => {
    const isPC = req.query.isPC; // Assuming the client sends a query parameter 'isPC' with values 1 or 0

    // Validate the parameter
    if (isPC !== '1' && isPC !== '0') {
        return res.status(400).send("Invalid value for 'isPC' parameter");
    }

    const sql = `SELECT * FROM tbl_character WHERE pc = ${isPC} ORDER BY character_name`;

    const query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Internal Server Error");
        }
        res.send(results);
    });
});


app.get("/getDeleteActionData/:aID", (req, res) => {
    let aID = req.params.aID;
    let sql = `SELECT *
    FROM ct_tbl_action
    LEFT JOIN ct_tbl_target ON ct_tbl_action.targetID = ct_tbl_target.targetID
    LEFT JOIN ct_tbl_condition ON ct_tbl_action.aID = ct_tbl_condition.aID
    LEFT JOIN ct_tbl_condition_affectee ON ct_tbl_condition.taID = ct_tbl_condition_affectee.taID
    WHERE ct_tbl_action.aID = ${aID}
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.post('/orderInitiative', (req, res) => {
    let requestData = req.body; // Parsed JSON data from the request body

    // Remove objects where init is an empty string
    requestData = requestData.filter(row => row.init !== '');

    // Process the data and build your SQL query
    const numericValueUpdates = [];
    const initUpdates = [];
    const secondaryInitUpdates = []; // New array for secondary_init updates
    const pIDs = [];

    requestData.forEach((row) => {
        const { pID, numeric_value, init, secondary_init } = row;

        // Check if secondary_init is undefined or empty, and set a default value if needed
        const finalSecondaryInit = secondary_init === undefined || secondary_init.trim() === '' ? '1' : secondary_init;

        numericValueUpdates.push(`WHEN pID = ${pID} THEN '${numeric_value == 0 ? '' : numeric_value}'`);
        initUpdates.push(`WHEN pID = ${pID} THEN '${init}'`);
        secondaryInitUpdates.push(`WHEN pID = ${pID} THEN '${finalSecondaryInit}'`); // Add secondary_init update
        pIDs.push(pID);
    });

    // Generate the SQL query
    const sql = `
      UPDATE ct_tbl_participant
      SET numeric_value = CASE
        ${numericValueUpdates.join('\n')}
        ELSE numeric_value
      END,
      init = CASE
        ${initUpdates.join('\n')}
        ELSE init
      END,
      secondary_init = CASE
        ${secondaryInitUpdates.join('\n')}
        ELSE secondary_init
      END
      WHERE pID IN (${pIDs.join(', ')});
    `;

    // Execute the SQL query and handle the response (you'll need to set up your database connection)
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.json({ message: 'Data updated successfully' });
    });
});

app.post('/removeDuplicateNumericValues', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    // Generate the SQL query with parameters
    const sql = `
      UPDATE ct_tbl_participant
      SET numeric_value = ''
      WHERE pID = '${requestData.pID}'
    `;
  
    // Execute the SQL query with parameters and handle the response
    db.run(sql, [], (err) => {
      if (err) {
        console.log(err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }
      res.json({ message: 'Numeric value deleted successfully' });
    });
  });
  

app.post('/deleteNote', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body

    // Generate the SQL query
    const sql = `
      UPDATE ct_tbl_action
      SET notes = ""
      WHERE aID = ${requestData.aID}
    `;

    // Execute the SQL query and handle the response (you'll need to set up your database connection)
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.json({ message: 'Note deleted successfully' });
    });
});

app.post('/deleteParticipant', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body

    // Generate and execute the first SQL query
    const sql1 = `
      DELETE FROM ct_tbl_participant
      WHERE pID = ? AND eID = ?;
    `;

    db.run(sql1, [requestData.pID, requestData.eID], function (err1) {
        if (err1) {
            console.log(err1);
            throw err1;
        }

        // Generate and execute the second SQL query
        const sql2 = `
          DELETE FROM ct_tbl_encounter
          WHERE pID = ? AND eID = ?;
        `;

        db.run(sql2, [requestData.pID, requestData.eID], function (err2) {
            if (err2) {
                console.log(err2);
                throw err2;
            }
            res.json({ message: 'Participant deleted successfully' });
            
        })
    });
});

app.post('/updateEncounterParticipants', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    // console.log(requestData);
    // Generate the SQL query
    const sql = `
      INSERT INTO ct_tbl_encounter (pID, eID) 
      VALUES (${requestData.pID}, ${requestData.eID})
    `;

    // Execute the SQL query and handle the response (you'll need to set up your database connection)
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.json({ message: 'Record created successfully' });
    });
});

app.post('/addParticipant', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body

    // Prepare the SQL query with placeholders for data
    const sql = `
        INSERT INTO ct_tbl_participant (chID, eID, character_name, ac, starting_hp, numeric_value, init, secondary_init, eID, join_round, dead_round)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;


    const values = [
        requestData.chID,
        requestData.eID,
        requestData.character_name,
        requestData.ac,
        requestData.max_hp,
        requestData.numeric_value,
        1,
        10,
        1,
        1,
        100
    ];
    // Execute the SQL query with the provided values
    db.run(sql, values, (err) => {
        if (err) {
            console.log(err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }
    });




    // Send a response once all queries have been executed
    res.json({ message: 'Participants added successfully' });
});

app.post('/deleteAction', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    // Generate and execute the first SQL query
    const sql1 = `
      DELETE FROM ct_tbl_action
      WHERE aID = ?;
    `;

    db.run(sql1, [requestData.aID], function (err1) {
        if (err1) {
            console.log(err1);
            throw err1;
        }

        // Generate and execute the second SQL query
        const sql2 = `
          DELETE FROM ct_tbl_target
          WHERE targetID = ?;
        `;

        db.run(sql2, [requestData.targetID], function (err2) {
            if (err2) {
                console.log(err2);
                throw err2;
            }

            // Generate and execute the second SQL query
            const sql3 = `
              DELETE FROM ct_tbl_condition
              WHERE conditionID = ?;
            `;

            db.run(sql3, [requestData.conditionID], function (err3) {
                if (err3) {
                    console.log(err3);
                    throw err3;
                }

                // Generate and execute the second SQL query
                const sql4 = `
                  DELETE FROM ct_tbl_condition_affectee
                  WHERE taID = ?;
                `;

                db.run(sql4, [requestData.taID], function (err4) {
                    if (err4) {
                        console.log(err4);
                        throw err4;
                    }

                    res.json({ message: 'Action deleted successfully' });
                });
            })
        })
    });
});



app.post('/deleteActionUpdateTargetHPs', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body

    // Check if requestData is an object
    if (typeof requestData === 'object' && requestData !== null) {
        const keys = Object.keys(requestData);

        // Generate and execute the SQL queries dynamically
        keys.forEach((key) => {
            const nestedObject = requestData[key].object; // Access the nested object
            if (nestedObject.hasOwnProperty('damage') && nestedObject.hasOwnProperty('target_pID') && nestedObject.hasOwnProperty('tID')) {
                const sql = `
                    UPDATE ct_tbl_target
                    SET new_hp = new_hp + ?
                    WHERE target_pID = ? AND tID > ?
`;
                // Assuming nestedObject.damage, nestedObject.target_pID, and nestedObject.tID are the correct properties in your objects
                db.all(sql, [nestedObject.damage, nestedObject.target_pID, nestedObject.tID], (err, results) => {
                    // Rest of the code
                });

            }
        });
        res.json({ message: 'Targets updated successfully' });
    } else {
        res.status(400).json({ message: 'Invalid request data' });
    }
});

app.get("/chidCheck/:chID/", (req, res) => {
    let chID = req.params.chID;
    let sql = `SELECT * FROM ct_tbl_participant
        where chID = '${chID}' ORDER BY pID DESC limit 1;
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getLatestParticipant/", (req, res) => {
    let sql = `SELECT * FROM ct_tbl_participant
        ORDER BY pID DESC limit 1;
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/revive/:targeted_pID/", (req, res) => {
    let targeted_pID = req.params.targeted_pID;
    let round = req.params.round;
    let sql = `UPDATE ct_tbl_participant SET dead_round = '100'
        where pID = '${targeted_pID}'
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/endConditions/:pID/:round/:taID", (req, res) => {
    let pID = req.params.pID;
    let round = req.params.round;
    let taID = req.params.taID;
    let sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${pID}'
        where affected_pID = '${pID}' AND taID = '${taID}'
            `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/endCondition/:conditionID/:affecteeID/:round/:conditionState/:taid", (req, res) => {
    let conditionID = req.params.conditionID;
    let round = req.params.round;
    let affecteeID = req.params.affecteeID;
    let conditionState = req.params.conditionState;
    let taid = req.params.taid;
    let sql;

    if (conditionState == "affected") {
        sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${affecteeID}'
        where affected_pID = '${affecteeID}' AND taID = '${taid}'            `;
    } else {
        sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${affecteeID}'
        where taID = '${taid}'
            `;
    }
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send({});
    });
});

app.get("/disableCondition/:cpID/:round/:affected_pID/:pID", (req, res) => {
    let cpID = req.params.cpID;
    let round = req.params.round;
    let affected_pID = req.params.affected_pID;
    let pID = req.params.pID
    let sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${pID}' WHERE taID IN (select taID from ct_tbl_condition where ct_tbl_condition.taID = '${cpID}') AND affected_pID = '${affected_pID}'`;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/actions/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT * 
        FROM ct_tbl_action
                WHERE eID = ${encounter} ORDER BY round, aID;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/actionsConditions/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT * 
        FROM ct_tbl_condition
        LEFT JOIN ct_tbl_condition_affectee ON ct_tbl_condition.taID = ct_tbl_condition_affectee.taID
                WHERE eID = ${encounter};
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/tool/:toolID/", (req, res) => {
    let toolID = req.params.toolID;
    let sql = `SELECT *
        FROM tbl_tool
                WHERE toolID = "${toolID}"
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/participantTools/:chID/", (req, res) => {
    let chID = req.params.chID;
    let sql = `SELECT *
        FROM tbl_tool
                WHERE chID = "${chID}"
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/conditionsInEffect/:eID/:round", (req, res) => {
    let eID = req.params.eID;
    let round = req.params.round;
    let sql = `SELECT *
        FROM ct_tbl_condition
        LEFT JOIN tbl_condition_pool ON ct_tbl_condition.cpID = tbl_condition_pool.cpID
        LEFT JOIN ct_tbl_condition_affectee ON ct_tbl_condition.taID = ct_tbl_condition_affectee.taID
                WHERE ct_tbl_condition.eID = "${eID}" AND ct_tbl_condition_affectee.start_round <= ${round} AND ct_tbl_condition_affectee.end_round >= ${round}
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/anyoneStillAffected/:conditionID/:round", (req, res) => {
    let conditionID = req.params.conditionID;
    let round = req.params.round
    let sql = `SELECT *
        FROM ct_tbl_condition
        JOIN ct_tbl_condition_affectee ON ct_tbl_condition.taID = ct_tbl_condition_affectee.taID
        JOIN ct_tbl_participant ON ct_tbl_condition.pID = ct_tbl_participant.pID
                WHERE ct_tbl_condition.conditionID = ${conditionID} AND ct_tbl_condition_affectee.end_round >= ${round}
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getConditionsForCtApp/:eID/", (req, res) => {
    let eID = req.params.eID;
    let sql = `SELECT *
        FROM ct_tbl_condition
        LEFT JOIN tbl_condition_pool ON ct_tbl_condition.cpID = tbl_condition_pool.cpID
        LEFT JOIN ct_tbl_condition_affectee ON ct_tbl_condition.taID = ct_tbl_condition_affectee.taID
                WHERE eID = "${eID}"
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/getNextcpID/", (req, res) => {
    let sql = `SELECT *
        FROM tbl_condition_pool
        ORDER BY cpID DESC limit 1
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/target/:targetID/", (req, res) => {
    let targetID = req.params.targetID;
    let sql = `SELECT *
        FROM ct_tbl_target
                WHERE targetID = "${targetID}" ORDER BY round
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/targets/:targetID/", (req, res) => {
    let targetID = req.params.targetID;
    if (targetID != 0) {
        let sql = `SELECT *
        FROM ct_tbl_target
        JOIN ct_tbl_participant ON ct_tbl_target.target_pID = ct_tbl_participant.pID
                WHERE targetID = "${targetID}" ORDER BY numeric_value, round, pID
                `;
        let query = db.all(sql, [], (err, results) => {
            if (err) {
                console.log(err);
                throw err;
            }
            res.send(results);
        });
    } else {
        res.send([null]);
    }
});

app.listen(3000, console.log("App Listening to port 3000"));

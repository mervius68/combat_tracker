let express = require("express");
const sqlite3 = require("sqlite3").verbose();
const fs = require("fs");
const path = require("path");
const app = express();

const databaseFolder = "databases"; // Name of the folder

// Get the full path to the folder
const folderPath = path.join(__dirname, databaseFolder);

// Read the contents of database.txt in the folder
let databaseName = fs.readFileSync(path.join(folderPath, "database.txt"), "utf8").trim();
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

// ------------------------------------------------------------- session timing
// When a combat kicked off, and when it was last worked on.
//
// The start is not stored as a value of its own: it is the earliest timestamp
// among the encounter's actions. Delete every action and open the fight again on
// another day and the start moves with the new first action, because nothing of
// the old one is left to read. Nothing has to notice the reset and clear it.
//
// "Last updated" cannot be derived that way - deleting the newest action would
// send it backwards - so it is recorded per encounter in ct_tbl_encounter_time.
//
// Both are kept up to date by triggers rather than by the routes below, so an
// encounter is stamped whichever route changed it, including the ones that write
// to a table without knowing which encounter it belongs to.
//
// This runs against databases that already have encounters in them: the column
// and the table are added only if they are missing, and actions recorded before
// any of this existed keep a NULL timestamp, which the page reports as unknown
// rather than guessing a date for.

// UTC, so the stored value means the same thing wherever it is read. The page
// renders it in the reader's local time.
const NOW_UTC = `strftime('%Y-%m-%dT%H:%M:%SZ', 'now')`;

// The tables a combat record is made of. A write to any of them is a change to
// the encounter it belongs to. Each entry says how to get from the row being
// written (NEW or OLD) to its eID.
const COMBAT_TABLES = [
    { table: "ct_tbl_action", encounterOf: (row) => `${row}.eID` },
    { table: "ct_tbl_target", encounterOf: (row) => `${row}.eID` },
    { table: "ct_tbl_condition", encounterOf: (row) => `${row}.eID` },
    { table: "ct_tbl_participant", encounterOf: (row) => `${row}.eID` },
    // an affectee carries no eID of its own; it hangs off the condition it belongs to
    {
        table: "ct_tbl_condition_affectee",
        encounterOf: (row) => `(SELECT eID FROM ct_tbl_condition WHERE taID = ${row}.taID LIMIT 1)`,
    },
];

// The triggers name the column and the table they write to, so both have to be
// in place before any of them is created - hence the steps run one after the
// other rather than all at once.
function prepareSessionTiming() {
    db.all(`PRAGMA table_info(ct_tbl_action)`, [], (err, columns) => {
        if (err) return console.error(err.message);

        const alreadyStamped = columns.some((column) => column.name === "created");
        addTimingTable(alreadyStamped ? null : `ALTER TABLE ct_tbl_action ADD COLUMN created TEXT`);
    });
}

function addTimingTable(alterSql) {
    const next = () => {
        db.run(
            `CREATE TABLE IF NOT EXISTS ct_tbl_encounter_time (
                "eID"       INTEGER,
                "updated"   TEXT,
                PRIMARY KEY("eID")
            )`,
            (err) => {
                if (err) return console.error(err.message);
                createTimingTriggers();
            }
        );
    };

    if (!alterSql) return next();
    db.run(alterSql, (err) => {
        if (err) return console.error(err.message);
        next();
    });
}

function createTimingTriggers() {
    // The action's own timestamp, written once when it is first recorded. Doing
    // it here rather than in the INSERT means an action is dated no matter how it
    // was added, and an action that already carries a date - one copied in from
    // elsewhere - keeps it.
    const statements = [
        `CREATE TRIGGER IF NOT EXISTS ct_stamp_action_created
         AFTER INSERT ON ct_tbl_action
         WHEN NEW.created IS NULL
         BEGIN
             UPDATE ct_tbl_action SET created = ${NOW_UTC} WHERE aID = NEW.aID;
         END;`,
    ];

    // One touch trigger per table per kind of write. A delete reads the eID off
    // the row that is going away; everything else off the row being written. The
    // guard skips affectees whose condition has already gone, which have no
    // encounter left to stamp.
    COMBAT_TABLES.forEach(({ table, encounterOf }) => {
        [
            { event: "INSERT", row: "NEW" },
            { event: "UPDATE", row: "NEW" },
            { event: "DELETE", row: "OLD" },
        ].forEach(({ event, row }) => {
            const eID = encounterOf(row);
            statements.push(
                `CREATE TRIGGER IF NOT EXISTS ct_touch_${table}_${event.toLowerCase()}
                 AFTER ${event} ON ${table}
                 WHEN ${eID} IS NOT NULL
                 BEGIN
                     INSERT INTO ct_tbl_encounter_time (eID, updated)
                     VALUES (${eID}, ${NOW_UTC})
                     ON CONFLICT(eID) DO UPDATE SET updated = ${NOW_UTC};
                 END;`
            );
        });
    });

    db.serialize(() => {
        statements.forEach((sql) => {
            db.run(sql, (err) => {
                if (err) console.error(err.message);
            });
        });
    });
}

prepareSessionTiming();

// --------------------------------------------------------- once-per-day tools
// A tool marked once-per-day is spent for the rest of the combat as soon as the
// participant uses it: the action modals gray it out and put it out of reach.
//
// Nothing records that it has been spent. It is read off the actions already
// recorded for that participant in that encounter, so no state has to be cleared
// when a combat ends, and deleting the action that spent the tool gives it back.
//
// The column is added if it is missing rather than assumed, so a database written
// before any of this existed still opens. Existing tools read 0 - available - so
// nothing becomes once-per-day by surprise.
function prepareOncePerDayTools() {
    db.all(`PRAGMA table_info(tbl_tool)`, [], (err, columns) => {
        if (err) return console.error(err.message);
        if (columns.some((column) => column.name === "once_per_day")) return;
        db.run(
            `ALTER TABLE tbl_tool ADD COLUMN once_per_day INTEGER DEFAULT 0`,
            (err) => {
                if (err) console.error(err.message);
            }
        );
    });
}

prepareOncePerDayTools();

// app.use("/submitUpdateAction.js", function(req, res, next) {
//   res.type("application/javascript");
//   next();
// });

app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");




// This pulls index.ejs to the root folder location of the site.
app.get("/", function (req, res) {
    res.render("index");
});

app.get("/selected_encounter/:eID", (req, res) => {
    
    const eID = req.params.eID;
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

// When this combat kicked off and when it was last worked on - see the session
// timing block above. Both come back as UTC timestamps, or null where there is
// nothing to report: an encounter nobody has acted in yet has no start, and one
// last touched before any of this was recorded has no last update.
app.get("/encounterTiming/:encounter", (req, res) => {
    const encounter = req.params.encounter;
    let sql = `SELECT
                (SELECT MIN(created) FROM ct_tbl_action WHERE eID = ?) AS started,
                (SELECT MAX(created) FROM ct_tbl_action WHERE eID = ?) AS lastAction,
                (SELECT updated FROM ct_tbl_encounter_time WHERE eID = ?) AS touched,
                (SELECT COUNT(*) FROM ct_tbl_action WHERE eID = ?) AS actions
    `;
    let query = db.get(sql, [encounter, encounter, encounter, encounter], (err, row) => {
        if (err) {
            console.log(err);
            throw err;
        }
        // The later of the two: a deletion is only recorded against the encounter,
        // and an action added straight into the database only against the action.
        // Both are the same sortable UTC format.
        const updated = [row?.lastAction, row?.touched].filter(Boolean).sort().pop() || null;
        res.send({
            started: row?.started || null,
            updated,
            // told apart from "started before this was recorded", which has
            // actions but no date to show for them
            actions: row?.actions || 0,
        });
    });
});

app.get("/updatedNames/:pID", (req, res) => {
    const pID = req.params.pID;
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

app.get("/participants/:encounter", (req, res) => {
    let encounter = req.params.encounter;
    let sql = `SELECT *
    FROM ct_tbl_participant
    JOIN tbl_character ON ct_tbl_participant.chID = tbl_character.chID
    JOIN ct_tbl_encounter ON ct_tbl_participant.pID = ct_tbl_encounter.pID
    WHERE ct_tbl_encounter.eID = ${encounter}
    ORDER BY init DESC, secondary_init DESC, init_modifier DESC, character_name, numeric_value ASC;
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
    let sql = `SELECT 
                ct_tbl_target.round AS result_round,
                *
                FROM ct_tbl_target
                LEFT JOIN ct_tbl_action ON ct_tbl_target.targetID = ct_tbl_action.targetID
                WHERE ct_tbl_target.eID = ${encounter} ORDER BY targetID, tID;
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
        (targetID, eID, round, pID, target_pID, damage, new_hp)
        values ('${nextTargetID}', '${encounter}', '${round}', '${pID}', '${target_pID}', '${damage}', '${newHP}');
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
        let actionString = req.params.actionString == "-"
            ? ""
            : req.params.actionString || "";
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

// The highest taID anything is using, so the next condition can be given one past it.
// The newest affectee row is not that: editing a condition deletes its affectee rows
// and inserts them again at the top of the table, so the largest caID regularly belongs
// to an old condition with a low taID. Reading the taID off that row handed new
// conditions a taID an older condition already held, and the two then shared each
// other's affectees - which is how a Ready put an "H" on a second participant.
// A condition whose affectee rows have all been removed still holds its taID, so both
// tables are considered.
app.get("/getNextTAID", (req, res) => {
    let sql = `SELECT MAX(taID) AS taID FROM (
            SELECT taID FROM ct_tbl_condition_affectee
            UNION ALL
            SELECT taID FROM ct_tbl_condition
        )`;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send({ taID: results[0]?.taID || 0 });
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
        const finalSecondaryInit = secondary_init === undefined || String(secondary_init).trim() === '' ? '10' : secondary_init;

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

app.post('/adjustInit', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    // Generate the SQL query with parameters
    const sql = `
      UPDATE ct_tbl_participant
      SET init = '${requestData.init}',
      secondary_init = '${requestData.secondary_init}'
      WHERE pID = '${requestData.pID}'
    `;

    // Execute the SQL query with parameters and handle the response
    db.run(sql, [], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'Initiative updated successfully' });
    });
});

// Renames one participant in one encounter. tbl_character, the pool the
// participant was drawn from, is left alone: the same goblin can be a different
// creature in the next fight.
app.post('/renameParticipant', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    const characterName = String(requestData.character_name ?? "").trim();
    if (!characterName) {
        return res.status(400).json({ error: 'A character needs a name' });
    }

    // The name that comes back is whatever the tracker was showing, number and
    // all, so the number now lives in the name. Clearing numeric_value stops the
    // older scheme adding a second one - see participantNames.js.
    const sql = `
      UPDATE ct_tbl_participant
      SET character_name = ?,
          numeric_value = ''
      WHERE pID = ?
    `;

    // Bound rather than interpolated: a name is free text, and plenty of them
    // have an apostrophe in.
    db.run(sql, [characterName, requestData.pID], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'Character renamed successfully' });
    });
});

app.post('/submitStartingHP', (req, res) => {
    const requestData = req.body; // Parsed JSON data from the request body
    // Generate the SQL query with parameters
    const sql = `
      UPDATE ct_tbl_participant
      SET starting_hp = '${requestData.starting_hp}'
      WHERE pID = '${requestData.pID}'
    `;

    // Execute the SQL query with parameters and handle the response
    db.run(sql, [], (err) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
        res.json({ message: 'Starting HP updated successfully' });
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

// Wrap db.run in a Promise to make it work with async/await
function runDbQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

app.post("/updateActionDB", async (req, res) => {
    const requestData = req.body;
    console.log("this: ", requestData);
    console.log("and: ", requestData.ct_tbl_target.delete)
    try {
        await runDbQuery("BEGIN TRANSACTION;");
        const affectedTargetPids = new Set();
        const encounterEID = await resolveEncounterEID(requestData);

        // Update Action
        if (requestData.ct_tbl_action && requestData.ct_tbl_action.update) {
            await updateAction(requestData);
        }

        // Update Targets
        for (const obj of requestData.ct_tbl_target.update) {
            let latestHP = await selectRecentHP(obj);
            obj.latestHP = latestHP || obj.maxHP;
            await updateTarget(obj);
            // await updateHPCascade(obj);
            if (obj.target_pID != null) {
                affectedTargetPids.add(Number(obj.target_pID));
            }
        }

        // Delete Targets
        for (const obj of requestData.ct_tbl_target.delete) {
            await deleteTarget(obj);
            if (obj.target_pID != null) {
                affectedTargetPids.add(Number(obj.target_pID));
            }
        }

        // Insert Targets
        for (const obj of requestData.ct_tbl_target.insert) {
            await insertTarget(obj);
            if (obj.target_pID != null) {
                affectedTargetPids.add(Number(obj.target_pID));
            }
        }

        for (const targetPID of affectedTargetPids) {
            if (encounterEID != null) {
                await recalculateTargetHPTimeline(encounterEID, targetPID);
            }
        }

        // Delete from ct_tbl_condition
        if (requestData.ct_tbl_condition && requestData.ct_tbl_condition.delete && requestData.ct_tbl_condition.delete.aID) {
            await deleteFromTable('ct_tbl_condition', 'aID', requestData.ct_tbl_condition.delete.aID);
        }

        // Delete from ct_tbl_condition_affectee
        if (requestData.ct_tbl_condition_affectee && requestData.ct_tbl_condition_affectee.delete && requestData.ct_tbl_condition_affectee.delete.taID) {
            await deleteFromTable('ct_tbl_condition_affectee', 'taID', requestData.ct_tbl_condition_affectee.delete.taID);
        }

        await runDbQuery("COMMIT;");
        res.json({ message: 'Action updated successfully' });
    } catch (error) {
        await runDbQuery("ROLLBACK;");
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

async function updateHPCascade(obj) {
    const diff = parseInt(obj.damage) - parseInt(obj.originalDamage)
    const sql = `
        UPDATE ct_tbl_target
        SET new_hp = CASE 
            WHEN new_hp - ? <= 0 THEN 0 
            ELSE new_hp - ?
            END
        WHERE tID IN (
            select tID from ct_tbl_action 
            left join ct_tbl_target on ct_tbl_action.targetID = ct_tbl_target.targetID 
            where aID > ? 
            and ct_tbl_target.target_pID = ?
        )
            AND target_pID = ?
            AND eID = ?
    `
    await runQuery(sql, [
        diff,
        diff,
        obj.aID,
        // obj.targetID,
        obj.pID,
        obj.pID,
        obj.eID,
    ])
    console.log(sql)
}

function selectRecentHP(obj) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT new_hp FROM ct_tbl_target 
            WHERE tID < ? 
                AND eID = ?
                AND target_pID = ?
            ORDER BY tID DESC
            LIMIT 1
        `;
        // Assuming 'db' is your SQLite database connection
        db.get(sql, [
            obj.tID,
            obj.eID,
            obj.pID
        ], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row ? row.new_hp : null);
            }
        });
    });
}



async function updateAction(requestData) {
    const sql = `
        UPDATE ct_tbl_action 
        SET action_type = ?,
            action = ?,
            toolID = ?,
            hit = ?,
            notes = ?
        WHERE aID = ?
    `;

    await runQuery(sql, [
        requestData.ct_tbl_action.update.action_type,
        requestData.ct_tbl_action.update.action,
        requestData.ct_tbl_action.update.toolID,
        requestData.ct_tbl_action.update.hit,
        requestData.ct_tbl_action.update.notes,
        requestData.ct_tbl_action.update.aID
    ]);
}

async function updateTarget(target) {
    // let newHP = parseInt(target.latestHP) - parseInt(target.damage)
    // newHP = newHP < 0 ? 0 : newHP;
    const sql = `
        UPDATE ct_tbl_target
        SET damage = ?,
            new_hp = ?
        WHERE tID = ?
    `
    await runQuery(sql, [
        target.damage,
        target.newHP,
        target.tID
    ])
}

async function deleteTarget(target) {
    const sql = `
        DELETE FROM ct_tbl_target
        WHERE tID = ?
    `
    await runQuery(sql, [
        target.tID,
    ])
}

async function insertTarget(target) {
    const sql = `
        INSERT into ct_tbl_target
        (tID, targetID, eID, round, pID, target_pID, damage, new_hp) VALUES (?,?,?,?,?,?,?,?);
    `
    await runQuery(sql, [
        target.tID,
        target.targetID,
        target.eID,
        target.round,
        target.pID,
        target.target_pID,
        target.damage,
        target.newHP
    ])
}

async function recalculateTargetHPTimeline(eID, targetPID) {
    const startingHP = await new Promise((resolve, reject) => {
        const sql = `
            SELECT starting_hp
            FROM ct_tbl_participant
            WHERE pID = ?
            LIMIT 1
        `;
        db.get(sql, [targetPID], (err, row) => {
            if (err) reject(err);
            else resolve(row ? Number(row.starting_hp) : null);
        });
    });

    if (startingHP == null || Number.isNaN(startingHP)) {
        return;
    }

    const timeline = await new Promise((resolve, reject) => {
        const sql = `
            SELECT tID, damage
            FROM ct_tbl_target
            WHERE eID = ?
              AND target_pID = ?
            ORDER BY tID ASC
        `;
        db.all(sql, [eID, targetPID], (err, rows) => {
            if (err) reject(err);
            else resolve(rows || []);
        });
    });

    let hp = startingHP;
    for (const row of timeline) {
        const damage = Number(row.damage) || 0;
        hp = Math.max(hp - damage, 0);
        await runQuery(
            `
                UPDATE ct_tbl_target
                SET new_hp = ?
                WHERE tID = ?
            `,
            [hp, row.tID]
        );
    }
}

async function resolveEncounterEID(requestData) {
    const updateRows = Array.isArray(requestData?.ct_tbl_target?.update)
        ? requestData.ct_tbl_target.update
        : [];
    const insertRows = Array.isArray(requestData?.ct_tbl_target?.insert)
        ? requestData.ct_tbl_target.insert
        : [];
    const deleteRows = Array.isArray(requestData?.ct_tbl_target?.delete)
        ? requestData.ct_tbl_target.delete
        : [];

    const allRows = [...updateRows, ...insertRows, ...deleteRows];
    const payloadEID = allRows.find((row) => row?.eID != null)?.eID;
    if (payloadEID != null && !Number.isNaN(Number(payloadEID))) {
        return Number(payloadEID);
    }

    const actionAID = requestData?.ct_tbl_action?.update?.aID;
    if (actionAID == null || Number.isNaN(Number(actionAID))) {
        return null;
    }

    return await new Promise((resolve, reject) => {
        const sql = `
            SELECT eID
            FROM ct_tbl_action
            WHERE aID = ?
            LIMIT 1
        `;
        db.get(sql, [Number(actionAID)], (err, row) => {
            if (err) reject(err);
            else resolve(row ? Number(row.eID) : null);
        });
    });
}

async function deleteFromTable(table, conditionColumn, conditionValue) {
    const sql = `DELETE FROM ${table} WHERE ${conditionColumn} = ?;`;
    await runQuery(sql, [conditionValue]);
}


async function runQuery(sql, params) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

async function getRow(sql, params) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}


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



app.get("/getLatestParticipant/", (req, res) => {
    let sql = `SELECT pID FROM ct_tbl_participant
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

// The conditions on a participant end when the participant does. The one caller -
// submitAction, when a target's hit points reach zero - names the participant and
// the round and no single condition, so :taID is optional: without it every
// condition still running on them ends. It used to be required, so that call
// matched no route at all and came back a 404 that nothing looked at, and a
// creature that dropped kept every condition it was under.
app.get("/endConditions/:pID/:round/:taID?", (req, res) => {
    let pID = req.params.pID;
    let round = req.params.round;
    let taID = req.params.taID;
    // Only what is actually running this round: without this, ending them all would
    // push conditions that finished rounds ago forward to this one, and stamp ones
    // that have not started yet with an end before their start.
    let whichConditions = taID
        ? `taID = '${taID}'`
        : `start_round <= '${round}' AND end_round >= '${round}'`;
    let sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${pID}'
        where affected_pID = '${pID}' AND ${whichConditions}
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

app.post("/deleteCondition", (req, res) => {
    const requestData = req.body || {}; // Parsed JSON data from the request body
    let taid = requestData.taid;
    // No condition named means a caller that has lost track of which one it meant.
    // This used to go through as DELETE WHERE taID = 'undefined', which matches
    // nothing and reports success, so the click that asked for it looked ignored.
    if (taid == null || taid === "" || isNaN(parseInt(taid))) {
        return res.status(400).json({ error: "no condition was named to delete" });
    }
    let sql1 = `DELETE FROM ct_tbl_condition WHERE taID = '${taid}'`;
    let sql2 = `DELETE FROM ct_tbl_condition_affectee WHERE taID = '${taid}'`;
    db.serialize(() => {
        db.run(sql1, (err1) => {
            if (err1) {
                console.log(err1);
                throw err1;
            }

            db.run(sql2, (err2) => {
                if (err2) {
                    console.log(err2);
                    throw err2;
                }

                res.send({});
            });
        });
    });
});


// Editing a condition that is already recorded. Everything about it is rewritten in
// place under the same taID, so the action that caused it, and the marker's place in
// the grid, stay as they were: only what the modal was showing changes.
//
// The affectees are replaced wholesale rather than compared one by one. Ticking and
// unticking participants is the whole point of the edit, and every affectee row of a
// condition carries the same rounds and the same ending turn, so there is nothing in
// the old rows worth keeping.
app.post("/updateCondition", async (req, res) => {
    const requestData = req.body || {};
    const taid = Number(requestData.taid);
    const affectees = (Array.isArray(requestData.affectees) ? requestData.affectees : [])
        .filter((affectee) => affectee !== "" && affectee != null);

    if (!taid) {
        return res.status(400).json({ error: "no condition was named to edit" });
    }
    // A condition with nobody under it would still be drawn on its causer's row but
    // could never be found again to edit or end, so it is refused here as well as in
    // the modal.
    if (affectees.length === 0) {
        return res.status(400).json({ error: "a condition needs at least one affectee" });
    }

    const description = String(requestData.description ?? "");
    // The pool's short name is the head of the description, the same as when a
    // condition is first recorded.
    const conditionName = description.substring(0, 15);

    try {
        const condition = await getRow(
            `SELECT conditionID, cpID FROM ct_tbl_condition WHERE taID = ? LIMIT 1`,
            [taid]
        );
        if (!condition) {
            return res.status(404).json({ error: `no condition with taID ${taid}` });
        }

        // The description lives in tbl_condition_pool, and a condition is given a
        // pool row of its own when it is recorded, so normally the row is rewritten.
        // Should some older condition be sharing it, this one is moved to a new row
        // instead, rather than rewriting the other condition's text along with it.
        const shared = await getRow(
            `SELECT COUNT(*) AS uses FROM ct_tbl_condition WHERE cpID = ?`,
            [condition.cpID]
        );
        if (condition.cpID != null && (shared?.uses || 0) <= 1) {
            await runQuery(
                `UPDATE tbl_condition_pool SET condition_name = ?, description = ? WHERE cpID = ?`,
                [conditionName, description, condition.cpID]
            );
        } else {
            const pooled = await runQuery(
                `INSERT INTO tbl_condition_pool (condition_name, description) values (?, ?)`,
                [conditionName, description]
            );
            await runQuery(`UPDATE ct_tbl_condition SET cpID = ? WHERE taID = ?`, [
                pooled.lastID,
                taid,
            ]);
        }

        await runQuery(
            `UPDATE ct_tbl_condition SET pID = ?, concentration = ?, holding = ? WHERE taID = ?`,
            [requestData.causerPID, requestData.concentration, requestData.holding, taid]
        );

        await runQuery(`DELETE FROM ct_tbl_condition_affectee WHERE taID = ?`, [taid]);
        for (const affectee of affectees) {
            await runQuery(
                `INSERT INTO ct_tbl_condition_affectee
                    (taID, start_round, end_round, affected_pID, end_pID)
                    values (?, ?, ?, ?, ?)`,
                [
                    taid,
                    requestData.startRound,
                    requestData.endRound,
                    affectee,
                    requestData.endPID,
                ]
            );
        }

        res.json({});
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: err.message });
    }
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
    let sql = `SELECT 
    ct_tbl_action.aID AS result_aID,
    ct_tbl_action.eID AS result_eID,
    ct_tbl_action.pID AS result_pID,
    *
        FROM ct_tbl_action
        LEFT JOIN tbl_tool ON tbl_tool.toolID = ct_tbl_action.toolID
        LEFT JOIN ct_tbl_condition ON ct_tbl_condition.aID = ct_tbl_action.aID
        WHERE ct_tbl_action.eID = ${encounter} ;
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
                ORDER BY toolName ASC
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
                ORDER BY toolName ASC
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`App Listening to port ${port}`);
});

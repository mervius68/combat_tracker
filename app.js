const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
let ctApp;

const db = new sqlite3.Database(
    "./combat.db",
    sqlite3.OPEN_READWRITE,
    (err) => {
        if (err) return console.error(err.message);
    }
);

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
        // console.log(results)
        res.send(results);
    });
});

app.get("/encounters/", (req, res) => {
    let sql = `SELECT *
                FROM tbl_encounter
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        res.send(results);
    });
});

app.get("/latest_eID/", (req, res) => {
    let sql = `SELECT *
                FROM tbl_encounter
                ORDER BY eID DESC limit 1
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
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
                WHERE ct_tbl_participant.eID = ${encounter} ORDER BY init DESC, character_name, numeric_value ASC;
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

app.get("/hitPointsByParticipant/:encounter/:pID", (req, res) => {
    let encounter = req.params.encounter;
    let pID = req.params.pID;
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
        if (actionString == "-") {
            actionString = "";
        }
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

        // if target
        let query = db.all(sql, (err, results) => {
            if (err) {
                console.log(err);
                throw err;
            }
            // console.log(sql);
            res.send(results);
        });
    }
);

app.get(
    "/submitAction/:encounter/:round/:tool/:actionString/:pID/:nextTargetID/:hit/:actionCategory/:damage/:notes/:disable_condition/:nextAID/:nextToolID/:target_pID",
    (req, res) => {
        let encounter = req.params.encounter;
        let round = req.params.round;
        let toolID = req.params.tool; // may be toolID or descriptive string (e.g. disengage)
        let actionString = req.params.action_type || "";
        if (actionString == "-") {
            actionString = "";
        }
        if (isNaN(parseInt(toolID))) {
            actionString = toolID;
            toolID = "";
        }
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
        let nextToolID = req.params.nextToolID;

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
            // console.log(sql);
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
    "/addCondition/:eID/:creator/:taID/:end_pID/:newCpID/:concentration",
    (req, res) => {
        let eID = req.params.eID;
        let creator = req.params.creator;
        let taID = req.params.taID;
        let end_pID = req.params.end_pID;
        let newCpID = req.params.newCpID;
        let concentration = req.params.concentration;

        let sql = `INSERT into ct_tbl_condition
                (eID, pID, taID, cpID, concentration)
                values ('${eID}', '${creator}', '${taID}', '${newCpID}', '${concentration}')
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
        res.send(results);
    });
});

app.get("/endConditions/:pID/:round/:taID", (req, res) => {
    console.log("hiya!")
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
        // console.log(results);
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
    // console.log(sql);
    // console.log(round);
    // console.log(affecteeID);
    // console.log(conditionState);
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        // console.log(results);
        res.send({});
    });
});

app.get("/disableCondition/:cpID/:round/:affected_pID/:pID", (req, res) => {
    let cpID = req.params.cpID;
    console.log("cpID: " + cpID)
    let round = req.params.round;
    let affected_pID = req.params.affected_pID;
    let pID = req.params.pID
    let sql = `UPDATE ct_tbl_condition_affectee SET end_round = '${round}', end_pID = '${pID}' WHERE taID IN (select taID from ct_tbl_condition where ct_tbl_condition.taID = '${cpID}') AND affected_pID = '${affected_pID}'`;
    console.log(sql);
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        res.send(results);
    });
});

app.get("/participantActions/:encounter/:round", (req, res) => {
    let encounter = req.params.encounter;
    let round = req.params.round;
    let sql = `SELECT *
                FROM ct_tbl_action
                WHERE eID = "${encounter}" AND rID = "${round}" ORDER BY rID, pID;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        // console.log("results: " + results[0].hp);
        res.send(results);
    });
});

app.get("/hitPoints/:encounter/:round", (req, res) => {
    let encounter = req.params.encounter;
    let round = req.params.round;
    let sql = `SELECT *
                FROM ct_tbl_hp
                WHERE eID = "${encounter}" AND rID = "${round}" ORDER BY rID, pID;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        // console.log("results: " + results[0].hp);
        res.send(results);
    });
});

app.get("/turns/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_encounter
                     JOIN ct_tbl_round       ON ct_tbl_round.eID       = ct_tbl_encounter.eID
                LEFT JOIN ct_tbl_turn        ON ct_tbl_round.rID       = ct_tbl_turn.rID 
                LEFT JOIN ct_tbl_action      ON ct_tbl_action.targetID      = ct_tbl_turn.targetID
                     JOIN ct_tbl_participant ON ct_tbl_turn.pID        = ct_tbl_participant.pID
                    LEFT JOIN ct_tbl_tool        ON ct_tbl_action.toolID   = ct_tbl_tool.toolID
                    
                WHERE ct_tbl_encounter.eID = 1 ORDER BY aID ASC;
    `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
        // console.log(results);
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
            // console.log(results);
            res.send(results);
        });
    } else {
        res.send([null]);
    }
});

app.listen(3000, console.log("App Listening to port 3000"));

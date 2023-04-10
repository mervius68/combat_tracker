const express = require("express");

const sqlite3 = require("sqlite3").verbose();

const app = express();
let ctApp;

const db = new sqlite3.Database(
    "./combat2.db",
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

app.get("/current_encounter/", (req, res) => {
    let sql = `SELECT *
                FROM tbl_encounter
                WHERE eID = 1;
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
                WHERE eID = ${encounter} ORDER BY init DESC, numeric_value ASC;
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










app.get("/participantActions/:encounter/:round", (req, res) => {
    let encounter = req.params.encounter
    let round = req.params.round
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
    let encounter = req.params.encounter
    let round = req.params.round
    let sql = `SELECT *
                FROM ct_tbl_hp
                WHERE eID = "${encounter}" AND rID = "${round}" ORDER BY rID, pID;
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        console.log("results: " + results[0].hp);
        res.send(results);
    });
});

app.get("/turns/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_encounter
                     JOIN ct_tbl_round       ON ct_tbl_round.eID       = ct_tbl_encounter.eID
                LEFT JOIN ct_tbl_turn        ON ct_tbl_round.rID       = ct_tbl_turn.rID 
                LEFT JOIN ct_tbl_action      ON ct_tbl_action.tID      = ct_tbl_turn.tID
                     JOIN ct_tbl_participant ON ct_tbl_turn.pID        = ct_tbl_participant.pID
                     JOIN ct_tbl_tool        ON ct_tbl_action.toolID   = ct_tbl_tool.toolID
                    
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
    let encounter = req.params.encounter
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

app.get("/tool/:actionID/", (req, res) => {
    let actionID = req.params.actionID
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

app.listen(3000, console.log("App Listening to port 3000"));

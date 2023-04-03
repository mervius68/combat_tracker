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

app.get("/current_encounter/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_campaign
                JOIN ct_tbl_encounter
                ON ct_tbl_campaign.cID = ct_tbl_encounter.cID
                WHERE ct_tbl_campaign.cID = 1;
    `;
    // above explicity join is basically the same as the following IMPLICIT join
    // SELECT * FROM ct_tbl_campaigns, ct_tbl_encounters 
    // where ct_tbl_campaigns.cID = ct_tbl_encounters.cID
    // AND ct_tbl_campaigns.cID = 1

    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        // console.log(results);
        res.send(results);
    });
});

app.get("/participants/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_participant
                JOIN ct_tbl_character ON ct_tbl_participant.chID = ct_tbl_character.chID
                WHERE ct_tbl_participant.eID = "1";
                `;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log(err);
            throw err;
        }
        console.log("results: " + results);
        res.send(results);
    });
});

app.get("/turns/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_encounter
                LEFT JOIN ct_tbl_round       ON ct_tbl_round.eID       = ct_tbl_encounter.eID
                LEFT JOIN ct_tbl_turn        ON ct_tbl_round.rID       = ct_tbl_turn.rID 
                LEFT JOIN ct_tbl_action      ON ct_tbl_turn.tID        = ct_tbl_action.tID
                     JOIN ct_tbl_participant ON ct_tbl_turn.pID        = ct_tbl_participant.pID
                     JOIN ct_tbl_tool        ON ct_tbl_action.toolID   = ct_tbl_tool.toolID
                     JOIN ct_tbl_target      ON ct_tbl_action.targetID = ct_tbl_target.targetID
                WHERE ct_tbl_encounter.eID = 1;
    `;
    // above explicit join is basically the same as the following IMPLICIT join
    // SELECT * FROM ct_tbl_campaigns, ct_tbl_encounters 
    // where ct_tbl_campaigns.cID = ct_tbl_encounters.cID
    // AND ct_tbl_campaigns.cID = 1

    let query = db.all(sql, [], (err, results) => {
        if (err) {
            throw err;
        }
        console.log(results);
        res.send(results);
    });
});

app.listen(3000, console.log("App Listening to port 3000"));

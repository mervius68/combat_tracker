const express = require("express");

const sqlite3 = require("sqlite3").verbose();

const app = express();

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
                FROM ct_tbl_campaigns
                JOIN ct_tbl_encounters
                ON ct_tbl_campaigns.cID = ct_tbl_encounters.cID
                WHERE ct_tbl_campaigns.cID = 1;
    `;
            // above explicity join is basically the same as the following IMPLICIT join
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

app.get("/turns/", (req, res) => {
    let sql = `SELECT *
                FROM ct_tbl_turns
                JOIN ct_tbl_actions ON ct_tbl_turns.actionID = ct_tbl_actions.actionID
                JOIN ct_tbl_participants ON ct_tbl_turns.character = ct_tbl_participants.pID
                JOIN ct_tbl_tools ON ct_tbl_actions.toolID = ct_tbl_tools.toolID
                LEFT JOIN ct_tbl_targets ON ct_tbl_actions.targetID = ct_tbl_targets.targetID
                WHERE ct_tbl_turns.actionID = 1;
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

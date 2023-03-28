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

// app.get("/getEntry/:dateday", (req, res) => {
//     let sql = `SELECT * FROM main where dateID ='${req.params.dateday}'`;
//     let query = db.query(sql, (err, results) => {
//         if (err) {
//             throw err;
//         }
//         if (results.length == 0) {
//             // There is no entry in DB for this date.
//             results = [{ entry: "" }];
//         }
//         res.send(JSON.stringify(results));
//     });
// });

app.listen(3000, console.log("App Listening to port 3000"));

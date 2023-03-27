const express = require("express");

const sqlite3 = require("sqlite3").verbose();

const app = express();



const db = new sqlite3.Database("./combat.db", sqlite3.OPEN_READWRITE, (err) => {
    if (err) return console.error(err.message);
})



app.use(express.static("public"));
app.set("view engine", "ejs");

// This pulls index.ejs to the root folder location of the site.
app.get("/", function (req, res) {
    res.render("index");
});

app.get("/current_encounter/", (req, res) => {
    console.log("tork")
    let sql = `SELECT * FROM ct_tbl_actions`;
    let query = db.all(sql, [], (err, results) => {
        if (err) {
            console.log("yikes")
            throw err;
        }
        console.log(results)
        res.send(results);
    });
})

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


app.listen(3000, console.log('App Listening to port 3000'));
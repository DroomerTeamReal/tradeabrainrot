const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = 3000;

// Database
const db = new sqlite3.Database('./trades.db');
db.serialize(()=>{
    db.run("CREATE TABLE IF NOT EXISTS trades (id INTEGER PRIMARY KEY, title TEXT, offered TEXT, requested TEXT, author TEXT, contact TEXT)");
});

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// API endpoints
app.get('/api/trades', (req,res)=>{
    db.all("SELECT * FROM trades", (err,rows)=>{
        if(err) return res.status(500).json({error:'db'});
        res.json(rows);
    });
});

app.post('/api/trades', (req,res)=>{
    const {title, offered, requested, author, contact} = req.body;
    db.run("INSERT INTO trades(title,offered,requested,author,contact) VALUES(?,?,?,?,?)",
        [title,offered,requested,author,contact],
        function(err){ 
            if(err) return res.status(500).json({error:'db'}); 
            res.json({ok:true,id:this.lastID}); 
        }
    );
});

app.listen(PORT, ()=> console.log('Server running on http://localhost:'+PORT));
require('dotenv').config(); // Load environment variables


/////// app.js

const path = require("node:path");
const { Pool } = require("pg");
const express = require("express");
const session = require("express-session");
const passport = require("passport");
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require("bcryptjs");
const { localsName } = require('ejs');
const assetsPath = path.join(__dirname, "public");

const pool = new Pool({
  // add your configuration
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  database: process.env.PGDATABASE
});

const app = express();
app.use(express.static(assetsPath));
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

app.use(session({ secret: "cats", resave: false, saveUninitialized: false }));
app.use(passport.session());
app.use(express.urlencoded({ extended: false }));
app.get("/", async (req, res) => {
    const {rows:messages  } = await pool.query("SELECT messages.id,messages.message,onlymember.username FROM messages JOIN onlymember ON messages.user_id = onlymember.id")
    
    res.render("index", { user: req.user,message: messages});
  });
  app.use(express.static(assetsPath));

app.get("/sign-up", (req, res) => res.render("sign-up-form"));
app.post(
    "/log-in",
    passport.authenticate("local", {
      successRedirect: "/",
      failureRedirect: "/"
    })
  );
  

  app.post("/sign-up", async (req, res, next) => {
    try {
     const hashedPassword = await bcrypt.hash(req.body.password, 10);
     const imadmin = Boolean(req.body.imadmin);
     await pool.query("insert into onlymember (username, password,firstname,secondname,ismember,isadmin) values ($1, $2,$3,$4,$5,$6)", [req.body.username, hashedPassword,req.body.firstname,req.body.secondname,ismember = false,imadmin])
     res.redirect("/");
    } catch (error) {
       console.error(error);
       next(error);
      }
   });
   
  
passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const { rows } = await pool.query("SELECT * FROM onlymember WHERE username = $1", [username]);
        const user = rows[0];
       
        if (!user) {
          return done(null, false, { message: "Incorrect username" });
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
          // passwords do not match!
          return done(null, false, { message: "Incorrect password" })
        }
        
        return done(null, user);
      } catch(err) {
        return done(err);
      }
    })
  );
  
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id, done) => {
    try {
      const { rows } = await pool.query("SELECT * FROM onlymember WHERE id = $1", [id]);
      const user = rows[0];
  
      done(null, user);
    } catch(err) {
      done(err);
    }
  });


  app.get("/log-out", (req, res, next) => {
    req.logout((err) => {
      if (err) {
        return next(err);
      }
      res.redirect("/");
    });
  });
  app.get("/member",(req,res)=>{
   
    res.render("member",{user:req.user})
  })
  app.post("/member",async (req,res)=>  {
    const id = req.user.id
    
    await pool.query("UPDATE onlymember SET ismember = true WHERE id =$1",[id])
    
    
    res.redirect("/")

  }) 
  app.get("/message",(req,res)=>{
    res.render("message")
  })
  app.post("/message",async (req,res)=>{
    const id = req.user.id

    const text = req.body.message
    await pool.query("INSERT into messages (user_id,message) values($1,$2)",[id,text])
    res.redirect("/")
  })
  app.post("/:id/delete", async(req,res)=>{
    const messageId = req.params.id
    await pool.query("DELETE FROM messages WHERE id = $1", [messageId]);
    res.redirect("/");
  })
app.listen(3000, () => console.log("app listening on port 3000!"));

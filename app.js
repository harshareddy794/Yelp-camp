var express=require("express")
var app=express()
app.set("view engine","ejs")
app.use(express.static("public"))
var bodyparser=require("body-parser")
app.use(bodyparser.urlencoded({extended:true}))
var methodOverride= require("method-override")
app.use(methodOverride("method"))
var flash=require("connect-flash")
app.use(flash())
app.locals.moment = require('moment');
require('dotenv').config()

//+++++++++++++ mongoose connection ++++++++++++
var mongoos=require("mongoose")
mongoos.connect(process.env.URL,{useNewUrlParser: true, useUnifiedTopology: true,useFindAndModify: false,useCreateIndex:true},function(err){
    if(err){
        console.log("cannot connect to database")
    }
})

//++++++++++++ Passport initilize ++++++++++++++++++++
var passport=require("passport")
var localStratagy=require("passport-local")
var expressSessions=require("express-session")

app.use(expressSessions({
    secret:process.env.SECRET,
    resave: false,
    saveUninitialized :false
}))
app.use(passport.initialize())
app.use(passport.session())

//+++++++++++++ Models +++++++++++++++++++++++++++
var user=require("./models/user")


//++++++++++++ Passport use ++++++++++++++++++++
passport.use(new localStratagy(user.authenticate()))
passport.serializeUser(user.serializeUser())
passport.deserializeUser(user.deserializeUser())


app.use(function(req, res, next){
    res.locals.currentUser = req.user;
    res.locals.error=req.flash("error")
    res.locals.success= req.flash("success")
    next();
 });


 //+++++++++++++++ Routes +++++++++++++++++++++
var userRoutes=require("./routes/index")
var campRoutes=require("./routes/campground")
var commentRoutes=require("./routes/comments")

app.use(userRoutes)
app.use(campRoutes)
app.use(commentRoutes)

//++++++++++++ Listening port +++++++++++++++++++
app.listen(process.env.PORT,process.env.IP,function(){
    console.log("app is listining")
})

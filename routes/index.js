var express=require("express")
var router=express.Router({mergeParams: true})
var user= require("../models/user")
var camp=require("../models/campground")
var passport=require("passport")
var async = require("async");
var nodemailer = require("nodemailer");
var crypto = require("crypto");

router.get("/",function(req,res){
    res.render("landing")
})

//++++++++++++++++ User routes ++++++++++++++++++++++++++++++

router.get("/signup",function(req,res){
    res.render("./user/signup")
})

router.post("/signup", function(req, res){
    if(req.body.password===req.body.confpass){
        var newUser = new user({
            username: req.body.username,
            fname: req.body.fname,
            lname: req.body.lname,
            email: req.body.email,  
          })
          if(req.body.avatarurl){
            newUser.avatarurl=req.body.avatarurl
          }
          if(process.env.ADMIN_KEY==(req.body.code)){
              newUser.isAdmin=true
          }
        user.register(newUser, req.body.password, function(err, user){
            if(err){
                req.flash("error",err.message)
                return res.redirect("back");
            }
            passport.authenticate("local")(req, res, function(){
                req.flash("success","Successfully signed up and logged you in")
               res.redirect("/campgrounds"); 
            });
        });

    }else{
        req.flash("error","Passwords did not match")
        res.redirect("back")
    }
});

router.get("/login",function(req,res){
    res.render("./user/login")
})

router.post("/login",passport.authenticate("local",{
    successRedirect: "/campgrounds",
    successFlash:"Logged in successfully",
    failureRedirect: "/login",
    failureFlash:true
}),function(req,res){
})


router.get("/logout",function(req,res){
    req.logOut()
    req.flash("success","Logged you out succesfully!")
    res.redirect("/campgrounds")
})

router.get("/user/:id",function(req,res){
    user.findById(req.params.id,function(err,foundUser){
        if(err){
            req.flash("error","Some thing went wrong!!!")
            return res.redirect("back");
        }else{
            camp.find().where("user.id").equals(foundUser._id).exec(function(err,foundCamps){
                if(err){
                    req.flash("error","Some thing went wrong!!!")
            return res.redirect("back");
                }else{
                    res.render("user/show",{user:foundUser,camps:foundCamps})
                }
            })
        }
    })
})

router.get("/user/:id/edit",isAuthorised,function(req,res){
    user.findById(req.params.id,function(err,user){
        if(err){
            req.flash("error","Something went wrong")
            return res.redirect("back")
        }else{
            res.render("user/edit",{user:user})
        }

    })
})

router.put("/user/:id",function(req,res){
    var newUser ={
        fname: req.body.fname,
        lname: req.body.lname,
        avatarurl:req.body.avatarurl,
      }
    user.findByIdAndUpdate(req.params.id,newUser,function(err,user){
        if(err){
            req.flash("error","Something went wrong")
            return res.redirect("back")
        }else{
            res.redirect("/user/"+user._id)
        }
    })
})

router.get("/@dmin/signup",function(req,res){
    res.render("admin/signup")
})


//++++++++++++++++Password reset routes ++++++++++++++++
router.get('/forgot', function(req, res) {
    res.render('user/forgot');
  });
  
  router.post('/forgot', function(req, res, next) {
    async.waterfall([
      function(done) {
        crypto.randomBytes(50, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done) {
        user.findOne({ email: req.body.email }, function(err, user) {
          if (!user) {
            req.flash('error', 'No account with that email address exists.');
            return res.redirect('/forgot');
          }
  
          user.resetPasswordToken = token;
          user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  
          user.save(function(err) {
            done(err, token, user);
          });
        });
      },
      function(token, user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user:process.env.MAIL ,
            pass: process.env.MAILPASS
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'no-replay-Yelpcamp@gmail.com',
          subject: 'Yelp camp Password Reset',
          text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
            'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
            'http://' + req.headers.host + '/reset/' + token + '\n\n' +
            'If you did not request this, please ignore this email and your password will remain unchanged.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
          done(err, 'done');
        });
      }
    ], function(err) {
      if (err) return next(err);
      res.redirect('/forgot');
    });
  });
  
  router.get('/reset/:token', function(req, res) {
    user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
      if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/forgot');
      }
      res.render('user/reset', {token: req.params.token});
    });
  });
  
  router.post('/reset/:token', function(req, res) {
    async.waterfall([
      function(done) {
        user.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
          if (!user) {
            req.flash('error', 'Password reset token is invalid or has expired.');
            return res.redirect('back');
          }
          if(req.body.password === req.body.confirm) {
            user.setPassword(req.body.password, function(err) {
              user.resetPasswordToken = undefined;
              user.resetPasswordExpires = undefined;
  
              user.save(function(err) {
                req.logIn(user, function(err) {
                  done(err, user);
                });
              });
            })
          } else {
              req.flash("error", "Passwords do not match.");
              return res.redirect('back');
          }
        });
      },
      function(user, done) {
        var smtpTransport = nodemailer.createTransport({
          service: 'Gmail', 
          auth: {
            user:process.env.MAIL ,
            pass: process.env.MAILPASS
          }
        });
        var mailOptions = {
          to: user.email,
          from: 'no-replay-Yelpcamp@gmail.com',
          subject: 'Your password has been changed',
          text: 'Hello,\n\n' +
            'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
        };
        smtpTransport.sendMail(mailOptions, function(err) {
          req.flash('success', 'Success! Your password has been changed.');
          done(err);
        });
      }
    ], function(err) {
      res.redirect('/campgrounds');
    });
  });

  

module.exports=router

// +++++++++++++++++++ Auth functions ++++++++++++++

function isAuthorised(req,res,next){
    if(req.isAuthenticated()){
        user.findById(req.params.id,function(err,founduser){
            if(err){
                req.flash("error","Something went wrong")
                res.redirect("back")
            }else{
                if((founduser.id)==(req.user._id)){
                    next()
                }else{
                    req.flash("error","Access denied")
                    res.redirect("back")
                }
            }
        })
    }else{
        req.flash("error","You must be logged in first")
        res.redirect("/login")
    }
}
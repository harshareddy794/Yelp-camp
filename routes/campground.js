var express=require("express")
var router=express.Router({mergeParams: true})
var camp=require("../models/campground")
var multer = require('multer');
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname)
  }
});
var imageFilter = function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false)
    }
    cb(null, true)
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary')
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
})


//+++++++++++++++ Camp grounds +++++++++++++++++++++++

router.get("/campgrounds",function(req,res){
    var noMatch = null;
    if(req.query.search) {
        const regex = new RegExp((req.query.search), 'gi');
        camp.find({name: regex}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else {
              if(allCampgrounds.length < 1) {
                req.flash("error","No match found in database")
                  return res.redirect("/campgrounds")
              }
              res.render("./campground/campgrounds",{campgrounds:allCampgrounds});
           }
        });
    } else {
        camp.find({}, function(err, allCampgrounds){
           if(err){
               console.log(err);
           } else {
              res.render("./campground/campgrounds",{campgrounds:allCampgrounds});
           }
        });
    }    
})

router.get("/campgrounds/new",isLoggedIn,function(req,res){
    res.render("./campground/new")
})

router.post("/campgrounds", isLoggedIn,upload.single('image'), function(req, res){
    cloudinary.uploader.upload(req.file.path, function(result) {
        var author = {
            id: req.user._id,
            username: req.user.username
        }
        var newCampground = {
            name: req.body.name, 
            image: result.secure_url, 
            description: req.body.description, 
            price:req.body.price,
            user:author,
            image_id:result.public_id
        }
        camp.create(newCampground, function(err, newlyCreated){
            if(err){
                req.flash("error","Something went wrong")
                res.redirect("back")
            } else {
                req.flash("success","Campground added")
                res.redirect("/campgrounds")          
                }
            });
        })
    });



router.get("/campgrounds/:id",function(req,res){
    camp.findById(req.params.id).populate("comments").exec(function(err,foundCamp){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            res.render("./campground/show",{campground:foundCamp})
        }
    })
})

router.get("/campgrounds/:id/edit",isAuthorised,function(req,res){
    camp.findById(req.params.id,function(err,foundCamp){
        if(err){
            req.flash("error","Something went wrong")
            return res.redirect("back")
        }else{
            res.render("campground/edit",{foundCamp:foundCamp})
        }
    })
})

router.put("/campgrounds/:id",isAuthorised,upload.single('image'),function(req,res){
    camp.findById(req.params.id,async function(err,campground){
        if(err){
            req.flash("error", err.message)
            return res.redirect("back")
        }else{
            if (req.file) {
                try {
                    await cloudinary.uploader.destroy(campground.image_id)
                    var result = await cloudinary.uploader.upload(req.file.path)
                    campground.image_id = result.public_id
                    campground.image = result.secure_url
                } catch(err) {
                    req.flash("error", err.message)
                    return res.redirect("back")
                }
              }
              campground.name = req.body.name
              campground.description = req.body.description
              campground.price=req.body.price
              campground.save();
              req.flash("success","Successfully Updated!");
              res.redirect("/campgrounds/" + campground._id);
            }
        })
    })

router.delete("/campgrounds/:id",isAuthorised,function(req,res){
    camp.findById(req.params.id, async function(err,campground){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            try {
                await cloudinary.uploader.destroy(campground.image_id);
                campground.remove();
                req.flash('success', 'Campground deleted successfully!');
                res.redirect('/campgrounds');
            } catch(err) {
                if(err) {
                  req.flash("error", err.message);
                  return res.redirect("back");
                }
            }
        }
    })
})


module.exports=router

function isLoggedIn(req,res,next){
    if(req.isAuthenticated()){
        return next()
    }else{
        req.flash("error","You must be logged in first")
        res.redirect("/login")
    }
}

function isAuthorised(req,res,next){
    if(req.isAuthenticated()){
        camp.findById(req.params.id,function(err,foundCamp){
            if(err){
                req.flash("error","Something went wrong")
                res.redirect("back")
            }else{
                if(((foundCamp.user.id).equals(req.user._id)) || req.user.isAdmin==true){
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

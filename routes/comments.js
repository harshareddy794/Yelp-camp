var express=require("express")
var router=express.Router({mergeParams: true})
var comment= require("../models/comment")
var camp=require("../models/campground")



//++++++++++++++++++++++ Comment routes +++++++++++++++++++++++++++


router.get("/campground/:id/comment/new",isLoggedIn,function(req,res){
    camp.findById(req.params.id,function(err,campground){
        if(err){
            req.flash("error","Something went wrong")
        }else{
            res.render("./comments/new",{campground:campground})
        }
    })
})

router.post("/campground/:id/comment",isLoggedIn,function(req,res){
    camp.findById(req.params.id,function(err,campground){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            comment.create(req.body.newComment,function(err,comment){
                if(err){
                    req.flash("error","Something went wrong")
                    req.redirect("back")
                }else{
                    comment.user.username=req.user.username
                    comment.user.id=req.user._id
                    comment.save()
                    campground.comments.push(comment);
                    campground.save();
                    req.flash("success","Successfully created comment")
                    res.redirect("/campgrounds/"+req.params.id)
                }
            })
        }
    })
})

router.get("/campground/:campground_id/comment/:comment_id/edit",isAuthorised,function(req,res){
    camp.findById(req.params.campground_id,function(err,foundCampground){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            comment.findById(req.params.comment_id,function(err,foundComment){
                if(err){
                    req.flash("error","Something went wrong")
                    res.redirect("back")
                }
                else{
                    res.render("./comments/edit",{campground:foundCampground,comment:foundComment})
                }
            })
        }
    })
})

router.put("/campground/:campground_id/comment/:comment_id",isAuthorised,function(req,res){
    comment.findByIdAndUpdate(req.params.comment_id,req.body.newComment,function(err,comment){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            req.flash("success","Editing done successfully")
            res.redirect("/campgrounds/"+req.params.campground_id)
        }
    })
})

router.delete("/campground/:campground_id/comment/:comment_id",isAuthorised,function(req,res){
    comment.findByIdAndRemove(req.params.comment_id,function(err,comment){
        if(err){
            req.flash("error","Something went wrong")
            res.redirect("back")
        }else{
            req.flash("success","Deleted comment")
            res.redirect("/campgrounds/"+req.params.campground_id)
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
        comment.findById(req.params.comment_id,function(err,foundComment){
            if(err){
                req.flash("error","Something went wrong")
                res.redirect("back")
            }else{
                if(((foundComment.user.id).equals(req.user._id))|| req.user.isAdmin==true){
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
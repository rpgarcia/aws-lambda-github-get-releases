'use strict'
const express = require('express')
const api = express()  
var GitHub = require('github');
var async = require("async");
module.exports = api;

api.get('/:token/:repo/:env/result.json',  (req, res) => {
   
   res.set('Content-Type', 'application/json');
   var _env = req.params.env.toLowerCase();
   var _repo = req.params.repo;

   if (req.params.token == "TOKEN" && _env == "prd" || _env == "stg") {
       var github = new GitHub({
        //version: "3.0.0",
        debug: true,
        host: "api.github.com",
        //pathPrefix: "/api/v3", // for some GHEs; none for GitHub 
        headers: {
            "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.8; rv:24.0) Gecko/20100101 Firefox/24.0" // GitHub is happy with a unique user agent 
        }
       });

        github.authenticate({
            type: "oauth",
            token: req.params.token
        }, function(err, res) {
            console.log(JSON.stringify(res));
        });

        function readLastrelease(repo) {
            var promise = new Promise(function(resolve, reject) {
                github.repos.getLatestRelease({
                    owner: 'OWNER',
                    repo: repo },
                    function(err,data){
                        if(err){
                          reject(err);
                          return;
                        }
                        resolve(data);
                    }
                );
            });
            return promise;
        }

        function readPreRelease(repo) {
            var promise = new Promise(function(resolve, reject) {
                github.repos.getReleases({
                    owner: 'OWNER',
                    repo: repo,
                    per_page: 10 },
                    function(err,data){
                        if(err){
                          reject(err);
                          return;
                        } 
                        resolve(data);
                    }
                );
            });
            return promise;
        }

        function repoExist(_repo){
            var promise = new Promise(function(resolve, reject) {
                github.repos.getForOrg({
                    org: "OWNER",
                    per_page: 30}, (err, data) => { 
                        var i = data.length;
                        var j = data.length - i;  
                
                        while(i--){
                            if(err){
                                reject(err);
                                return
                            }
                            j++;
                        }
                        resolve(data);
                    }
                );
            });
            return promise;
        }

        var promise = repoExist(_repo);
        promise.then(
            function(data){ 
                var i = data.length;
                var j = data.length - i;  
                var result = "";
                while(i--){
                    if(data[j].name == _repo) {
                        result = data[j].name;
                    }
                    j++;
                }

                if (result != ""){
                    if(_env == "prd"){
                        var promise = readLastrelease(_repo);
                            promise.then(
                                function(data){
                                    return res.send('["' + data.tag_name + '"]');
                                },
                                function(err){
                                    console.log(err);
                                }
                            );
                    }
                    else if(_env == "stg"){
                        var promise = readPreRelease(_repo);
                            promise.then(
                                function(data){
                                    var i = data.length;
                                    var j = data.length - i;
                                    while(i--){
                                        if(data[j].prerelease == true) {
                                            return res.send('["' + data[j].tag_name + '"]');                
                                        }
                                        j++;
                                    }
                                        //res.json(data);
                                },
                                function(err){
                                    console.log(err);
                                }
                            );
                        }
                }
                else{
                    return res.send('["--- NOT FOUND repo ----"]');
                }
            });
    }
    else {
        return res.send('ERROR');
    }
});

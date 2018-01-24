﻿'use strict';
var express = require('express');
var Client = require('node-rest-client').Client;
var sql = require('mssql');
var dbConfig = require('../config/dbConfig');
var luisConfig = require('../config/luisConfig');
var router = express.Router();

const HOST = 'https://westus.api.cognitive.microsoft.com'; // Luis api host
var subKey = luisConfig.subKey; // Subscription Key

/* GET home page. */
router.get('/', function (req, res) {
    if(req.session.sid) {
        var client = new Client();
        var appList;
        var options = {
            headers: {
                'Ocp-Apim-Subscription-Key': subKey
            }
        };
        try{
            client.get( HOST + '/luis/api/v2.0/apps/', options, function (data, response) {
                //console.log(data)
                appList = data;
                var listStr = 'SELECT APP_ID FROM TBL_LUIS_APP ';
                (async () => {
                    try {
                        let pool = await sql.connect(dbConfig);
                        let listVal = await pool.request().query(listStr);
                        let rows = listVal.recordset;

                        var newAppList = [];
                        for (var i = 0; i < rows.length; i++) {
                            for (var j=0; j<appList.length; j++) {
                                if (rows[i].APP_ID === appList[j].id) {
                                    appList.splice(j,1);
                                    break;
                                }
                            }
                        }

                        if (appList.length > 0) {
                            var appStr = "";
                            var appRelationStr = "";
                            var loginId = req.session.sid;
                            for (var i=0; i<appList.length; i++) {
                                appStr += "INSERT INTO TBL_LUIS_APP (APP_NUM, SUBSC_KEY, APP_ID, VERSION, APP_NAME, OWNER_EMAIL, REG_DT, CULTURE, DESCRIPTION) ";
                                appStr += "VALUES ((SELECT isNULL(MAX(APP_NUM),0) FROM TBL_LUIS_APP)+1, '" + subKey + "', '" + appList[i].id + "', " +
                                    " '" + appList[i].activeVersion + "', '" + appList[i].name + "', '" + appList[i].ownerEmail + "', " +
                                    " convert(VARCHAR(33), '" + appList[i].createdDateTime + "', 126), '" + appList[i].culture + "', '" + appList[i].description + "'); ";
                            }
                            //convert(datetime, '2008-10-23T18:52:47.513', 126)
                            let insertApp = await pool.request().query(appStr);
                        }

                        res.redirect("/list");
                        
                    } catch (err) {
                        console.log(err);
                        //res.redirect("/list");
                    } finally {
                        sql.close();
                    }
                })()
            
                sql.on('error', err => {
                    // ... error handler
                })

            });
        }catch(e){
            console.log(e);
        }
    }
    else{
        res.render('login');   
    }
    
});

router.get('/list', function (req, res) {
    req.session.selMenu = 'm1';
    var loginId = req.session.sid;
    var userListStr = "SELECT A.APP_ID, A.VERSION, A.APP_NAME, FORMAT(A.REG_DT,'yyyy-MM-dd') REG_DT, A.CULTURE, A.DESCRIPTION" +
                      "  FROM TBL_LUIS_APP A, TBL_USER_RELATION_APP B " +
                      " WHERE 1=1 " +
                      "   AND A.APP_ID = B.APP_ID " +
                      "   AND B.USER_ID = '" + loginId + "'; ";
    (async () => {
        try {
            let pool = await sql.connect(dbConfig);
            let userListArr = await pool.request().query(userListStr);
            let rows = userListArr.recordset;

            res.render('index',
            {
                title: 'Express',
                selMenu: req.session.selMenu,
                list: rows
            });
            
        } catch (err) {
            console.log(err);
            //res.redirect("/list");
        } finally {
            sql.close();
        }
    })()

    sql.on('error', err => {
        // ... error handler
    })
    
});

//Luis app insert
router.post('/admin/putAddApps', function (req, res){
    var appService = req.body.appInsertService;
    var appName = req.body.appInsertName;
    var appCulture = req.body.appInsertCulture;
    var appDes = req.body.appInsertDes;

    var client = new Client();
    
    var options = {
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': subKey
        },
        data: {
            'name': appName,
            'description': appDes,
            'culture': appCulture
        }
    };
    try{
        client.post( HOST + '/luis/api/v2.0/apps/', options, function (data, response) {
            //console.log(data); // app id값
            var responseData;
            if(response.statusCode == 201){ // 등록 성공
                responseData = {'appId': data};
            }else{
                responseData = data;
            }
            res.json(responseData);
        });
    }catch(e){
        console.log(e);
    }
});

//Luis app delete
router.post('/admin/deleteApp', function (req, res){
    var appId = req.body.deleteAppId;

    var client = new Client();
    var options = {
        headers: {
            'Ocp-Apim-Subscription-Key': subKey
        }
    };
    try{
        client.delete( HOST + '/luis/api/v2.0/apps/' + appId , options, function (data, response) {
            res.json(data);
        });
    }catch(e){
        console.log(e);
    }
    
});

//Luis app rename
router.post('/admin/renameApp', function (req, res){
    var appId = req.body.renameAppId;
    var appName = req.body.renameAppName;
    var client = new Client();
    var options = {
        headers: {
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': subKey
        },
        data: {
            'name': appName
        }
    };
    try{
        client.put( HOST + '/luis/api/v2.0/apps/' + appId , options, function (data, response) {
            res.json(data);
        });
    }catch(e){
        console.log(e);
    }
    
});

router.post('/ajax1', function (req, res) {
    console.log("동기동기 비동기");
    var responseData = {'result': 'ok', 'title' : 'ajax테스트 게시물', 'writer' : req.session.sid, 'date': '2017-12-28'};
    res.json(responseData);
});

router.post('/ajax2', function(req, res, next) {

    console.log('POST 방식으로 서버 호출됨');
    //view에 있는 data 에서 던진 값을 받아서

    var msg = req.body.msg;
    msg = '[에코]' + msg;

    //json 형식으로 보내 준다.
    res.send({result:true, msg:msg});

});

module.exports = router;

﻿'use strict';
var express = require('express');
var sql = require('mssql');
var dbConfig = require('../../config/dbConfig');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    req.session.selMenu = 'm3';
    res.redirect('/learning/entities');
});

router.get('/recommend', function (req, res) {
/*
SELECT SEQ,QUERY,(SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(QUERY)) AS ENTITIES
FROM TBL_QUERY_ANALYSIS_RESULT 
WHERE RESULT='D'
*/
    (async () => {
        try {
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .query('SELECT SEQ,QUERY,(SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(QUERY)) AS ENTITIES '
                + 'FROM TBL_QUERY_ANALYSIS_RESULT '
                + 'WHERE RESULT=\'D\''
                )
            let rows = result1.recordset;
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};
                var query = rows[i].QUERY;
                var entities = rows[i].ENTITIES;
                var entityArr = entities.split(',');
                var queryString = "";
                
                item.QUERY = query;
                if(entityArr[0] == ""){
                    item.intentList = [];
                }else{
                    for(var i = 0; i < entityArr.length; i++) {
                        if(i == 0){
                            queryString += "SELECT DISTINCT LUIS_INTENT FROM TBL_DLG_RELATION_LUIS WHERE LUIS_ENTITIES LIKE '%" + entityArr[i] + "%'"
                        }else{
                            queryString += "OR LUIS_ENTITIES LIKE '%" + entityArr[i] + "%'";
                        }
                    }
                    let luisIntentList = await pool.request()
                    .query(queryString)
                    item.intentList = luisIntentList.recordset
                }
                result.push(item);
            }
            sql.close();
            res.render('recommend', {list : result});
        
        } catch (err) {
            console.log(err);
            // ... error checks
        }
    })()

    sql.on('error', err => {
        // ... error handler
    })
});

router.get('/utterances', function (req, res) {

    req.session.selMenus = 'ms2';
    res.render('utterances', {
        selMenus: req.session.selMenus,
        title: 'learning utterances page'
    } );
});

router.get('/dialog', function (req, res) {

    req.session.selMenus = 'ms3';
    res.render('dialog', {
        selMenus: req.session.selMenus,
        title: 'learning dialog page'
    } );
});



router.post('/utterInputAjax', function(req, res, next) {
 
    //view에 있는 data 에서 던진 값을 받아서
    var iptUtterance = req.body.iptUtterance;

    (async () => {
        try {
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .input('iptUtterance', sql.NVarChar, iptUtterance)
                .query('SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(@iptUtterance)')
            
            let rows = result1.recordset;

            if(rows.length > 0) {
                var entities = rows[0]['RESULT'];
                var entityArr = entities.split(',');

                let queryArr = new Array(entityArr.length);

                for(var i = 0; i < entityArr.length; i++) {
                    queryArr[i] = await pool.request()
                    .input('iptUtterance', sql.NVarChar, iptUtterance)
                    .query("SELECT DISTINCT LUIS_INTENT FROM TBL_DLG_RELATION_LUIS WHERE LUIS_ENTITIES LIKE '%" + entityArr[i] + "%'")

                    console.dir(queryArr[i])
                }

                res.send({result:true, iptUtterance:iptUtterance, entities:entities});
            } else {
                res.send({result:true, iptUtterance:iptUtterance});
            }
        
        } catch (err) {
            // ... error checks
        }
    })()
    
    sql.on('error', err => {
        // ... error handler
    })

});


router.get('/entities', function (req, res) {

    req.session.selMenus = 'ms4';
    res.render('entities', {
        selMenus: req.session.selMenus,
        title: 'learning Entities page'
    } );
});

module.exports = router;

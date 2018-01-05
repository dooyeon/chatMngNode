﻿'use strict';
var express = require('express');
var sql = require('mssql');
var dbConfig = require('../../config/dbConfig');
var paging = require('../../config/paging');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    req.session.selMenu = 'm3';
    res.redirect('/learning/entities');
});

router.get('/recommend', function (req, res) {
    res.render('recommend');
});

router.post('/recommend', function (req, res) {
    var selectType = req.body.selectType;
    var currentPage = req.body.currentPage;

    (async () => {
        try {
            var entitiesQueryString = "SELECT TBZ.* "+
            "FROM (SELECT TBY.* "+
            "FROM (SELECT ROW_NUMBER() OVER(ORDER BY TBX.SEQ DESC) AS NUM, "+
            "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, "+
            "CEILING((ROW_NUMBER() OVER(ORDER BY TBX.SEQ DESC) )/ convert(numeric ,10)) PAGEIDX, "+
            "TBX.* "+
            "FROM ( "+
            "SELECT SEQ,QUERY,(SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(QUERY)) AS ENTITIES " +
            "FROM TBL_QUERY_ANALYSIS_RESULT " + 
            "WHERE RESULT='D'";
            
            if(selectType == 'yesterday'){
                entitiesQueryString += " AND (CONVERT(CHAR(10), UPD_DT, 23)) like '%'+(select CONVERT(CHAR(10), (select dateadd(day,-1,getdate())), 23)) + '%'";
            }else if(selectType == 'lastWeek'){
                entitiesQueryString += " AND (CONVERT(CHAR(10), UPD_DT, 23)) >= (SELECT CONVERT(CHAR(10), (DATEADD(wk, DATEDIFF(d, 0, getdate()) / 7 - 1, -1)), 23))";
                entitiesQueryString += " AND (CONVERT(CHAR(10), UPD_DT, 23)) <= (SELECT CONVERT(CHAR(10), (DATEADD(wk, DATEDIFF(d, 0, getdate()) / 7 - 1, 5)), 23))";
            }else if(selectType == 'lastMonth'){
                entitiesQueryString += " AND (CONVERT(CHAR(7), UPD_DT, 23)) like '%'+ (select CONVERT(CHAR(7), (select dateadd(month,-1,getdate())), 23)) + '%'";
            }else{
            }

            entitiesQueryString += " ) TBX) TBY) TBZ";
            entitiesQueryString += " WHERE PAGEIDX = @currentPage";
            entitiesQueryString += " ORDER BY NUM";

            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .input('currentPage', sql.Int, currentPage)
                .query(entitiesQueryString)
            let rows = result1.recordset;

            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};
                var query = rows[i].QUERY;
                var entities = rows[i].ENTITIES;
                var entityArr = rows[i].ENTITIES.split(',');
                var luisQueryString = "";

                item.QUERY = query;
                item.ENTITIES = entities;
                if(entityArr[0] == ""){
                    item.intentList = [];
                }else{
                    for(var j = 0; j < entityArr.length; j++) {
                        if(j == 0){
                            luisQueryString += "SELECT DISTINCT LUIS_INTENT FROM TBL_DLG_RELATION_LUIS WHERE LUIS_ENTITIES LIKE '%" + entityArr[j] + "%'"
                        }else{
                            luisQueryString += "OR LUIS_ENTITIES LIKE '%" + entityArr[j] + "%'";
                        }
                    }
                    let luisIntentList = await pool.request()
                    .query(luisQueryString)
                    item.intentList = luisIntentList.recordset
                }
                result.push(item);
            }

            if(rows.length > 0){
                res.send({list : result, pageList : paging.pagination(currentPage,rows[0].TOTCNT)});
            }else{
                res.send({list : result});
            }

        } catch (err) {
            console.log(err)
            // ... error checks
        } finally {
            sql.close();
        }
    })()

    sql.on('error', err => {
        // ... error handler
    })
});

router.get('/utterances', function (req, res) {
	var utterance = req.query.utterance;

    req.session.selMenus = 'ms2';
    res.render('utterances', {
        selMenus: req.session.selMenus,
        title: 'learning utterances page',
		utterance: utterance
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

            if(rows[0]['RESULT'] != '') {
                var entities = rows[0]['RESULT'];
                var entityArr = entities.split(',');
                var queryString = "";
                for(var i = 0; i < entityArr.length; i++) {
                    if(i == 0){
                        queryString += "SELECT DISTINCT LUIS_INTENT FROM TBL_DLG_RELATION_LUIS WHERE LUIS_ENTITIES LIKE '%" + entityArr[i] + "%'"
                    }else{
                        queryString += "OR LUIS_ENTITIES LIKE '%" + entityArr[i] + "%'";
                    }
                }

                let result2 = await pool.request()
                .query(queryString)
                
                let rows2 = result2.recordset

                res.send({result:true, iptUtterance:iptUtterance, entities:entities, selBox:rows2});
            } else {
                res.send({result:true, iptUtterance:iptUtterance});
            }
        
        } catch (err) {
            // ... error checks
            console.log(err);
        } finally {
            sql.close();
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

router.post('/selectDlgListAjax', function (req, res) {

    var intentName = req.body.intentName;
    var queryText = "SELECT DL.DLG_ID, DL.DLG_TYPE, "
                  + "CASE WHEN DLG_TYPE = 2 THEN ( SELECT CARD_TEXT FROM TBL_DLG_TEXT TE WHERE TE.DLG_ID = DL.DLG_ID)"
                  + " WHEN DLG_TYPE = 3 THEN ( SELECT CASE WHEN CARD_TITLE IS NULL THEN CARD_TEXT"
                                                        + " WHEN CARD_TEXT IS NULL THEN CARD_TITLE ELSE CARD_TEXT END CARD_TEXT"
                                            + " FROM TBL_DLG_CARD CA"
                                            + " WHERE CARD_ORDER_NO = 1"
                                            + " AND CA.DLG_ID = DL.DLG_ID )"
                  + " WHEN DLG_TYPE = 4 THEN ( SELECT CASE WHEN CARD_TITLE IS NULL THEN CARD_TEXT"
                                                        + " WHEN CARD_TEXT IS NULL THEN CARD_TITLE END CARD_TEXT"
                                            + " FROM TBL_DLG_MEDIA ME"
                                            + " WHERE ME.DLG_ID = DL.DLG_ID )"
                  + " END CARD_TEXT"
                  + " FROM TBL_DLG DL"
                  + " WHERE DLG_ID IN ("
                        + " SELECT DISTINCT DLG_ID "
                        + " FROM TBL_DLG_RELATION_LUIS"
                        + " WHERE LUIS_INTENT = '" + intentName + "'"
                        + " AND USE_YN = 'Y' )";

    (async () => {
        try {
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .query(queryText)
            let rows = result1.recordset;
            var result = [];
            for(var i = 0; i < rows.length; i++){
                //var item = {};
                //var query = rows[i].QUERY;
                //var entityArr = rows[i].ENTITIES.split(',');
                
                //item.QUERY = query;
                result.push(rows[i]);
            }
            res.send({list : result});
        
        } catch (err) {
            console.log(err);
        } finally {
            sql.close();
        }
    })()

    sql.on('error', err => {
        console.log(err);
    })
});

router.post('/insertDialog', function (req, res) {
    var dlgType = req.body.dlgType;
    var dlgOrder = req.body.dlgOrder;
    var dialogText = req.body.dialogText;
    var dlgTypeNum = ((dlgType == 'text')? '2' : (dlgType == 'card')? '3' : (digType == 'media')? '4' : null);

    if(dlgTypeNum == null){
        res.send({status:400 , message:'dialog type not found'});
    }
    (async () => {
        try {

            var selectQueryString1 = 'SELECT ISNULL(MAX(DLG_ID)+1,1) AS DLG_ID FROM TBL_DLG';
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .query(selectQueryString1)
            let rows1 = result1.recordset;
            
            var insertQueryString1 = 'INSERT INTO TBL_DLG(DLG_ID,DLG_NAME,DLG_DESCRIPTION,DLG_LANG,DLG_TYPE,DLG_ORDER_NO,USE_YN) VALUES ' +
            '(@dlgId,@dialogText,@dialogText,\'KO\',@dlgType,@dlgOrder,\'Y\')';

            let result2 = await pool.request()
                .input('dlgId', sql.Int, rows1[0].DLG_ID)
                .input('dialogText', sql.NVarChar, dialogText)
                .input('dlgType', sql.NVarChar, dlgTypeNum)
                .input('dlgOrder', sql.Int, dlgOrder)
                .query(insertQueryString1)  
            //let rows2 = result2.recordset;
            
            var selectQueryString2 = '';
            if(dlgType == 'text'){
                selectQueryString2 = 'SELECT ISNULL(MAX(TEXT_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_TEXT';
            }else if(dlgType == 'card'){
                selectQueryString2 = 'SELECT ISNULL(MAX(CARD_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_CARD';
            }else if(dlgType == 'media'){
                selectQueryString2 = 'SELECT ISNULL(MAX(MEDIA_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_MEDIA';
            }else{
            }
            
            let result3 = await pool.request()
                .query(selectQueryString2)
            let rows3 = result3.recordset; //row3[0].TYPE_DLG_ID

            var insertQueryString2 = '';
            if(dlgType == 'text'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_TEXT(TEXT_DLG_ID,DLG_ID,CARD_TEXT,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,\'Y\')';
            }else if(dlgType == 'card'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_CARD(CARD_DLG_ID,DLG_ID,CARD_TEXT,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,\'Y\')';
            }else if(dlgType == 'media'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_MEDIA(MEDIA_DLG_ID,DLG_ID,CARD_TEXT,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,\'Y\')';
            }else{
            }

            let result4 = await pool.request()
                .input('typeDlgId', sql.Int, rows3[0].TYPE_DLG_ID)
                .input('dlgId', sql.Int, rows1[0].DLG_ID)
                .input('dialogText', sql.NVarChar, dialogText)
                .query(insertQueryString2)

            res.send({status:200 , message:'insert Success'});
        
        } catch (err) {
            console.log(err);
            res.send({status:500 , message:'insert Dialog Error'});
        } finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
    })
});

router.post('/learnUtterAjax', function (req, res) {
    var intent = req.body.intent;
    var entity = req.body.entity;
    var dlgId = req.body.dlgId;

    var queryText = "INSERT INTO TBL_DLG_RELATION_LUIS(LUIS_ID,LUIS_INTENT,LUIS_ENTITIES,DLG_ID,DLG_API_DEFINE,USE_YN) "
                  + "VALUES( 'kona_luis_06', '" + intent + "','" + entity + "'," + dlgId + ", 'D', 'Y' )";

    (async () => {
        try {
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .query(queryText)
            
            console.log(result1);

            let rows = result1.rowsAffected;

            if(rows[0] == 1) {
                res.send({result:true});
            } else {
                res.send({result:false});
            }
        
        } catch (err) {
            // ... error checks
            console.log(err);
        } finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
        // ... error handler
    })
});



module.exports = router;

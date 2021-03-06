﻿'use strict';
var express = require('express');
var sql = require('mssql');
var dbConfig = require('../../config/dbConfig');
var dbConnect = require('../../config/dbConnect');
var paging = require('../../config/paging');
var util = require('../../config/util');
var router = express.Router();

/* GET users listing. */
router.get('/', function (req, res) {
    req.session.selMenus = 'ms1';
    req.session.selMenu = 'm3';
    res.redirect('/learning/recommend');
});

router.get('/recommend', function (req, res) {
    req.session.selMenus = 'ms1';
    res.render('recommend', {selMenus: 'ms1'});
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
            "SELECT SEQ,QUERY,CONVERT(CHAR(19), UPD_DT, 20) AS UPD_DT,(SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(QUERY)) AS ENTITIES " +
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

            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request()
                .input('currentPage', sql.Int, currentPage)
                .query(entitiesQueryString)
            let rows = result1.recordset;

            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};
                var query = rows[i].QUERY;
                var seq = rows[i].SEQ;
                var entities = rows[i].ENTITIES;
                var updDt = rows[i].UPD_DT;
                var entityArr = rows[i].ENTITIES.split(',');
                var luisQueryString = "";

                item.QUERY = query;
                item.UPD_DT = updDt;
                item.SEQ = seq;
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
		utterance: utterance
    } );
});

router.get('/dialog', function (req, res) {

    req.session.selMenus = 'ms3';
    (async () => {
        try {
            var group_query = "select distinct GroupL from TBL_DLG where GroupL is not null";
            //var group_query = "SELECT DISTINCT GroupL FROM TBL_DLG WHERE GroupL = '" + searchGroupL + "'";
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result2 = await pool.request().query(group_query);
            let rows2 = result2.recordset;
            
            var groupList = [];
            for(var i = 0; i < rows2.length; i++){
                var item2 = {};

                var largeGroup = rows2[i].GroupL;

                //item2.largeGroup = largeGroup;
                //groupList.push(item2);
            }
            
            res.render('dialog', {
                selMenus: req.session.selMenus,
                groupList: rows2
            } );
        } catch (err) {
            console.log(err)
            // ... error checks
        } finally {
            sql.close();
        }
    })()

});

/*
router.post('/', function (req, res) {
    
    
    var currentPage = req.body.currentPage;

    (async () => {
        try {
            var sourceType = req.body.sourceType;
            var groupType = req.body.groupType;
            var dlg_desQueryString = "select tbp.* from " +
                                     "(select ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC) AS NUM, " +
                                     "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, "  +
                                     "CEILING((ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC))/ convert(numeric ,10)) PAGEIDX, " +
                                     "DLG_DESCRIPTION, DLG_API_DEFINE ,LUIS_ENTITIES, LUIS_INTENT " +
                                     "from TBL_DLG a, TBL_DLG_RELATION_LUIS b " + 
                                     "where a.DLG_ID = b.DLG_ID and LUIS_INTENT like '%" + groupType + "%' " +
                                     "and DLG_API_DEFINE like '%" + sourceType + "%') tbp " +
                                     "WHERE PAGEIDX = @currentPage";
            let pool = await sql.connect(dbConfig);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(dlg_desQueryString);
            let rows = result1.recordset;
            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var description = rows[i].DLG_DESCRIPTION;
                var apidefine = rows[i].DLG_API_DEFINE;
                var luisentties = rows[i].LUIS_ENTITIES;
                var luisentent = rows[i].LUIS_INTENT;

                item.DLG_DESCRIPTION = description;
                item.DLG_API_DEFINE = apidefine;
                item.LUIS_ENTITIES = luisentties;
                item.LUIS_INTENT = luisentent;

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
*/
//다이얼로그 대그룹 중그룹 소그룹 셀렉트 박스
router.post('/searchGroup', function (req, res) {
    var searchTxt ='';
    if (req.body.searchTxt != '' && req.body.searchType != '1') {
        searchTxt = req.body.searchTxt;
    }
    var group = req.body.group;
    var groupName = req.body.groupName;
    var groupL = req.body.groupL;

    (async () => {
        try {

            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            var searchGroupQuery;
            if(group == 'searchMedium') {

                searchGroupQuery = "SELECT DISTINCT tbp.GroupM " +
                                   "  FROM (SELECT a.GroupL, a.GroupM, GroupS " +
                                   "          FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b " +
                                   "         WHERE a.DLG_ID = b.DLG_ID   and LUIS_ENTITIES like '%" + searchTxt +  "%' ) tbp " +
                                   " WHERE GroupL = @groupName";

                let result1 = await pool.request().input('groupName', sql.NVarChar, groupName).query(searchGroupQuery);
                let rows = result1.recordset;
                
                var groupList = [];
                for(var i = 0; i < rows.length; i++){
                    var item = {};

                    var mediumGroup = rows[i].GroupM;
                    
                    item.mediumGroup = mediumGroup; 

                    groupList.push(item);
                }

                res.send({groupList: groupList});
            } else if(group == 'searchSmall') {
                searchGroupQuery = "SELECT DISTINCT tbp.GroupS " +
                                   "  FROM (SELECT a.GroupL, a.GroupM, GroupS " +
                                   "          FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b " +
                                   "         WHERE a.DLG_ID = b.DLG_ID   and LUIS_ENTITIES like '%" + searchTxt +  "%' ) tbp " +
                                   " WHERE GroupL = '" + groupL + "' and GroupM = @groupName";
                //searchGroupQuery = "select distinct GroupS from TBL_DLG where GroupL = '" + groupL + "' and GroupM = @groupName";

                let result1 = await pool.request().input('groupName', sql.NVarChar, groupName).query(searchGroupQuery);
                let rows = result1.recordset;
                
                var groupList = [];
                for(var i = 0; i < rows.length; i++){
                    var item = {};
                    var smallGroup = rows[i].GroupS;

                    item.smallGroup = smallGroup; 

                    groupList.push(item);
                }

                res.send({groupList: groupList});
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

//dialog.html 소그룹이 선택 돼었을때 리스트 뿌려주기
router.post('/selectSmallGroup', function (req, res) {
    
    var groupName = req.body.groupName;
    var currentPage = 1;

    if(req.body.currentPage != null) {
        currentPage = req.body.currentPage;
    } 
    (async () => {
        try {

            var selectSmallGroup = "select tbp.* from " +
                                 "(select ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC) AS NUM, " +
                                 "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, "  +
                                 "CEILING((ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC))/ convert(numeric ,10)) PAGEIDX, " +
                                 "DLG_DESCRIPTION, GroupS, DLG_API_DEFINE ,LUIS_ENTITIES" +
                                 "from TBL_DLG a, TBL_DLG_RELATION_LUIS b " + 
                                 "where a.DLG_ID = b.DLG_ID and GroupS like '%" + groupName + "%' " +
                                 "and DLG_API_DEFINE like '%" + sourceType + "%') tbp " +
                                 "WHERE PAGEIDX = @currentPage";

            //var searchMidGroup = "select * from TBL_DLG where GroupS = @groupName";
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(selectSmallGroup);
            let rows = result1.recordset;
            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var description = rows[i].DLG_DESCRIPTION;
                var apidefine = rows[i].DLG_API_DEFINE;
                var luisentent = rows[i].LUIS_INTENT;
                var smallGroup = rows[i].GroupS;
                
                item.DLG_DESCRIPTION = description;
                item.DLG_API_DEFINE = apidefine;
                item.LUIS_INTENT = luisentent;
                item.GroupS = smallGroup;

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

/*
//그룹 테스트
router.post('/searchMidGroup', function (req, res) {
    
    
    var groupName = req.body.groupName;

    (async () => {
        try {
            var searchMidGroup = "select distinct GroupM from TBL_DLG where GroupL = @groupName";
            let pool = await sql.connect(dbConfig);
            let result1 = await pool.request().input('groupName', sql.NVarChar, groupName).query(searchMidGroup);
            let rows = result1.recordset;
            
            var groupList = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var mediumGroup = rows[i].GroupM;

                item.mediumGroup = mediumGroup; 
                console.log("mediumGroup:" + mediumGroup);


                groupList.push(item);
            }


            if(rows.length > 0){
                res.send({groupList: groupList});
            }else{
                res.send({list : groupList});
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
*/

router.post('/searchIptDlg', function (req, res) {
    
    var currentPage = req.body.currentPage;
    var searchText = req.body.searchText;

    (async () => {
        try {
                    
            var dlg_desQueryString = "SELECT tbp.* FROM " +
                                     "  (SELECT ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC) AS NUM, " +
                                     "      a.DLG_ID AS DLG_ID, " +
                                     "      COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, "  +
                                     "      CEILING((ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC))/ convert(numeric ,10)) PAGEIDX, " +
                                     "      DLG_DESCRIPTION, DLG_API_DEFINE ,LUIS_ENTITIES, GroupS " +
                                     "  FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b where a.DLG_ID = b.DLG_ID ";
                  
                dlg_desQueryString+= "  and LUIS_ENTITIES like '%" + searchText + "%' ";
                dlg_desQueryString += ") tbp WHERE PAGEIDX = @currentPage";
            let pool = await dbConnect.getConnection(sql);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(dlg_desQueryString);
            let rows = result1.recordset;
            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var description = rows[i].DLG_DESCRIPTION;
                var apidefine = rows[i].DLG_API_DEFINE;
                var luisentties = rows[i].LUIS_ENTITIES;
                var luisentent = rows[i].LUIS_INTENT;
                var smallGroup = rows[i].GroupS;
                var dialogueId = rows[i].DLG_ID;
                
                item.DLG_ID = dialogueId;
                item.DLG_DESCRIPTION = description;
                item.DLG_API_DEFINE = apidefine;
                item.LUIS_ENTITIES = luisentties;
                item.LUIS_INTENT = luisentent;
                item.GroupS = smallGroup;

                result.push(item);
            }
            var group_query = "SELECT DISTINCT tbp.GroupL " +
                             "   FROM (SELECT a.GroupL, a.GroupM, GroupS " +
                             "           FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b " +
                             "          WHERE a.DLG_ID = b.DLG_ID   and LUIS_ENTITIES like '%" + searchText +  "%' ) tbp " +
                             "  WHERE GroupL is not null";
            //var group_query = "select distinct GroupL from TBL_DLG where GroupL is not null";
            let result2 = await pool.request().query(group_query);
            let rows2 = result2.recordset;
            
            var groupList = [];
            for(var i = 0; i < rows2.length; i++){
                var item2 = {};

                var largeGroup = rows2[i].GroupL;

                item2.largeGroup = largeGroup;

                groupList.push(item2);
            }

            if(rows.length > 0){
                res.send({list : result, pageList : paging.pagination(currentPage,rows[0].TOTCNT), groupList: groupList});
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

router.post('/dialogs2', function (req, res) {
    
    //var searchTxt = req.body.searchTxt;
    var currentPage = req.body.currentPage;
    var sourceType2 = req.body.sourceType2;
    var searchGroupL = req.body.searchGroupL;
    var searchGroupM = req.body.searchGroupM;
    var searchGroupS = req.body.searchGroupS;

    (async () => {
        try {
                    
            var dlg_desQueryString = "select tbp.* from \n" +
                                     "(select ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC) AS NUM, \n" +
                                     "  a.DLG_ID AS DLG_ID, \n" +
                                     "  COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, \n"  +
                                     "  CEILING((ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC))/ convert(numeric ,10)) PAGEIDX, \n" +
                                     "  DLG_DESCRIPTION, DLG_API_DEFINE ,LUIS_ENTITIES, GroupL, GroupM, GroupS \n" +
                                     "  from TBL_DLG a, TBL_DLG_RELATION_LUIS b where a.DLG_ID = b.DLG_ID \n";
                    if (req.body.searchText && !req.body.upperGroupL) {
                        dlg_desQueryString += "AND b.LUIS_ENTITIES like '%" + req.body.searchText + "%' \n";
                    }
                    dlg_desQueryString += "and DLG_API_DEFINE like '%" + sourceType2 + "%' \n";
                    
                    if(req.body.upperGroupL) {
                        dlg_desQueryString += "and GroupL = '" + req.body.upperGroupL + "' \n";
                    }

                    if(req.body.upperGroupM) {
                        dlg_desQueryString += "and GroupM = '" + req.body.upperGroupM + "' \n";
                    }

                    if(req.body.upperGroupS) {
                        dlg_desQueryString += "and GroupS = '" + req.body.upperGroupS + "' \n";
                    }                  
                    if(searchGroupL) {
                        dlg_desQueryString += "and GroupL = '" + searchGroupL + "' \n";
                    }
    
                    if(searchGroupM) {
                        dlg_desQueryString += "and GroupM = '" + searchGroupM + "' \n";
                    }
    
                    if(searchGroupS) {
                        dlg_desQueryString += "and GroupS = '" + searchGroupS + "' \n";
                    } 

                dlg_desQueryString += ") tbp WHERE PAGEIDX = @currentPage \n";

                
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(dlg_desQueryString);
            let rows = result1.recordset;
            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var description = rows[i].DLG_DESCRIPTION;
                var apidefine = rows[i].DLG_API_DEFINE;
                var luisentties = rows[i].LUIS_ENTITIES;
                var luisentent = rows[i].LUIS_INTENT;
                var smallGroup = rows[i].GroupS;
                var dialogueId = rows[i].DLG_ID;
                
                item.DLG_ID = dialogueId;
                item.DLG_DESCRIPTION = description;
                item.DLG_API_DEFINE = apidefine;
                item.LUIS_ENTITIES = luisentties;
                item.LUIS_INTENT = luisentent;
                item.GroupS = smallGroup;

                result.push(item);
            }
            
            var group_query = "select distinct GroupL from TBL_DLG where GroupL is not null";
            //var group_query = "SELECT DISTINCT GroupL FROM TBL_DLG WHERE GroupL = '" + searchGroupL + "'";
            let result2 = await pool.request().query(group_query);
            let rows2 = result2.recordset;
            
            var groupList = [];
            for(var i = 0; i < rows2.length; i++){
                var item2 = {};

                var largeGroup = rows2[i].GroupL;

                item2.largeGroup = largeGroup;

                groupList.push(item2);
            }

            if(rows.length > 0){
                res.send({list : result, pageList : paging.pagination(currentPage,rows[0].TOTCNT), groupList: groupList});
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

});

router.post('/dialogs', function (req, res) {
    var searchTxt = req.body.searchTxt;
    var currentPage = req.body.currentPage;

    (async () => {
        try {
            var sourceType = req.body.sourceType;
            var groupType = req.body.groupType;
            var dlg_desQueryString = "select tbp.* from \n" +
                                     "(select ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC) AS NUM, \n" +
                                     "      a.DLG_ID AS DLG_ID, \n" +
                                     "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT, \n"  +
                                     "CEILING((ROW_NUMBER() OVER(ORDER BY LUIS_ENTITIES DESC))/ convert(numeric ,10)) PAGEIDX, \n" +
                                     "DLG_DESCRIPTION, DLG_API_DEFINE ,LUIS_ENTITIES, GroupL, GroupM, GroupS \n" +
                                     "FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b \n" + 
                                     "WHERE a.DLG_ID = b.DLG_ID \n";
            if (req.body.searchTxt !== '') {
                dlg_desQueryString += "AND b.LUIS_ENTITIES like '%" + req.body.searchTxt + "%' \n";
            }
            if (req.body.searchGroupL !== '') {
                dlg_desQueryString += "AND a.GroupL = '" + req.body.searchGroupL + "' \n";
            }
            if (req.body.searchGroupM !== '') {
                dlg_desQueryString += "AND a.GroupM = '" + req.body.searchGroupM + "' \n";
            }
            if (req.body.searchGroupS !== '') {
                dlg_desQueryString += "AND a.GroupS = '" + req.body.searchGroupS + "' \n";
            }
        
                                     
/*
            if (groupType != 'View all') {
                dlg_desQueryString += "and GroupS = '" + groupType + "' ";
            }      
*/
            dlg_desQueryString += "AND DLG_API_DEFINE like '%" + sourceType + "%') tbp \n" +
                                      "WHERE PAGEIDX = @currentPage";
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(dlg_desQueryString);
            let rows = result1.recordset;
            
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                
                var description = rows[i].DLG_DESCRIPTION;
                var apidefine = rows[i].DLG_API_DEFINE;
                var luisentties = rows[i].LUIS_ENTITIES;
                var luisentent = rows[i].LUIS_INTENT;
                var smallGroup = rows[i].GroupS;
                var dialogueId = rows[i].DLG_ID;

                item.DLG_ID = dialogueId;
                item.DLG_DESCRIPTION = description;
                item.DLG_API_DEFINE = apidefine;
                item.LUIS_ENTITIES = luisentties;
                item.LUIS_INTENT = luisentent;
                item.GroupS = smallGroup;

                result.push(item);
            }
            var group_query = "SELECT DISTINCT tbp.GroupL " +
                            "   FROM (SELECT a.GroupL, a.GroupM, GroupS " +
                            "           FROM TBL_DLG a, TBL_DLG_RELATION_LUIS b " +
                            "          WHERE a.DLG_ID = b.DLG_ID   and LUIS_ENTITIES like '%" + searchTxt +  "%' ) tbp " +
                            "  WHERE GroupL is not null";
            //var group_query = "select distinct GroupL from TBL_DLG where GroupL is not null";
            let result2 = await pool.request().query(group_query);
            let rows2 = result2.recordset;
            
            var groupList = [];
            for(var i = 0; i < rows2.length; i++){
                var item2 = {};

                var largeGroup = rows2[i].GroupL;

                item2.largeGroup = largeGroup;

                groupList.push(item2);
            }

            if(rows.length > 0){
                res.send({list : result, pageList : paging.pagination(currentPage,rows[0].TOTCNT), groupList: groupList});
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

router.post('/utterInputAjax', function(req, res, next) {
 
    //view에 있는 data 에서 던진 값을 받아서
    var iptUtterance = req.body['iptUtterance[]'];
    var iptUtteranceArr = [];
    var entitiesArr = [];
    var selBoxArr = [];
    var commonEntitiesArr = [];

    (async () => {
        try {
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            
            //res.send({result:true, iptUtterance:iptUtterance, entities:entities, selBox:rows2, commonEntities: commonEntities});
            for (var i=0; i< (typeof iptUtterance !=='string'? iptUtterance.length : 1); i++) {
                var iptUtterTmp = (typeof iptUtterance ==='string'? iptUtterance:iptUtterance[i]);
                let result1 = await pool.request()
                    .input('iptUtterance', sql.NVarChar, iptUtterTmp)
                    .query('SELECT RESULT FROM dbo.FN_ENTITY_ORDERBY_ADD(@iptUtterance)')
                
                let rows = result1.recordset;
    
                if(rows[0]['RESULT'] != '') {
                    var entities = rows[0]['RESULT'];
                    var entityArr = entities.split(',');
                    var queryString = "";
                    for(var j = 0; j < entityArr.length; j++) {
                        if(j == 0){
                            queryString += "SELECT DISTINCT LUIS_INTENT FROM TBL_DLG_RELATION_LUIS WHERE LUIS_ENTITIES LIKE '%" + entityArr[j] + "%'"
                        }else{
                            queryString += "OR LUIS_ENTITIES LIKE '%" + entityArr[j] + "%'";
                        }
                    }
    
                    let result2 = await pool.request()
                    .query(queryString)
                    
                    let rows2 = result2.recordset
    
                    var queryString2 = "SELECT ENTITY_VALUE,ENTITY FROM TBL_COMMON_ENTITY_DEFINE WHERE ENTITY IN (";
                    for(var j = 0; j < entityArr.length; j++) {
                        queryString2 += "'";
                        queryString2 += entityArr[j];
                        queryString2 += "'";
                        queryString2 += (j != entityArr.length-1)? "," : "";
                    }
                    queryString2 += ")";
                    let result3 = await pool.request()
                    .query(queryString2)
                    
                    let rows3 = result3.recordset
                    var commonEntities = [];
                    for(var j = 0; j < rows3.length; j++) {
                        // 중복되는 엔티티가 있는 경우 길이가 긴 것이 우선순위를 갖음
                        if(iptUtterTmp.indexOf(rows3[j].ENTITY_VALUE) != -1){
                            // 첫번째 엔티티는 등록
                            var isCommonAdd = false;
                            if(commonEntities.length == 0){
                                isCommonAdd = true;
                            }else{
                                for(var k = 0 ; k < commonEntities.length ; k ++){
                                    var longEntity = '';
                                    var shortEntity = '';
                                    var isAdd = false;
                                    if(rows3[j].ENTITY_VALUE.length >= commonEntities[k].ENTITY_VALUE.length){
                                        longEntity = rows3[j].ENTITY_VALUE;
                                        shortEntity = commonEntities[k].ENTITY_VALUE;
                                        isAdd = true;
                                    }else{
                                        longEntity = commonEntities[k].ENTITY_VALUE;
                                        shortEntity = rows3[j].ENTITY_VALUE;
                                    }
                                    if(longEntity.indexOf(shortEntity) != -1){
                                        if(isAdd){
                                            commonEntities.splice(k,1);
                                            isCommonAdd = true;
                                            break;
                                        }
                                    }else{
                                        isAdd = true;
                                    }
                                    if(isAdd && k == commonEntities.length-1){
                                        isCommonAdd = true;
                                    }
                                }
                            }
                            if(isCommonAdd){
                                var item = {};
                                item.ENTITY_VALUE = rows3[j].ENTITY_VALUE;
                                item.ENTITY = rows3[j].ENTITY;
                                commonEntities.push(item);
                            }
                        }
                    }
                    iptUtteranceArr.push(iptUtterTmp);
                    entitiesArr.push(entities);
                    selBoxArr.push(rows2);
                    commonEntitiesArr.push(commonEntities);
                    //res.send({result:true, iptUtterance:iptUtterance, entities:entities, selBox:rows2, commonEntities: commonEntities});
                } else {
                    iptUtteranceArr.push(iptUtterTmp);
                    entitiesArr.push(null);
                    selBoxArr.push(null);
                    commonEntitiesArr.push(null);
                    //res.send({result:true, iptUtterance:iptUtterance});
                }
            }
            res.send({result:true, iptUtterance:iptUtteranceArr, entities:entitiesArr, selBox:selBoxArr, commonEntities: commonEntitiesArr});

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
    } );
});


router.post('/entities', function (req, res) {

    var currentPage = req.body.currentPage;

    (async () => {
        try {
         
            var entitiesQueryString = "select tbp.* from                                                                    "    
                                    + "(select ROW_NUMBER() OVER(ORDER BY api_group DESC) AS NUM,                           "
                                    + "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT,                                         "
                                    + "CEILING((ROW_NUMBER() OVER(ORDER BY api_group DESC))/ convert(numeric ,10)) PAGEIDX, " 
                                    + "entity_value, entity, api_group from ( SELECT DISTINCT entity, API_GROUP , STUFF((   "
                                    + "SELECT '[' + b.entity_value + ']' FROM TBL_COMMON_ENTITY_DEFINE b                    "
                                    + "WHERE b.entity = a.entity FOR XML PATH('') ),1,1,'[') AS entity_value                "
                                    + "FROM TBL_COMMON_ENTITY_DEFINE a where API_GROUP != 'OCR TEST'                        "
                                    + "group by entity, API_GROUP)                                                          "
                                    + "tbl_common_entity_define where api_group != 'OCR TEST') tbp                          "
                                    + "WHERE PAGEIDX = @currentPage                                                         "
            
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).query(entitiesQueryString);

            let rows = result1.recordset;

            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var entitiyValue = rows[i].entity_value;
                var entity = rows[i].entity;
                var apiGroup = rows[i].api_group;

                item.ENTITY_VALUE = entitiyValue;
                item.ENTITY = entity;
                item.API_GROUP = apiGroup;

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

//엔티티 밸류 추가
router.post('/addEntityValue', function (req, res) {
    
    var apiGroup = req.body.apiGroup;
    var entityDefine = req.body.entityDefine;
    var addEntityValue = req.body.addEntityValue;

    (async () => {
        try {

            var insertQueryString1 = "insert into TBL_COMMON_ENTITY_DEFINE(ENTITY, ENTITY_VALUE, API_GROUP) values(@entityDefine, @addEntityValue, @apiGroup)";
                      
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            let result1 = await pool.request()
                .input('entityDefine', sql.NVarChar, entityDefine)
                .input('addEntityValue', sql.NVarChar, addEntityValue)
                .input('apiGroup', sql.NVarChar, apiGroup)
                .query(insertQueryString1);  
            
            res.send({status:200 , message:'insert Success'});
        
        } catch (err) {
            console.log(err);
            res.send({status:500 , message:'insert Entity Error'});
        } finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
    })
    
});

//엔티티 추가
router.post('/insertEntity', function (req, res) {
    
    var entityDefine = req.body.entityDefine;
    var entityValue = req.body.entityValue;
    var apiGroup = req.body.apiGroup;
    (async () => {
        try {
            
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            var selectQuery  = ' SELECT COUNT(*) as count FROM TBL_COMMON_ENTITY_DEFINE ';
                selectQuery += ' WHERE ENTITY_VALUE = @entityValue ';
                selectQuery += ' AND ENTITY = @entityDefine ';
                selectQuery += ' AND API_GROUP = @apiGroup ';
            let result0 = await pool.request()
            .input('entityValue', sql.NVarChar, entityValue)
            .input('entityDefine', sql.NVarChar, entityDefine)
            .input('apiGroup', sql.NVarChar, apiGroup)
            .query(selectQuery);  

            let rows = result0.recordset;

            if(rows[0].count == 0){
                var insertQueryString1 = 'INSERT INTO tbl_common_entity_define(ENTITY, ENTITY_VALUE, API_GROUP) VALUES ' +
                        '(@entityDefine, @entityValue, @apiGroup)';
                
                let result1 = await pool.request()
                    .input('entityDefine', sql.NVarChar, entityDefine)
                    .input('entityValue', sql.NVarChar, entityValue)
                    .input('apiGroup', sql.NVarChar, apiGroup)
                    .query(insertQueryString1);  
            
                res.send({status:200 , message:'insert Success'});
            }else{
                res.send({status:'Duplicate', message:'Duplicate entities exist'});
            }        
        
        } catch (err) {
            console.log(err);
            res.send({status:500 , message:'insert Entity Error'});
        } finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
    })
    
});

//엔티티 검색
router.post('/searchEntities', function (req, res) {

    var currentPage = req.body.currentPage;
    var searchEntities = req.body.searchEntities;
    
    (async () => {
        try {
         
            var entitiesQueryString = "select tbp.* from 																																		"
                                    + "(select ROW_NUMBER() OVER(ORDER BY api_group DESC) AS NUM,                           "
                                    + "COUNT('1') OVER(PARTITION BY '1') AS TOTCNT,                                         "
                                    + "CEILING((ROW_NUMBER() OVER(ORDER BY api_group DESC))/ convert(numeric ,10)) PAGEIDX, "
                                    + "entity_value, entity, api_group from (SELECT DISTINCT entity, API_GROUP , STUFF((    "
                                    + "SELECT '[' + b.entity_value + ']' FROM TBL_COMMON_ENTITY_DEFINE b                    "
                                    + " WHERE b.entity = a.entity AND b.API_GROUP = a.API_GROUP FOR XML PATH('') ),1,1,'[') AS entity_value               "
                                    + "FROM TBL_COMMON_ENTITY_DEFINE a where API_GROUP != 'OCR TEST'                        "
                                    + "and (entity = @searchEntities or entity_value = @searchEntities)                                       "
                                    + "group by entity, API_GROUP) a                                                        "
                                    + " ) tbp                                                                               "
                                    + "WHERE PAGEIDX = 1                                                                    ";
            
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1 = await pool.request().input('currentPage', sql.Int, currentPage).input('searchEntities', sql.NVarChar, searchEntities).query(entitiesQueryString);

            let rows = result1.recordset;

            var result = [];
            for(var i = 0; i < rows.length; i++){
                var item = {};

                var entitiyValue = rows[i].entity_value;
                var entity = rows[i].entity;
                var apiGroup = rows[i].api_group;

                item.ENTITY_VALUE = entitiyValue;
                item.ENTITY = entity;
                item.API_GROUP = apiGroup;

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

router.post('/selectDlgListAjax', function (req, res) {

    var entity = [];
    entity = req.body['entity[]'];
    

    var relationText = "SELECT RNUM, LUIS_ENTITIES, A.DLG_ID DLG_ID, B.DLG_TYPE, DLG_ORDER_NO \n"
                     + "FROM (\n"
                     + "SELECT RANK() OVER(ORDER BY LUIS_ENTITIES) AS RNUM, LUIS_ENTITIES, DLG_ID \n"
                     + "FROM TBL_DLG_RELATION_LUIS \n"
                     + "WHERE 1=1\n";
    if(Array.isArray(entity)){
        for(var i = 0; i < entity.length; i++) {
            if(i == 0) {
                relationText += "AND LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            } else {
                relationText += "OR LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            }      
        }
    } else {
        relationText += "AND LUIS_ENTITIES LIKE '%" + entity +"%'\n";
    }
    
    relationText += "GROUP BY LUIS_ENTITIES, DLG_ID \n"
                 + ") A LEFT OUTER JOIN TBL_DLG B\n"
                 + "ON A.DLG_ID = B.DLG_ID \n"
                 + "WHERE RNUM = 1\n"
                 + "ORDER BY LUIS_ENTITIES desc, DLG_ORDER_NO";

    var dlgText = "SELECT DLG_ID, CARD_TITLE, CARD_TEXT, USE_YN, '2' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_TEXT\n"
                  + "WHERE USE_YN = 'Y'\n"
                  + "AND DLG_ID IN (\n"
                  + "SELECT DISTINCT DLG_ID\n"
                  + "FROM TBL_DLG_RELATION_LUIS\n"
                  + "WHERE 1=1\n";
    if(Array.isArray(entity)){
        for(var i = 0; i < entity.length; i++) {
            if(i == 0) {
                dlgText += "AND LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            } else {
                dlgText += "OR LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            }
        }
    } else {
        dlgText += "AND LUIS_ENTITIES LIKE '%" + entity +"%'\n";
    }

    dlgText += ") \n ORDER BY DLG_ID";

    var dlgCard = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, IMG_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n"
                  + "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n"
                  + "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n"
                  + "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n"
                  + "CARD_ORDER_NO, CARD_VALUE,\n"
                  + "USE_YN, '3' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_CARD\n"
                  + "WHERE USE_YN = 'Y'\n"
                  + "AND DLG_ID IN (\n"
                  + "SELECT DISTINCT DLG_ID\n"
                  + "FROM TBL_DLG_RELATION_LUIS\n"
                  + "WHERE 1=1\n";
    if(Array.isArray(entity)){
        for(var i = 0; i < entity.length; i++) {
            if(i == 0) {
                dlgCard += "AND LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            } else {
                dlgCard += "OR LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            }
        }
    } else{
        dlgCard += "AND LUIS_ENTITIES LIKE '%" + entity +"%'\n";
    }

    dlgCard += ") \n ORDER BY DLG_ID";
    
    var dlgMedia = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, MEDIA_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n"
                  + "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n"
                  + "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n"
                  + "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n"
                  + "CARD_VALUE,\n"
                  + "USE_YN, '4' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_MEDIA\n"
                  + "WHERE USE_YN = 'Y'\n"
                  + "AND DLG_ID IN (\n"
                  + "SELECT DISTINCT DLG_ID\n"
                  + "FROM TBL_DLG_RELATION_LUIS\n"
                  + "WHERE 1=1\n";
    
    if(Array.isArray(entity)){
        for(var i = 0; i < entity.length; i++) {
            if(i == 0) {
                dlgMedia += "AND LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            } else {
                dlgMedia += "OR LUIS_ENTITIES LIKE '%" + entity[i] +"%'\n";
            }
        }
    } else {
        dlgMedia += "AND LUIS_ENTITIES LIKE '%" + entity +"%'\n";
    }

    dlgMedia += ") \n ORDER BY DLG_ID";

    (async () => {
        try {
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            let dlgTextResult = await pool.request()
                .query(dlgText);
            let rowsText = dlgTextResult.recordset;

            let dlgCardResult = await pool.request()
                .query(dlgCard);
            let rowsCard = dlgCardResult.recordset;

            let dlgMediaResult = await pool.request()
                .query(dlgMedia);
            let rowsMedia = dlgMediaResult.recordset;
            
            let result1 = await pool.request()
                .query(relationText)
            let rows = result1.recordset;
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var row = {};
                row.RNUM = rows[i].RNUM;
                row.LUIS_ENTITIES = rows[i].LUIS_ENTITIES;
                row.DLG_ID = rows[i].DLG_ID;
                row.DLG_TYPE = rows[i].DLG_TYPE;
                row.DLG_ORDER_NO = rows[i].DLG_ORDER_NO;
                row.dlg = [];

                let dlg_type = rows[i].DLG_TYPE;
                if(dlg_type == 2){
                    for(var j = 0; j < rowsText.length; j++){
                        let textDlgId = rowsText[j].DLG_ID;
                        if(row.DLG_ID == textDlgId){
                            row.dlg.push(rowsText[j]);
                        }
                    }
                }else if(dlg_type == 3){
                    for(var j = 0; j < rowsCard.length; j++){
                        var cardDlgId = rowsCard[j].DLG_ID;
                        if(row.DLG_ID == cardDlgId){
                            row.dlg.push(rowsCard[j]);
                        }
                    }
                }else if(dlg_type == 4){
                    for(var j = 0; j < rowsMedia.length; j++){
                        var mediaDlgId = rowsMedia[j].DLG_ID;
                        if(row.DLG_ID == mediaDlgId){
                            row.dlg.push(rowsMedia[j]);
                        }
                    }
                }
                result.push(row);
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

//다이얼로그 추가
router.post('/insertDialog', function (req, res) {
    res.send({status:600 , message:'ing...'});
    /*
    var sourceType = req.body.sourceType;
    var largeGroup = req.body.largeGroup;
    var mediumGroup = req.body.mediumGroup;
    var smallGroup = req.body.smallGroup;
    var description = util.nullCheck(req.body.description, null);

    var dlgType = req.body.dlgType; // 2 : text , 3 : carousel , 4 : media
    var dialogOrderNo = req.body.dialogOrderNo;
    var dialogText = util.nullCheck(req.body.dialogText, null);

    var cardOrderNo = req.body.cardOrderNo;

    var buttonName1 = util.nullCheck(req.body.buttonName1, null);
    var buttonName2 = util.nullCheck(req.body.buttonName2, null);
    var buttonName3 = util.nullCheck(req.body.buttonName3, null);
    var buttonName4 = util.nullCheck(req.body.buttonName4, null);
    var buttonContent1 = util.nullCheck(req.body.buttonContent1, null);
    var buttonContent2 = util.nullCheck(req.body.buttonContent2, null);
    var buttonContent3 = util.nullCheck(req.body.buttonContent3, null);
    var buttonContent4 = util.nullCheck(req.body.buttonContent4, null);
    var btn1Type = (buttonName1 != null)? 'imBack' : null;
    var btn2Type = (buttonName2 != null)? 'imBack' : null;
    var btn3Type = (buttonName3 != null)? 'imBack' : null;
    var btn4Type = (buttonName4 != null)? 'imBack' : null;
    var imgUrl = util.nullCheck(req.body.imgUrl, null);

    (async () => {
        try {

            var selectQueryString1 = 'SELECT ISNULL(MAX(DLG_ID)+1,1) AS DLG_ID FROM TBL_DLG';
            let pool = await sql.connect(dbConfig)
            let result1 = await pool.request()
                .query(selectQueryString1)
            let rows1 = result1.recordset;
            
            var insertQueryString1 = 'INSERT INTO TBL_DLG(DLG_ID,DLG_NAME,DLG_DESCRIPTION,DLG_LANG,DLG_TYPE,DLG_ORDER_NO,USE_YN) VALUES ' +
            '(@dlgId,@dialogText,@dialogText,\'KO\',@dlgType,@dialogOrderNo,\'Y\')';

            let result2 = await pool.request()
                .input('dlgId', sql.Int, rows1[0].DLG_ID)
                .input('dialogText', sql.NVarChar, dialogText)
                .input('dlgType', sql.NVarChar, dlgType)
                .input('dialogOrderNo', sql.Int, dialogOrderNo)
                .query(insertQueryString1)  
            //let rows2 = result2.recordset;
            
            var selectQueryString2 = '';
            if(dlgType == '2'){
                selectQueryString2 = 'SELECT ISNULL(MAX(TEXT_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_TEXT';
            }else if(dlgType == '3'){
                selectQueryString2 = 'SELECT ISNULL(MAX(CARD_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_CARD';
            }else if(dlgType == '4'){
                selectQueryString2 = 'SELECT ISNULL(MAX(MEDIA_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_MEDIA';
            }else{
            }
            
            let result3 = await pool.request()
                .query(selectQueryString2)
            let rows3 = result3.recordset; //rows3[0].TYPE_DLG_ID

            var insertQueryString2 = '';
            if(dlgType == '2'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_TEXT(TEXT_DLG_ID,DLG_ID,CARD_TEXT,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,\'Y\')';
            }else if(dlgType == '3'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_CARD(CARD_DLG_ID,DLG_ID,CARD_TEXT,IMG_URL,BTN_1_TYPE,BTN_1_TITLE,BTN_1_CONTEXT,BTN_2_TYPE,BTN_2_TITLE,BTN_2_CONTEXT,BTN_3_TYPE,BTN_3_TITLE,BTN_3_CONTEXT,BTN_4_TYPE,BTN_4_TITLE,BTN_4_CONTEXT,CARD_ORDER_NO,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,@imgUrl,@btn1Type,@buttonName1,@buttonContent1,@btn2Type,@buttonName2,@buttonContent2,@btn3Type,@buttonName3,@buttonContent3,@btn4Type,@buttonName4,@buttonContent4,@cardOrderNo,\'Y\')';
            }else if(dlgType == '4'){
                insertQueryString2 = 'INSERT INTO TBL_DLG_MEDIA(MEDIA_DLG_ID,DLG_ID,CARD_TEXT,MEDIA_URL,BTN_1_TYPE,BTN_1_TITLE,BTN_1_CONTEXT,BTN_2_TYPE,BTN_2_TITLE,BTN_2_CONTEXT,BTN_3_TYPE,BTN_3_TITLE,BTN_3_CONTEXT,BTN_4_TYPE,BTN_4_TITLE,BTN_4_CONTEXT,USE_YN) VALUES ' +
                '(@typeDlgId,@dlgId,@dialogText,@imgUrl,@btn1Type,@buttonName1,@buttonContent1,@btn2Type,@buttonName2,@buttonContent2,@btn3Type,@buttonName3,@buttonContent3,@btn4Type,@buttonName4,@buttonContent4,\'Y\')';
            }else{
            }

            let result4 = await pool.request()
                .input('typeDlgId', sql.Int, rows3[0].TYPE_DLG_ID)
                .input('dlgId', sql.Int, rows1[0].DLG_ID)
                .input('dialogText', sql.NVarChar, dialogText)
                .input('imgUrl', sql.NVarChar, imgUrl)
                .input('btn1Type', sql.NVarChar, btn1Type)
                .input('buttonName1', sql.NVarChar, buttonName1)
                .input('buttonContent1', sql.NVarChar, buttonContent1)
                .input('btn2Type', sql.NVarChar, btn2Type)
                .input('buttonName2', sql.NVarChar, buttonName2)
                .input('buttonContent2', sql.NVarChar, buttonContent2)
                .input('btn3Type', sql.NVarChar, btn3Type)
                .input('buttonName3', sql.NVarChar, buttonName3)
                .input('buttonContent3', sql.NVarChar, buttonContent3)
                .input('btn4Type', sql.NVarChar, btn4Type)
                .input('buttonName4', sql.NVarChar, buttonName4)
                .input('buttonContent4', sql.NVarChar, buttonContent4)
                .input('cardOrderNo', sql.NVarChar, cardOrderNo)
                .query(insertQueryString2)

            res.send({status:200 , message:'insert Success', DLG_ID: rows1[0].DLG_ID, CARD_TEXT: dialogText});
        
        } catch (err) {
            console.log(err);
            res.send({status:500 , message:'insert Dialog Error'});
        } finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
    })
    */
});

router.post('/learnUtterAjax', function (req, res) {
    var intent = req.body.intent;
    var entity = req.body.entity;
    var dlgId = [];
    dlgId = req.body['dlgId[]'];

    var queryText = "INSERT INTO TBL_DLG_RELATION_LUIS(LUIS_ID,LUIS_INTENT,LUIS_ENTITIES,DLG_ID,DLG_API_DEFINE,USE_YN) "
                  + "VALUES( 'kona_luis_06', 'luis_test', @entity, @dlgId, 'D', 'Y' )";
    
    (async () => {
        try {
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            let result1;

            if(typeof dlgId == "string") {
                result1 = await pool.request()
                .input('entity', sql.NVarChar, entity)
                .input('dlgId', sql.NVarChar, dlgId)
                .query(queryText);
            } else {
                for(var i = 0 ; i < dlgId.length; i++) {
                    result1 = await pool.request()
                        .input('entity', sql.NVarChar, entity)
                        .input('dlgId', sql.NVarChar, dlgId[i])
                        .query(queryText);
                }
            }

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


router.post('/deleteRecommend',function(req,res){
    var seqs = req.body.seq;
    var arryseq = seqs.split(',');
        (async () => {
        try{
                let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
                for(var i = 0 ; i < arryseq.length; i ++)
                {
                   var deleteQueryString1 = "UPDATE TBL_QUERY_ANALYSIS_RESULT SET RESULT='T' WHERE seq='"+arryseq[i]+"'";
                   let result5 = await pool.request().query(deleteQueryString1); 
                }
                res.send();
            }catch(err){
            
            }finally {
                sql.close();
            } 
        })()
        
        sql.on('error', err => {
            console.log(err);
        })
});

router.post('/selectGroup',function(req,res){
    var selectId = req.body.selectId;
    var selectValue1 = req.body.selectValue1;
    var selectValue2 = req.body.selectValue2;
    (async () => {
    try{
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            var queryText = "";
            if(selectId == "searchLargeGroup") {
                queryText = "SELECT DISTINCT GroupL AS 'GROUP' FROM TBL_DLG WHERE GroupL IS NOT NULL";
            } else if(selectId == "searchMediumGroup") {
                selectValue1 = selectValue1.trim();
                queryText = "SELECT DISTINCT GroupM AS 'GROUP'\n";
                queryText += "FROM TBL_DLG\n";
                queryText += "WHERE GroupL IS NOT NULL\n";
                queryText += "AND GroupL LIKE '%" + selectValue1 + "%'";
            } else if(selectId == "searchSmallGroup") {
                selectValue1 = selectValue1.trim();
                selectValue2 = selectValue2.trim();
                queryText = "SELECT DISTINCT GroupS AS 'GROUP'\n";
                queryText += "FROM TBL_DLG\n";
                queryText += "WHERE GroupL IS NOT NULL\n";
                queryText += "AND GroupL LIKE '%" + selectValue1 + "%'\n";
                queryText += "AND GroupM LIKE '%" + selectValue2 + "%'";
            }

            let result = await pool.request().query(queryText);
            var rows = result.recordset;

            res.send({rows:rows});
        }catch(err){
            console.log(err);
        }finally {
            sql.close();
        } 
    })()
    
    sql.on('error', err => {
        console.log(err);
    })
});

router.post('/searchDialog',function(req,res){
    var searchLargeGroup = req.body.searchLargeGroup;
    var searchMediumGroup = req.body.searchMediumGroup;
    var searchSmallGroup = req.body.searchSmallGroup;
    var serachDlg = req.body.serachDlg.trim();

    var relationText = "SELECT RNUM, LUIS_ENTITIES, A.DLG_ID DLG_ID, B.DLG_TYPE, DLG_ORDER_NO \n";
        relationText += "FROM (\n";
        relationText += "SELECT RANK() OVER(ORDER BY LUIS_ENTITIES) AS RNUM, LUIS_ENTITIES, DLG_ID \n";
        relationText += "FROM TBL_DLG_RELATION_LUIS \n";
        relationText += "WHERE 1=1\n";
        if(serachDlg) {

            relationText += "AND LUIS_ENTITIES like '%" + serachDlg + "%'\n";
        } else {
            
            if(searchLargeGroup) {
                relationText += "AND LUIS_ID = '" + searchLargeGroup + "'\n";
                if(searchMediumGroup) {
                    relationText += "AND LUIS_INTENT = '" + searchMediumGroup + "'\n";
                    if(searchSmallGroup) {
                        relationText += "AND LUIS_ENTITIES LIKE '%" + searchSmallGroup + "%'\n";
                    }
                }
            }
        }
        relationText += "GROUP BY LUIS_ENTITIES, DLG_ID \n";
        relationText += ") A LEFT OUTER JOIN TBL_DLG B\n";
        relationText += "ON A.DLG_ID = B.DLG_ID \n";
        relationText += "ORDER BY LUIS_ENTITIES, DLG_ORDER_NO";

    var dlgText = "SELECT DLG_ID, CARD_TITLE, CARD_TEXT, USE_YN, '2' AS DLG_TYPE \n"
        dlgText += "FROM TBL_DLG_TEXT\n";
        dlgText += "WHERE USE_YN = 'Y'\n"
        dlgText += "AND DLG_ID IN (\n"
        dlgText += "SELECT DISTINCT DLG_ID\n"
        dlgText += "FROM TBL_DLG_RELATION_LUIS\n"
        dlgText += "WHERE 1=1\n";

        if(serachDlg) {
        
            dlgText += "AND LUIS_ENTITIES like '%" + serachDlg + "%'\n";
        } else {
            if(searchLargeGroup) {
                dlgText += "AND LUIS_ID = '" + searchLargeGroup + "'\n";
                if(searchMediumGroup) {
                    dlgText += "AND LUIS_INTENT = '" + searchMediumGroup + "'\n";
                    if(searchSmallGroup) {
                        dlgText += "AND LUIS_ENTITIES LIKE '%" + searchSmallGroup + "%'\n";
                    }
                }
            }   
        }
        dlgText += ") \n ORDER BY DLG_ID";

    var dlgCard = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, IMG_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n";
        dlgCard += "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n";
        dlgCard += "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n";
        dlgCard += "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n";
        dlgCard += "CARD_ORDER_NO, CARD_VALUE,\n";
        dlgCard += "USE_YN, '3' AS DLG_TYPE \n";
        dlgCard += "FROM TBL_DLG_CARD\n";
        dlgCard += "WHERE USE_YN = 'Y'\n";
        dlgCard += "AND DLG_ID IN (\n";
        dlgCard += "SELECT DISTINCT DLG_ID\n";
        dlgCard += "FROM TBL_DLG_RELATION_LUIS\n";
        dlgCard += "WHERE 1=1\n";

        if(serachDlg) {
        
            dlgCard += "AND LUIS_ENTITIES like '%" + serachDlg + "%'\n";
        } else {

            if(searchLargeGroup) {
                dlgCard += "AND LUIS_ID = '" + searchLargeGroup + "'\n";
                if(searchMediumGroup) {
                    dlgCard += "AND LUIS_INTENT = '" + searchMediumGroup + "'\n";
                    if(searchSmallGroup) {
                        dlgCard += "AND LUIS_ENTITIES LIKE '%" + searchSmallGroup + "%'\n";
                    }
                }
            }
        }
        dlgCard += ") \n ORDER BY DLG_ID";
    
    var dlgMedia = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, MEDIA_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n";
        dlgMedia += "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n";
        dlgMedia += "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n";
        dlgMedia += "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n";
        dlgMedia += "CARD_VALUE,\n";
        dlgMedia += "USE_YN, '4' AS DLG_TYPE \n";
        dlgMedia += "FROM TBL_DLG_MEDIA\n";
        dlgMedia += "WHERE USE_YN = 'Y'\n";
        dlgMedia += "AND DLG_ID IN (\n";
        dlgMedia += "SELECT DISTINCT DLG_ID\n";
        dlgMedia += "FROM TBL_DLG_RELATION_LUIS\n";
        dlgMedia += "WHERE 1=1\n";

        if(serachDlg) {
        
            dlgMedia += "AND LUIS_ENTITIES like '%" + serachDlg + "%'\n";
        } else {

            if(searchLargeGroup) {
                dlgMedia += "AND LUIS_ID = '" + searchLargeGroup + "'\n";
                if(searchMediumGroup) {
                    dlgMedia += "AND LUIS_INTENT = '" + searchMediumGroup + "'\n";
                    if(searchSmallGroup) {
                        dlgMedia += "AND LUIS_ENTITIES LIKE '%" + searchSmallGroup + "%'\n";
                    }
                }
            }
        }
        dlgMedia += ") \n ORDER BY DLG_ID";

    (async () => {
        try{
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            let dlgTextResult = await pool.request()
                .query(dlgText);
            let rowsText = dlgTextResult.recordset;

            let dlgCardResult = await pool.request()
                .query(dlgCard);
            let rowsCard = dlgCardResult.recordset;

            let dlgMediaResult = await pool.request()
                .query(dlgMedia);
            let rowsMedia = dlgMediaResult.recordset;
            
            let result1 = await pool.request()
                .query(relationText)
            let rows = result1.recordset;
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var row = {};
                row.RNUM = rows[i].RNUM;
                row.LUIS_ENTITIES = rows[i].LUIS_ENTITIES;
                row.DLG_ID = rows[i].DLG_ID;
                row.DLG_TYPE = rows[i].DLG_TYPE;
                row.DLG_ORDER_NO = rows[i].DLG_ORDER_NO;
                row.dlg = [];
                
                let dlg_type = rows[i].DLG_TYPE;
                if(dlg_type == 2){
                    for(var j = 0; j < rowsText.length; j++){
                        let textDlgId = rowsText[j].DLG_ID;
                        if(row.DLG_ID == textDlgId){
                            row.dlg.push(rowsText[j]);
                        }
                    }
                }else if(dlg_type == 3){
                    for(var j = 0; j < rowsCard.length; j++){
                        var cardDlgId = rowsCard[j].DLG_ID;
                        if(row.DLG_ID == cardDlgId){                       
                            row.dlg.push(rowsCard[j]);
                        }
                    }
                }else if(dlg_type == 4){
                    for(var j = 0; j < rowsMedia.length; j++){
                        var mediaDlgId = rowsMedia[j].DLG_ID;
                        if(row.DLG_ID == mediaDlgId){
                            row.dlg.push(rowsMedia[j]);
                        }
                    }
                }
                result.push(row);
            }

            res.send({list : result});
        
        }catch(err){
            console.log(err);
        }finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
        sql.close();
        console.log(err);
    })

});


router.post('/addDialog',function(req,res){
    var entity = req.body['entity'];
    var data = req.body['data[]'];
    var array = [];
    var queryText = "";
    var tblDlgId = [];
    if( typeof data == "string"){
        console.log("data is string");
        var json = JSON.parse(data);

        for( var key in json) {
            console.log("key : " + key + " value : " + json[key]);
        }
    
    } else {
        console.log("data is object");

        //array = JSON.parse(data);
        
        var dataIdx = data.length;
        
        for(var i = 0; i < dataIdx; i++) {
            array[i] = JSON.parse(data[i]);
        }
        
        for(var i = 0; i < array.length; i++) {
            for( var key in array[i]) {
                console.log("key : " + key + " value : " + array[i][key]);
            }
        }
    }

    (async () => {
        try{
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);
            var selectDlgId = 'SELECT ISNULL(MAX(DLG_ID)+1,1) AS DLG_ID FROM TBL_DLG';
            var selectTextDlgId = 'SELECT ISNULL(MAX(TEXT_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_TEXT';
            var selectCarouselDlgId = 'SELECT ISNULL(MAX(CARD_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_CARD';
            var selectMediaDlgId = 'SELECT ISNULL(MAX(MEDIA_DLG_ID)+1,1) AS TYPE_DLG_ID FROM TBL_DLG_MEDIA';
            var insertTblDlg = 'INSERT INTO TBL_DLG(DLG_ID,DLG_NAME,DLG_DESCRIPTION,DLG_LANG,DLG_TYPE,DLG_ORDER_NO,USE_YN) VALUES ' +
            '(@dlgId,@dialogText,@dialogText,\'KO\',@dlgType,@dialogOrderNo,\'Y\')';
            var inserTblDlgText = 'INSERT INTO TBL_DLG_TEXT(TEXT_DLG_ID,DLG_ID,CARD_TITLE,CARD_TEXT,USE_YN) VALUES ' +
            '(@textDlgId,@dlgId,@dialogTitle,@dialogText,\'Y\')';
            var insertTblCarousel = 'INSERT INTO TBL_DLG_CARD(CARD_DLG_ID,DLG_ID,CARD_TITLE,CARD_TEXT,IMG_URL,BTN_1_TYPE,BTN_1_TITLE,BTN_1_CONTEXT,BTN_2_TYPE,BTN_2_TITLE,BTN_2_CONTEXT,BTN_3_TYPE,BTN_3_TITLE,BTN_3_CONTEXT,BTN_4_TYPE,BTN_4_TITLE,BTN_4_CONTEXT,CARD_ORDER_NO,USE_YN) VALUES ' +
            '(@typeDlgId,@dlgId,@dialogTitle,@dialogText,@imgUrl,@btn1Type,@buttonName1,@buttonContent1,@btn2Type,@buttonName2,@buttonContent2,@btn3Type,@buttonName3,@buttonContent3,@btn4Type,@buttonName4,@buttonContent4,@cardOrderNo,\'Y\')';
            var insertTblDlgMedia = 'INSERT INTO TBL_DLG_MEDIA(MEDIA_DLG_ID,DLG_ID,CARD_TITLE,CARD_TEXT,MEDIA_URL,BTN_1_TYPE,BTN_1_TITLE,BTN_1_CONTEXT,BTN_2_TYPE,BTN_2_TITLE,BTN_2_CONTEXT,BTN_3_TYPE,BTN_3_TITLE,BTN_3_CONTEXT,BTN_4_TYPE,BTN_4_TITLE,BTN_4_CONTEXT,CARD_VALUE,USE_YN) VALUES ' +
            '(@mediaDlgId,@dlgId,@dialogTitle,@dialogText,@imgUrl,@btn1Type,@buttonName1,@buttonContent1,@btn2Type,@buttonName2,@buttonContent2,@btn3Type,@buttonName3,@buttonContent3,@btn4Type,@buttonName4,@buttonContent4,@cardValue,\'Y\')';
            var insertTblRelation = "INSERT INTO TBL_DLG_RELATION_LUIS(LUIS_ID,LUIS_INTENT,LUIS_ENTITIES,DLG_ID,DLG_API_DEFINE,USE_YN) " + 
            "VALUES( 'kona_luis_06', 'luis_test', @entity, @dlgId, 'D', 'Y' )";

            var largeGroup = array[array.length - 1]["largeGroup"];
            var sourceType = array[array.length - 1]["sourceType"];
            var description = array[array.length - 1]["description"];

            for(var i = 0; i < (array.length-1); i++) {
                if(array[i]["dlgType"] == "2") {
                    let result1 = await pool.request()
                    .query(selectDlgId)
                    let dlgId = result1.recordset;

                    let result2 = await pool.request()
                    .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                    .input('dialogText', sql.NVarChar, description)
                    .input('dlgType', sql.NVarChar, array[i]["dlgType"])
                    .input('dialogOrderNo', sql.Int, (i+1))
                    .query(insertTblDlg)

                    let result3 = await pool.request()
                    .query(selectTextDlgId)
                    let textDlgId = result3.recordset;

                    let result4 = await pool.request()
                    .input('textDlgId', sql.Int, textDlgId[0].TYPE_DLG_ID)
                    .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                    .input('dialogTitle', sql.NVarChar, array[i]["dialogTitle"])
                    .input('dialogText', sql.NVarChar, array[i]["dialogText"])
                    .query(inserTblDlgText)

                    tblDlgId.push(dlgId[0].DLG_ID);

                } else if(array[i]["dlgType"] == "3") {
                    let result1 = await pool.request()
                    .query(selectDlgId)
                    let dlgId = result1.recordset;
                    
                    let result2 = await pool.request()
                    .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                    .input('dialogText', sql.NVarChar, description)
                    .input('dlgType', sql.NVarChar, array[i]["dlgType"])
                    .input('dialogOrderNo', sql.Int, (i+1))
                    .query(insertTblDlg)

                    for (var j=0; j<array[i].carouselArr.length; j++) {
                        var carTmp = array[i].carouselArr[j];
                        
                        carTmp["btn1Type"] = (carTmp["cButtonContent1"] != "") ? carTmp["btn1Type"] : "";
                        carTmp["btn2Type"] = (carTmp["cButtonContent2"] != "") ? carTmp["btn2Type"] : "";
                        carTmp["btn3Type"] = (carTmp["cButtonContent3"] != "") ? carTmp["btn3Type"] : "";
                        carTmp["btn4Type"] = (carTmp["cButtonContent4"] != "") ? carTmp["btn4Type"] : "";

                        let result2 = await pool.request()
                        .input('typeDlgId', sql.NVarChar, array[i].dlgType)
                        .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                        .input('dialogTitle', sql.NVarChar, carTmp["dialogTitle"])
                        .input('dialogText', sql.NVarChar, carTmp["dialogText"])
                        .input('imgUrl', sql.NVarChar, carTmp["imgUrl"])
                        .input('btn1Type', sql.NVarChar, carTmp["btn1Type"])
                        .input('buttonName1', sql.NVarChar, carTmp["cButtonName1"])
                        .input('buttonContent1', sql.NVarChar, carTmp["cButtonContent1"])
                        .input('btn2Type', sql.NVarChar, carTmp["btn2Type"])
                        .input('buttonName2', sql.NVarChar, carTmp["cButtonName2"])
                        .input('buttonContent2', sql.NVarChar, carTmp["cButtonContent2"])
                        .input('btn3Type', sql.NVarChar, carTmp["btn3Type"])
                        .input('buttonName3', sql.NVarChar, carTmp["cButtonName3"])
                        .input('buttonContent3', sql.NVarChar, carTmp["cButtonContent3"])
                        .input('btn4Type', sql.NVarChar, carTmp["btn4Type"])
                        .input('buttonName4', sql.NVarChar, carTmp["cButtonName4"])
                        .input('buttonContent4', sql.NVarChar, carTmp["cButtonContent4"])
                        .input('cardOrderNo', sql.Int, (j+1))
                        .query(insertTblCarousel);

                    }

                    tblDlgId.push(dlgId[0].DLG_ID);

                } else if(array[i]["dlgType"] == "4") {
                    let result1 = await pool.request()
                    .query(selectDlgId)
                    let dlgId = result1.recordset;

                    let result2 = await pool.request()
                    .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                    .input('dialogText', sql.NVarChar, description)
                    .input('dlgType', sql.NVarChar, array[i]["dlgType"])
                    .input('dialogOrderNo', sql.Int, (i+1))
                    .query(insertTblDlg)

                    let result3 = await pool.request()
                    .query(selectMediaDlgId)
                    let mediaDlgId = result3.recordset;

                    let result4 = await pool.request()
                    .input('mediaDlgId', sql.Int, mediaDlgId[0].TYPE_DLG_ID)
                    .input('dlgId', sql.Int, dlgId[0].DLG_ID)
                    .input('dialogTitle', sql.NVarChar, array[i]["dialogTitle"])
                    .input('dialogText', sql.NVarChar, array[i]["dialogText"])
                    .input('imgUrl', sql.NVarChar, array[i]["imgUrl"])
                    .input('btn1Type', sql.NVarChar, array[i]["btn1Type"])
                    .input('buttonName1', sql.NVarChar, array[i]["mButtonName1"])
                    .input('buttonContent1', sql.NVarChar, array[i]["mButtonContent1"])
                    .input('btn2Type', sql.NVarChar, array[i]["dialogTitle"])
                    .input('buttonName2', sql.NVarChar, array[i]["mButtonName2"])
                    .input('buttonContent2', sql.NVarChar, array[i]["mButtonContent2"])
                    .input('btn3Type', sql.NVarChar, array[i]["dialogTitle"])
                    .input('buttonName3', sql.NVarChar, array[i]["mButtonName3"])
                    .input('buttonContent3', sql.NVarChar, array[i]["mButtonContent3"])
                    .input('btn4Type', sql.NVarChar, array[i]["dialogTitle"])
                    .input('buttonName4', sql.NVarChar, array[i]["mButtonName4"])
                    .input('buttonContent4', sql.NVarChar, array[i]["mButtonContent4"])
                    .input('cardValue', sql.NVarChar, array[i]["mediaUrl"])
                    .query(insertTblDlgMedia)

                    tblDlgId.push(dlgId[0].DLG_ID);
                }
            }

            res.send({list : tblDlgId});
        
        }catch(err){
            console.log(err);
        }finally {
            sql.close();
        }
    })()
    
    sql.on('error', err => {
        sql.close();
        console.log(err);
    })

});




router.post('/getDlgAjax', function (req, res) {

    var entity = [];
    var dlgID = req.body.dlgID;
    var selectDlgType = "SELECT DLG_TYPE \n" +
                        "  FROM TBL_DLG \n" +
                        " WHERE DLG_ID=" + dlgID + " \n";

    /*
    var relationText = "SELECT RNUM, LUIS_ENTITIES, A.DLG_ID DLG_ID, B.DLG_TYPE, DLG_ORDER_NO \n";
        relationText += "FROM (\n";
        relationText += "SELECT RANK() OVER(ORDER BY LUIS_ENTITIES) AS RNUM, LUIS_ENTITIES, DLG_ID \n";
        relationText += "FROM TBL_DLG_RELATION_LUIS \n";
        relationText += "WHERE 1=1\n";
        relationText += "AND  DLG_ID=" + dlgID + " \n";
        relationText += "GROUP BY LUIS_ENTITIES, DLG_ID \n";
        relationText += ") A LEFT OUTER JOIN TBL_DLG B\n";
        relationText += "ON A.DLG_ID = B.DLG_ID \n";
        relationText += "ORDER BY LUIS_ENTITIES, DLG_ORDER_NO";
    */
    var dlgText = "SELECT DLG_ID, CARD_TITLE, CARD_TEXT, USE_YN, '2' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_TEXT\n"
                  + "WHERE 1=1 \n"
                  + "AND USE_YN = 'Y'\n"
                  + "AND DLG_ID = " + dlgID + " \n";
                  + "ORDER BY DLG_ID";

    var dlgCard = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, IMG_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n"
                  + "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n"
                  + "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n"
                  + "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n"
                  + "CARD_ORDER_NO, CARD_VALUE,\n"
                  + "USE_YN, '3' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_CARD\n"
                  + "WHERE 1=1\n"
                  + "AND USE_YN = 'Y'\n"
                  + "AND DLG_ID = " + dlgID + " \n";
                  + "ORDER BY DLG_ID";
    
    var dlgMedia = "SELECT DLG_ID, CARD_TEXT, CARD_TITLE, MEDIA_URL, BTN_1_TYPE, BTN_1_TITLE, BTN_1_CONTEXT,\n"
                  + "BTN_2_TYPE, BTN_2_TITLE, BTN_2_CONTEXT,\n"
                  + "BTN_3_TYPE, BTN_3_TITLE, BTN_3_CONTEXT,\n"
                  + "BTN_4_TYPE, BTN_4_TITLE, BTN_4_CONTEXT,\n"
                  + "CARD_VALUE,\n"
                  + "USE_YN, '4' AS DLG_TYPE \n"
                  + "FROM TBL_DLG_MEDIA\n"
                  + "WHERE 1=1\n"
                  + "AND USE_YN = 'Y'\n"
                  + "AND DLG_ID = " + dlgID + " \n";
                  + "ORDER BY DLG_ID";
    

    (async () => {
        try {
            let pool = await dbConnect.getAppConnection(sql, req.session.appName, req.session.dbValue);

            let dlgTextResult = await pool.request()
                .query(dlgText);
            let rowsText = dlgTextResult.recordset;

            let dlgCardResult = await pool.request()
                .query(dlgCard);
            let rowsCard = dlgCardResult.recordset;

            let dlgMediaResult = await pool.request()
                .query(dlgMedia);
            let rowsMedia = dlgMediaResult.recordset;
            
            let result1 = await pool.request()
                .query(selectDlgType)
            let rows = result1.recordset;
            var result = [];
            for(var i = 0; i < rows.length; i++){
                var row = {};
                row.DLG_TYPE = rows[i].DLG_TYPE;
                row.DLG_ID = dlgID;
                row.dlg = [];

                let dlg_type = rows[i].DLG_TYPE;
                if(dlg_type == 2){
                    for(var j = 0; j < rowsText.length; j++){
                        let textDlgId = rowsText[j].DLG_ID;
                        if(row.DLG_ID == textDlgId){
                            row.dlg.push(rowsText[j]);
                        }
                    }
                }else if(dlg_type == 3){
                    for(var j = 0; j < rowsCard.length; j++){
                        var cardDlgId = rowsCard[j].DLG_ID;
                        if(row.DLG_ID == cardDlgId){
                            row.dlg.push(rowsCard[j]);
                        }
                    }
                }else if(dlg_type == 4){
                    for(var j = 0; j < rowsMedia.length; j++){
                        var mediaDlgId = rowsMedia[j].DLG_ID;
                        if(row.DLG_ID == mediaDlgId){
                            row.dlg.push(rowsMedia[j]);
                        }
                    }
                }
                result.push(row);
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






module.exports = router;

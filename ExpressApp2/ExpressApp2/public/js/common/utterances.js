



// 대사표시방법 (ctrl + e) 
var iVal = 1;
$(document).keydown(function(e) {
    if (e.ctrlKey == true && e.which == 69) {
        // Ctrl + E 를 할 때  entityInfo 작업중인 라벨링이 있다면 삭제 처리 
        $('input[name=entityInfo]').each(function(e) {
           if($(this).val() == null || $(this).val() == "") {
               $(this).remove();
           }
        });

        iVal++;
        if (iVal ==  3) iVal = 0;
        var valueTokenArr = ["tokens","entities","compositeEntities"];
        $("select[name=tokenStyleSelectBox]").val(valueTokenArr[iVal]).trigger("change");
        return false;
    }
});

$(document).ready(function(){

    // recommend에서 넘어온 문장 insert
    var recommendParam = $('#utterence').val();
    if(recommendParam){
        utterInput(recommendParam);
    }
    // Utterance 입력
    $("#iptUtterance").keypress(function(e) {

        if (e.keyCode == 13){	//	Enter Key

            $("#entityUtteranceTextTable tbody").html("");
            $("#dialogRecommand").html("");

            $("#iptUtterance").attr("readonly",true);
            var queryText = $(this).val();
            if(queryText.trim() == "" || queryText.trim() == null) {
                $("#iptUtterance").attr("readonly",false);
                return false;
            }
            utterInput(queryText);

            $("#iptUtterance").attr("readonly",false);
        }

    });

    // Utterance 삭제
    $('#utterLearn').click(function(){
        
        var utterBox = $("#entityUtteranceTextTable div[type=checkbox]");
        var intent = "";
        var entity = "";
        var dlgId = "";
        utterBox.each(function(n){
    
            if ($(utterBox[n]).attr("checked") == "checked") {
                var tr = $(utterBox[n]).parent().parent();
                var td = tr.children();
                intent = $(td.eq(2).children()).val();
                entity = $(td.eq(1).children()).val();        
            }
        });

        var dlgBox = $("#dlgListTable div[type=checkbox]");

        dlgBox.each(function(n){
    
            if ($(dlgBox[n]).attr("checked") == "checked") {
                var tr = $(dlgBox[n]).parent().parent();
                var td = tr.children();
                dlgId = $(td.eq(1).children()).val();
            }
        });

        $.ajax({
            url: '/learning/learnUtterAjax',
            dataType: 'json',
            type: 'POST',
            data: {'intent':intent, 'entity':entity, 'dlgId':dlgId},
            success: function(result) {
                if(result['result'] == true) {
                    alert("추가 하였습니다.");

                    $('.checkUtter').each(function(){
                        if($(this).attr('checked') == 'checked') {
                            $(this).parent().parent().remove();
                        }
                    });
                    $('input[name=ch1All]').parent().attr('checked', false);
                    changeBtnAble(false);

                    $('#dlgListTable tbody').remove();

                    $('#utterLearn').attr("disabled", "disabled");
                    $('#utterLearn').addClass("disable"); 
                }else{
                    alert("실패하였습니다.");
                }
            }
        });

    });

    // Utterance 삭제
    $('#utterDelete').click(function(){

        $('.checkUtter').each(function(){
            if($(this).attr('checked') == 'checked') {
                $('#entityUtteranceTextTable tbody').html('');
                //$(this).parent().parent().remove();
            }
        });
        $('input[name=ch1All]').parent().attr('checked', false);
        changeBtnAble(false);
    });

    //다이얼로그 생성 모달 닫는 이벤트(초기화)
    $(".js-modal-close").click(function() {
        $('html').css({'overflow': 'auto', 'height': '100%'}); //scroll hidden 해제
        //$('#element').off('scroll touchmove mousewheel'); // 터치무브 및 마우스휠 스크롤 가능

        $('#appInsertDes').val('');
        $("#intentList option:eq(0)").attr("selected", "selected");
        //$('#intentList').find('option:first').attr('selected', 'selected');
        initMordal('intentList', 'Select Intent');
        initMordal('entityList', 'Select Entity');
        $('#dlgLang').find('option:first').attr('selected', 'selected');
        $('#dlgOrder').find('option:first').attr('selected', 'selected');
        $('#layoutBackground').hide();
    });

    //utter 체크박스 전체선택 
    $('#allCheck').parent().click(function() {
        var checkedVal = false;
        if (typeof $('#allCheck').parent().attr('checked') != 'undefined') {
            $("input[name=ch1]").each(function() {
                if ( typeof $(this).parent().attr("checked") == 'undefined' ) {
                    $(this).parent().click();
                } 
                checkedVal = true;
            });
        } else {
            $("input[name=ch1]").each(function() {
                if ( typeof $(this).parent().attr("checked") != 'undefined' ) {
                    $(this).parent().click();
                }
                checkedVal = false;
            });
        }
        changeBtnAble('delete', checkedVal);
    });

	$('#addDialogClose , #addDialogCancel').click(function(){
        $('#mediaCarouselLayout').css('display','none');
        $('#cardLayout').css('display','none');
        $('#appInsertForm')[0].reset();
        $('#dialogPreview').html('');
    });

    //dlg 체크박스 전체선택 
    $('#checkAllDlg').parent().click(function() {
        //var checkedVal = false;
        
        if (typeof $('#checkAllDlg').parent().attr('checked') != 'undefined') {
            $("input[name=dlgChk]").each(function() {
                if ( typeof $(this).parent().attr("checked") == 'undefined' ) {
                    $(this).parent().click();
                } 
                //checkedVal = true;
            });
        } else {
            $("input[name=dlgChk]").each(function() {
                if ( typeof $(this).parent().attr("checked") != 'undefined' ) {
                    $(this).parent().click();
                }
               //checkedVal = false;
            });
        }
    });
    
    // 타입 변경시 버튼, 이미지 관련 input 생성 및 삭제
    $('#dlgType').change(function(e){
        if($(e.target).val() == "2"){
            $('#mediaCarouselLayout').css('display','none');
            $('#cardLayout').css('display','none');
        }else if($(e.target).val() == "4"){
            $('#mediaCarouselLayout').css('display','block');
            $('#cardLayout').css('display','none');
        }else{
            $('#mediaCarouselLayout').css('display','block');
            $('#cardLayout').css('display','block');
        }
        openModalBox('#create_dlg');
    });

    //다이얼로그 Add
    $('#addDialogBtn').click(function(e){
        var dlgType = $('#dlgType').val();
        var dlgHtml = '';
        if(dlgType == '2'){ //text
            if($('#dialogText').val() == ''){
                alert('다이얼로그 텍스트를 입력하세요');
            }else{
                dlgHtml += '<div class="wc-message wc-message-from-bot" style="width:90%;">';
                dlgHtml += '<div class="wc-message-content">';
                dlgHtml += '<svg class="wc-message-callout"></svg>';
                dlgHtml += '<div><div class="format-markdown"><div class="textMent">';
                dlgHtml += '<p>';
                dlgHtml += $('#dialogText').val();
                dlgHtml += '</p>';
                dlgHtml += '</div></div></div></div></div>';
            }

            $('#dialogPreview').append(dlgHtml);
        }else if(dlgType == '3'){ //carousel
            if($('#add-carousel').length == 0){ //초기 append
                dlgHtml += '<div id="add-carousel">';
                dlgHtml += '<div class="wc-message wc-message-from-bot">';
                dlgHtml += '<div class="wc-message-content"><!-- react-empty: 124 -->';
                dlgHtml += '<svg class="wc-message-callout"></svg>';
                dlgHtml += '<div>';
                dlgHtml += '<div class="wc-carousel" style="width: 312px;">';
                dlgHtml += '<div>';
                dlgHtml += '<div class="wc-hscroll-outer">';
                dlgHtml += '<div class="wc-hscroll" style="margin-bottom: 0px;">';
                dlgHtml += '<ul>';
                dlgHtml += '<li class="wc-carousel-item">';
                dlgHtml += '<div class="wc-card hero">';
                dlgHtml += '<div class="wc-container imgContainer">';
                dlgHtml += '<img src="https://bot.hyundai.com/assets/images/mainfeatureImg/01_Kona.jpg">';
                dlgHtml += '</div>';
                //dlgHtml += '<h1>Kona 핵심기능</h1>';
                dlgHtml += '<p class="carousel">'+$('#dialogText').val()+'</p>';
                dlgHtml += '<ul class="wc-card-buttons">';
                for(var i = 0 ; i < $('input[id^="buttonName"]').length ; i ++){
                    if($('#buttonName' + (i+1)).val() != ''){
                        dlgHtml += '<li>';
                        dlgHtml += '<button>'+$('#buttonName' + (i+1)).val()+'</button>';
                        dlgHtml += '</li>';
                    }
                }
                dlgHtml += '</ul>';
                dlgHtml += '</div>';
                dlgHtml += '</li>';
                dlgHtml += '</ul>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';
                dlgHtml += '</div>';

                $('#dialogPreview').append(dlgHtml);
            }else{
                if($('#add-carousel').length == 1){
                    var prevBtnHtml = '';
                    var afterBtnHtml = '';
    
                    prevBtnHtml += '<button class="scroll previous">';
                    prevBtnHtml += '<img src="https://bot.hyundai.com/assets/images/02_contents_carousel_btn_left_401x.png">';
                    prevBtnHtml += '</button>';
                    afterBtnHtml += '<button class="scroll next">';
                    afterBtnHtml += '<img src="https://bot.hyundai.com/assets/images/02_contents_carousel_btn_right_401x.png">';
                    afterBtnHtml += '</button>';
    
                    $('.wc-carousel > div').prepend(prevBtnHtml);
                    $('.wc-carousel > div').append(afterBtnHtml);

                    $('.scroll.previous').click(function(e){
                        scrollPrevoius();
                        e.stopPropagation();
                        e.preventDefault();
                    })
                    $('.scroll.next').click(function(e){
                        scrollNext();
                        e.stopPropagation();
                        e.preventDefault();
                    })
                }
                
                var dlgHtml = '';
                dlgHtml += '<li class="wc-carousel-item">';
                dlgHtml += '<div class="wc-card hero">';
                dlgHtml += '<div class="wc-container imgContainer">';
                dlgHtml += '<img src="https://bot.hyundai.com/assets/images/style/USP_style_03.jpg">';
                dlgHtml += '</div>';
                //dlgHtml += '<h1>스타일</h1>';
                dlgHtml += '<p class="carousel">'+$('#dialogText').val()+'</p>';
                dlgHtml += '<ul class="wc-card-buttons">';
                for(var i = 0 ; i < $('input[id^="buttonName"]').length ; i ++){
                    if($('#buttonName' + (i+1)).val() != ''){
                        dlgHtml += '<li>';
                        dlgHtml += '<button>'+$('#buttonName' + (i+1)).val()+'</button>';
                        dlgHtml += '</li>';
                    }
                }
                dlgHtml += '</ul>';
                dlgHtml += '</div>';
                dlgHtml += '</li>';

                $('.wc-hscroll > ul').append(dlgHtml);
            }
        }else if(dlgType == '4'){ //media

        }else{
        }

        $('#appInsertForm')[0].reset();
        $('#dlgType').change();

        e.stopPropagation();
        e.preventDefault();
    });

});

//intent selbox 선택
$(document).on('change','#intentNameList',function(event){
    selectDlgListAjax($("#intentNameList option:selected").val());
});


//슬라이드
function scrollPrevoius(){
}
function scrollNext(){
}
//다이얼로그 생성 유효성 검사
function dialogValidation(type){
    if(type == 'dialogInsert'){
        var dialogText = $('#dialogText').val();
        
        if(dialogText != "") {
            $('#btnAddDlg').removeClass("disable");
            $('#btnAddDlg').attr("disabled", false);
        } else {
            $('#btnAddDlg').attr("disabled", "disabled");
            $('#btnAddDlg').addClass("disable");
        }
    }
}

//다이얼로그 생성
function insertDialog(){

    $.ajax({
        url: '/learning/insertDialog',
        dataType: 'json',
        type: 'POST',
        data: $('#appInsertForm').serializeObject(),
        success: function(data) {
            if(data.status == 200){
                var inputUttrHtml = '';
                inputUttrHtml += '<tr> <td> <div class="check-radio-tweak-wrapper" type="checkbox">';
                inputUttrHtml += '<input name="dlgChk" class="tweak-input"  onclick="" type="checkbox"/> </div> </td>';
                inputUttrHtml += '<td class="txt_left" ><input type="hidden" name="' + data.DLG_ID + '" value="' + data.DLG_ID + '" />' + data.CARD_TEXT + '</td></tr>';
                $('#dlgListTable').find('tbody').prepend(inputUttrHtml);

                $('#addDialogClose').click();
            }
        }
    });
}

function selectDlgListAjax(entity) {
    $.ajax({
        url: '/learning/selectDlgListAjax',                //주소
        dataType: 'json',                  //데이터 형식
        type: 'POST',                      //전송 타입
        data: {'entity':entity},      //데이터를 json 형식, 객체형식으로 전송

        success: function(result) {          //성공했을 때 함수 인자 값으로 결과 값 나옴
            var inputUttrHtml = '';
            for (var i=0; i<result['list'].length; i++) {
                var tmp = result['list'][i];

                for(var j = 0; j < tmp.dlg.length; j++) {
                    if(tmp.dlg[j].DLG_TYPE == 2) {
                        inputUttrHtml += '<div class="wc-message wc-message-from-bot" style="width:90%;">';
                        inputUttrHtml += '<div class="wc-message-content" style="width:90%;">';
                        inputUttrHtml += '<svg class="wc-message-callout"></svg>';
                        inputUttrHtml += '<div><div class="format-markdown"><div class="textMent">';
                        inputUttrHtml += '<p>';
                        inputUttrHtml += tmp.dlg[j].CARD_TEXT;
                        inputUttrHtml += '</p>';
                        inputUttrHtml += '</div></div></div></div></div>';
                    } else if(tmp.dlg[j].DLG_TYPE == 3) {
                        if(j == 0) {
                            inputUttrHtml += '<div class="wc-message wc-message-from-bot" style="width:90%">';
                            inputUttrHtml += '<div class="wc-message-content" style="width:90%;">';
                            inputUttrHtml += '<svg class="wc-message-callout"></svg>';
                            inputUttrHtml += '<div class="wc-carousel" style="width: 312px;">';
                            inputUttrHtml += '<div>';
                            inputUttrHtml += '<button class="scroll previous">';
                            inputUttrHtml += '<img src="https://bot.hyundai.com/assets/images/02_contents_carousel_btn_left_401x.png">';
                            inputUttrHtml += '</button>';
                            inputUttrHtml += '<div class="wc-hscroll-outer">';
                            inputUttrHtml += '<div class="wc-hscroll" style="margin-bottom: 0px;">';
                            inputUttrHtml += '<ul>';
                        }

                        inputUttrHtml += '<li class="wc-carousel-item">';
                        inputUttrHtml += '<div class="wc-card hero">';
                        inputUttrHtml += '<div class="wc-container imgContainer">';
                        inputUttrHtml += '<img src="' + tmp.dlg[j].IMG_URL +'">';
                        inputUttrHtml += '</div>';
                        if(tmp.dlg[j].CARD_TITLE != null) {
                            inputUttrHtml += '<h1>' + /*cardtitle*/ tmp.dlg[j].CARD_TITLE + '</h1>';
                        }
                        if(tmp.dlg[j].CARD_TEXT != null) {
                            inputUttrHtml += '<p class="carousel">' + /*cardtext*/ tmp.dlg[j].CARD_TEXT + '</p>';
                        }
                        inputUttrHtml += '<ul class="wc-card-buttons"><li><button>' + /*btntitle*/ tmp.dlg[j].BTN_1_TITLE + '<button></li></ul>';
                        inputUttrHtml += '</div>';
                        inputUttrHtml += '</li>';
                        
                        if((tmp.dlg.length-1) == j) {
                            inputUttrHtml += '</ul>';
                            inputUttrHtml += '</div>';
                            inputUttrHtml += '</div>';
                            inputUttrHtml += '<button class="scroll next"><img src="https://bot.hyundai.com/assets/images/02_contents_carousel_btn_right_401x.png"></button>';
                            inputUttrHtml += '</div></div></div></div></div>';
                        }
                    } else if(tmp.dlg[j].DLG_TYPE == 4) {

                    }
                }

                //inputUttrHtml += '<tr> <td> <div class="check-radio-tweak-wrapper" type="checkbox">';
                //inputUttrHtml += '<input name="dlgChk" class="tweak-input"  onclick="" type="checkbox"/> </div> </td>';
                //inputUttrHtml += '<td class="txt_left" ><input type="hidden" name="' + tmp.DLG_ID + '" value="' + tmp.DLG_ID + '" />' + tmp.CARD_TEXT + '</td></tr>';
                //inputUttrHtml += '<td class="txt_center" > <a href="#" class="btn btn-small">Add</a> </td></tr>';
            }//<a href="#" class="btn b02  btn-small js-modal-close">Cancel</a>
            //$('#dlgListTable').find('tbody').empty();
            $('#dialogRecommand').prepend(inputUttrHtml);
        } 

    }); // ------      ajax 끝-----------------
}

//checkbox 선택시 이벤트 $(this).attr("checked")
$(document).on('click','div[type=checkbox]',function(event){
    
    var checkedVal = false;
    var checkedVal2 = false;

    if (typeof $(this).attr("checked") == 'undefined') {
        $(this).attr("checked", "");
    } else {
        $(this).removeAttr('checked');
    }
    

    $("input[name=ch1]").each(function() {
        if (typeof $(this).parent().attr("checked") != 'undefined') {
            checkedVal = true;
        } 
    });
    changeBtnAble('delete', checkedVal);

    $("input[name=dlgChk]").each(function() {
        if (typeof $(this).parent().attr("checked") != 'undefined') {
            checkedVal2 = true;
        } 
    });

    if(checkedVal == true && checkedVal2 == true) {
        changeBtnAble('learn', true);
    } else {
        changeBtnAble('learn', false);
    }

});

function changeBtnAble(btnName, boolVal){
    if (btnName=='learn') {
        if (!boolVal) {
            $('#utterLearn').attr("disabled", "disabled");
            $('#utterLearn').addClass("disable");  
        } else {
            $('#utterLearn').removeAttr('disabled');
            $('#utterLearn').removeClass("disable");
        }
    } else {
        if (!boolVal) {
            $('#utterDelete').attr("disabled", "disabled");
            $('#utterDelete').addClass("disable");   
        } else {
            $('#utterDelete').removeAttr('disabled');
            $('#utterDelete').removeClass("disable");
        }
    }
}


function utterInput(queryText) {
    
    $.ajax({
        url: '/learning/utterInputAjax',                //주소
        dataType: 'json',                  //데이터 형식
        type: 'POST',                      //전송 타입
        data: {'iptUtterance':queryText},      //데이터를 json 형식, 객체형식으로 전송

        success: function(result) {          //성공했을 때 함수 인자 값으로 결과 값 나옴

            var entities = result['entities'];
            if(entities != null) {
                entities = entities.split(",");
            }else{
                entities = [];
            }

            if ( result['result'] == true ) {
                //var utter = utterHighlight(entities,result['iptUtterance']);
                var utter = utterHighlight(result.commonEntities,result['iptUtterance']);
                var selBox = result['selBox'];

                $('#iptUtterance').val('');
                var inputUttrHtml = '';
                inputUttrHtml += '<tr> <td> <div class="check-radio-tweak-wrapper checkUtter" type="checkbox">';
                inputUttrHtml += '<input name="ch1" class="tweak-input" type="checkbox" onclick="" /> </div> </td>';
                inputUttrHtml += '<td class="txt_left" ><input type=hidden value="' + result['entities'] + '"/>' + utter + '</td>';
                if(result.commonEntities){
                    inputUttrHtml += '<tr><td> </td><td class="txt_left" >';
                    for(var i = 0; i < result.commonEntities.length ; i++){
                        inputUttrHtml += '<input type=hidden value="' + result.commonEntities[i].ENTITY_VALUE + '"/>' + result.commonEntities[i].ENTITY_VALUE + '::' + result.commonEntities[i].ENTITY;
                        if(i != result.commonEntities.length - 1 ) {
                            inputUttrHtml += "&nbsp&nbsp";
                        }
                    }
                    inputUttrHtml += '</td></tr>';
                }         
                /*
                if(result.commonEntities){
                    for(var i = 0; i < result.commonEntities.length ; i++){
                        inputUttrHtml += '<tr> <td> </td>';
                        inputUttrHtml += '<td class="txt_left" ><input type=hidden value="' + result.commonEntities[i].ENTITY_VALUE + '"/>' + result.commonEntities[i].ENTITY_VALUE + '::' + result.commonEntities[i].ENTITY + '</td>';
                    }
                }
                */
                //inputUttrHtml += '<td class="txt_right02" >'; 
                //inputUttrHtml += '<select id="intentNameList" name="intentNameList" class="select_box">'
                /*
                if(selBox != null) {
                    for( var i = 0 ; i < selBox.length; i++) {
                        inputUttrHtml += '<option value="' + selBox[i]['LUIS_INTENT'] + '">' + selBox[i]['LUIS_INTENT'] + '</option>'
                    }
                    selectDlgListAjax(selBox[0]['LUIS_INTENT']);
                } else {
                    inputUttrHtml += '<option value="" selected>no intent</option>'
                }

                inputUttrHtml += '</select></td></tr>';
                */
                $('#entityUtteranceTextTable').find('tbody').prepend(inputUttrHtml);

                selectDlgListAjax(entities);
                
            }
        } //function끝

    }); // ------      ajax 끝-----------------
}

function utterHighlight(entities, utter) {
    var result = utter;
    if(entities){
        for(var i = 0; i < entities.length; i++) {
            result = result.replace(entities[i].ENTITY_VALUE, '<span class="highlight">' + entities[i].ENTITY_VALUE + '</span>');
        }
    }
    return result;
}

//---------------두연 추가

function openModalBox(target){

    // 화면의 높이와 너비를 변수로 만듭니다.
    var maskHeight = $(document).height();
    var maskWidth = $(window).width();

    // 마스크의 높이와 너비를 화면의 높이와 너비 변수로 설정합니다.
    $('.mask').css({'width':maskWidth,'height':maskHeight});


    // 레이어 팝업을 가운데로 띄우기 위해 화면의 높이와 너비의 가운데 값과 스크롤 값을 더하여 변수로 만듭니다.
    var left = ( $(window).scrollLeft() + ( $(window).width() - $(target).width()) / 2 );
    //var top = ( $(window).scrollTop() + ( $(window).height() - $(target).height()) / 2 );

    // css 스타일을 변경합니다.
    $(target).css({'left':left,'top':'25px', 'position':'absolute'});

    // 레이어 팝업을 띄웁니다.
    $(target).show();
    $('#dialogPreview').css({'height':$('#dialogSet').height()});

    $('html').css({'overflow': 'hidden', 'height': '100%'});
        $('#element').on('scroll touchmove mousewheel', function(event) { // 터치무브와 마우스휠 스크롤 방지
            event.preventDefault();
            event.stopPropagation();
            return false;
    });
    wrapWindowByMask();
}

function wrapWindowByMask(){ //화면의 높이와 너비를 구한다. 
    var maskHeight = $(document).height(); 
    var maskWidth = $(window).width(); //마스크의 높이와 너비를 화면 것으로 만들어 전체 화면을 채운다. 
    $('#layoutBackground').css({'width':maskWidth,'height':maskHeight}); //마스크의 투명도 처리 
    $('#layoutBackground').fadeTo("fast",0.7); 
} 

function selectInent(intent) {
    //intent하위 entity 존재하면 entity select box disable제거되게 구현해야함
    $('#entityList').removeAttr("disabled");
}

function selectEntity(entity) {
    //intent하위 entity 존재하면 entity select box disable제거되게 구현해야함
    $('#btnAddDlg').removeAttr("disabled");
    $('#btnAddDlg').removeClass("disable");
}

function initMordal(objId, objName) {
    //<option selected="selected" disabled="disabled">Select Intent<!-- 서비스 선택 --></option>
    if (objId == 'entityList') {
        $('#'+ objId).attr("disabled", "disabled");
    }
    $('#btnAddDlg').attr("disabled", "disabled");
    $('#btnAddDlg').addClass("disable");

    $('#'+ objId + ' option:eq(0)').remove();
    $('#'+ objId ).prepend('<option selected="selected" disabled="disabled">' + objName + '</option>');

}
$(document).ready(function () {
    $('.ajaxsend').click(function(){
        // content-type을 설정하고 데이터 송신
        var xhr = new XMLHttpRequest();
        xhr.open('POST', url);
        xhr.setRequestHeader('Content-type', "application/json");

        // 데이터 수신이 완료되면 표시
        xhr.addEventListener('load', function(){
            console.log(xhr.responseText);
            // 문자열 형식으로 변환
            var result = JSON.parse(xhr.responseText);
            // 데이터가 없으면 return 반환
            if(result.result !== 'ok') return;
            // 데이터가 있으면 결과값 표시
            document.querySelector(".serult").innerHTML = result.email;
        });
    })

})

//app 등록
function save(type){
    var urlStr, applyIdStr
    if(type === 'appInsert'){
        urlStr = 'admin/putAddApps';
        applyIdStr = "appInsertForm";
    }

    $.tiAjax({
        type: 'POST',
        applyId: applyIdStr,
        url: urlStr,
        isloading: true,
        success: function(data) {
            var errorMessage = data.result;

            if(errorMessage == undefined) {
                movePage();
            } else {
                alert(errorMessage);
            }
        }
    });
}

//app 등록 시 데이터 유효성 검사
function appValidation(type){
    if(type === 'appInsert'){
        var service = $('#appInsertService').val();
        var name = $('#appInsertName').val();
        var culture = $('#appInsertCulture').val();

        if(service != null && name != "" && culture != null) {
            $('#btnAppInsert').removeClass("disable");
            $('#btnAppInsert').attr("disabled", false);
        } else {
            $('#btnAppInsert').attr("disabled", "disabled");
            $('#btnAppInsert').addClass(" disable");
        }
    }
}

//페이지 이동
function movePage(){
    location.reload();
}


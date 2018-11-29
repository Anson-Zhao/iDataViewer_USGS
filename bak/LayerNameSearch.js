function SearchLayerName(value){
    $.ajax({
        url: "http://localhost:9090/SearchLayerName",
        dataType:"json",
        success: function (results) {
            for(var i = 0; i < results.length; i++) {
                if (value === results[i].ThirdLayer) {
                    document.getElementById("LayerName1").innerHTML = "The Layer Name has already been used";
                    document.addEventListener("keyup", function (e) {
                        if (event.keyCode === 8) {
                            document.getElementById("LayerName1").innerHTML = "Please Enter the Layer Name, the Layer Name length at least 6 characters";
                            }
                        }, false);
                    break;
                } else{
                    document.getElementById("LayerName1").innerHTML = "This Layer Name is available";
                }
            }
               if(value.length === 0){
                   document.getElementById("LayerName1").innerHTML = "Please Enter the Layer Name, the Layer Name length at least 6 characters";
            }
        },
        error: function (jqXHR, exception) {
            var msg = '';
            if (jqXHR.status === 0) {
                msg = 'Not connect.\n Verify Network.';
            } else if (jqXHR.status == 404) {
                msg = 'Requested page not found. [404]';
            } else if (jqXHR.status == 500) {
                msg = 'Internal Server Error [500].';
            } else if (exception === 'parsererror') {
                msg = 'Requested JSON parse failed.';
            } else if (exception === 'timeout') {
                msg = 'Time out error.';
            } else if (exception === 'abort') {
                msg = 'Ajax request aborted.';
            } else {
                msg = 'Uncaught Error.\n' + jqXHR.responseText;
            }
            console.log(msg);
        }
    })

    //use if to check
    //false replace the <p> to the Layer Name is duplicated
    //ture --> nothing



}
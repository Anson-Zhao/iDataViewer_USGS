// var category = {};
// category['Energy'] = ['Energy_Distribution','Wind_Energy','Energy_Offices','Hydroelectric_Energy','Energy_Budgets'];
// category['Water'] = ['Canneries','Drainage_Systems','Water_Grids'];
// category['Agriculture'] = ['Soil_Testing'];
// category['Transportation'] = ['Rental_Cars','Roads','Airports','Piers','Harbors'];
// category['Economics'] = ['Property','Banks','Postal_Services'];
// category['Health_Services'] = ['Hospital_and_Clinics','Health_Centers','Veterinary_Services','Eye_Care'];
// category['Risk_Management']
// category['Education'] = ['Museums','Elementary_School','Academies','Higher_Education','UNESCO_WHS','High_School','Middle_School','Libraries','A_World_Bridge_Sites'];

function ChangeMainCategory(Category){
    var subList = document.getElementById("sub");
    while (subList.options.length){
        subList.remove(0);
    }
    $.ajax({
        url: "MainCategory",
        dataType: 'json',
        success:function (results) {
                var option;
                for (var i = 0; i < results.length; i++) {
                    if(results[i].FirstLayer !=="other" ) {
                    if (Category === results[i].FirstLayer) {
                        option = new Option(results[i].SecondLayer, results[i].SecondLayer);
                        subList.add(option);
                        document.getElementById("sub").disabled = false;

                    }
                }
            }
    }
})

}
$(document).ready(function () {
    $("#main").change(function () {
        var val = $(this).val();
        console.log(val);
        if (val == "Category") {
            $("#sub").html("<option value='Category'>SELECT SUBCATEGORY</option>");
        }else if(val =="other") {
            $("#sub").html("<option value='other'>Other(Please specify)</option>");
        }
    });
});


// config/database.js
var configGlobal = {
    'commondb_connection': {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '10.11.90.15',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },
    'session_connection': {
        'multipleStatements': true,
        'connectionLimit' : 100,
        'host': '10.11.90.15',
        'user': 'AppUser',
        'password': 'Special888%',
        'port'    :  3306
    },

    'Session_db': 'USGS',
    'Login_db': 'USGS',
    'Login_table': 'UserLogin',
    'Upload_db': 'USGS',

    'Server_Port': 9085,

    // 'local_URL' : "",
    // 'local_URL' : "http://viewer.usgs.aworldbridgelabs.com",

    //upload file--pending
    // 'Upload_Path': 'http://usgs.aworldbridgelabs.com/uploadfiles',
    'Upload_Path':'uploadfiles',
    // 'Upload_Dir': '/var/www/usgs/uploadfiles',
    'Upload_Dir': 'uploadfiles',

    //approve file--active
    // 'GeoData_Dir': '/usr/share/worldwind-geoserver-0.2.1/data_dir/data/USGS'
    'GeoData_Dir':'b',

    //trashfolder file--trashfolder
    'Delete_Dir':'trashfolder',

    // uswtdb eye distance for placemark layer menu display (km)
    'eyeDistance_PL': 1500,

    // uswtdb eye distance for display heatmap until eyeDistance_Heatmap less than 4500 (km)
    'eyeDistance_Heatmap': 3500,

    // uswtdb initial eye distance (m)
    'eyeDistance_initial': 20000000,

    'Color_Year': {red: 2010, orange: 2005, yellow: 2000, green: 1990, blue: 1980},

    'Color_Capacity': {red: 3, orange: 2.5, yellow: 2, green: 1.5, blue: 0},

    'Color_Height': {red: 160, orange: 120, yellow: 80, green: 40, blue: 5}

    // 'color_red': 2010, //the value would determine what year(s) greater or equal to this number would be red
    // 'color_orange': 2005, //the value would determine what year(s) greater or equal to this number would be orange
    // 'color_yellow': 2000, //the value would determine what year(s) greater or equal to this number would be yellow
    // 'color_green': 1990, //the value would determine what year(s) greater or equal to this number would be green
    // 'color_blue': 1980 //the value would determine what year(s) greater or equal to this number would be blue
};

if (typeof module !== 'undefined' && typeof module.exports !== 'undefined') {
    module.exports = configGlobal;
} else {
    window.config = configGlobal;
}

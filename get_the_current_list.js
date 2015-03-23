var utils = require('utils');

// var login_page = 'https://appleid.apple.com';
var select_team_page = 'https://developer.apple.com/membercenter/selectTeam.action';
var devices_list_page = 'https://developer.apple.com/account/ios/device/deviceList.action';

var casper = require('casper').create({
  // clientScripts:  [
  //   'includes/jquery.js',      // These two scripts will be injected in remote
  // ],
  pageSettings: {
    loadImages:  false,        // The WebPage instance used by Casper will
    loadPlugins: false         // use these settings
  },
  // logLevel: "info",              // Only "info" level messages will be logged
  verbose: true                  // log messages will be printed out to the console
});

casper.on('remote.message', function(msg) {
  this.echo('remote message caught: ' + msg);
});

// casper.on("resource.error", function(resourceError){
//   console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
//   console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
// });

casper.start();

var fs = require('fs');
configFile = fs.read('./config.json');
casper.then(function() {
    config = JSON.parse(configFile);
});

casper.thenOpen(select_team_page, function(response) { //).waitForUrl(/login/, function() { 
  // require('utils').dump(response);
  // this.echo(this.getHTML());
  this.fillSelectors('form#command', {
    'input[name="appleId"]':          config.appleid,
    'input[name="accountPassword"]':  config.password
  }, true);
});

var teams;

casper.then(function() {
  teams = this.evaluate(function() {
    var teams = [];
    var team_nodes = document.querySelectorAll('#teams option');
    for (var i = 0; i < team_nodes.length; i++) {
      teams.push(team_nodes[i].value);
    }
    return teams;
  });
});

var devices = {};
var devices_all = {};
var devices_hardcoded_names = {
  "167946ac50139144166358ab1a1c9f6da1bdb12e": "Moxie iPhone5",
  "1b72b4b9adf2f1b15e1700c4b90cbfb4bb15e119": "Moxie iPhone6 (Silver)",
  "2336bb278e53ec65fd75ba1d52670747f45326a0": "BMA iPhone5",
  "2f6110448b93789782bbde2be9de3843ac5866ee": "Moxie iPhone4S",
  "3104c131fd831134b80fca906d86ecbb1c19b571": "BMA iPhone6 (White)",
  "359cbeee901ba3f42a673caf506010ffe6b3cc08": "Miguel's iPhone6 (Space Grey)",
  "35a315550c3c5c78db5f08e4011bbbfd5a0582ff": "Vladimir’s Magaziy iPhone6 (Black)",
  "4ebf8c5f9179165636b376047daf26d6c91900a6": "Moxie iPhone 5C (White)",
  "4f1df2712707ffd685ee42b256b7eb48244b418b": "Moxie iPhone6+ (Gold)",
  "623ac260552aba7f3f8a7998d08eb7bc2bddb54f": "BMA iPhone4S (Black)",
  "646b1758fe657b3145ee90b4a4808a030506c68d": "BMA iPad4",
  "78df07aebe1c1d7ec6ad35aa046f596b3fc52bc6": "Anna’s iPhone5S (White)",
  "7ead1f9072d13cb3aa836248f1b7f17c6c8e157d": "BMA iPad2 (Wifi + 3G)",
  "85d1de7425d21b0b24010ed231599e3ecc113c57": "BMA iPhone4S (Black)",
  "9d79b24c0042303c70e77b1ae81bfb83d824c548": "Anton’s Yakimov iPhone 4S",
  "a71b80f3e87c793b1e1f24666d7ef429ec08b823": "BMA iPadMini Retina",
  "b2749f264f26b2b87afefb45f89f13fa2c900c2c": "Orene's iPhone 5C (Blue)",
  "b4f6b901c9aa29cc450adea801e715db68cce8b9": "Ekaterina’s iPhone5S (Black)",
  "e325a910f71fb45721f2e91a01d3b3fe64e7862f": "Moxie iPhone6 (Black)",
  "e5782638b00322cb21703db8d5d6b46f7bb6bb33": "Moxie iPhone6+ (Silver)",
  "fa0df022576ed17128fcc6a3c19242e9cec2755f": "Moxie iPhone6+ (Silver)",
  "faf9e925595c26ee61a5fba39308a7c1ce1e9269": "Moxie iPod Touch (Yellow)"
}

casper.then(function() {
  this.each(teams, function(self, team) {
    this.thenOpen(select_team_page, function(response) {
      this.fillSelectors('form#saveTeamSelection', {
        'select[name="memberDisplayId"]':  team,
      }, true);
      this.thenOpen(devices_list_page, function(response) {
        var team_devices = this.evaluate(function() {
          var team_devices = {};
          var device_name_nodes = document.querySelectorAll('#grid-table td[aria-describedby="grid-table_name"]');
          var device_uuid_nodes = document.querySelectorAll('#grid-table td[aria-describedby="grid-table_deviceNumber"]');
          var uuid
          var name;
          for (var i = 0; i < device_uuid_nodes.length; i++) {
            uuid = device_uuid_nodes[i].innerHTML;
            name = device_name_nodes[i].innerHTML;
            team_devices[uuid] = name;
          }
          return team_devices;
        });
        for (uuid in team_devices) {
          if (devices_hardcoded_names.hasOwnProperty(uuid)) {
            team_devices[uuid] = devices_hardcoded_names[uuid];
          }
        }
        devices[team] = team_devices;
        utils.mergeObjects(devices_all, team_devices);
      });
    });
  });
});

casper.then(function() {
  for (team in devices) {
    console.log(team);
    fs.write(team+'.txt', '{UUID}\t{NAME}\n', 'w');
    for (uuid in devices_all) {
      if (!devices[team].hasOwnProperty(uuid)){
        console.log(uuid);
        fs.write(team+'.txt', uuid + '\t' + devices_all[uuid] + '\n', 'a');
      }
    }
  }
});

casper.run();

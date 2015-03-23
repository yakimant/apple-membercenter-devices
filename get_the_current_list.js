// var login_page = 'https://appleid.apple.com';
var select_team_page = 'https://developer.apple.com/membercenter/selectTeam.action';
var devices_list_page = 'https://developer.apple.com/account/ios/device/deviceList.action';

var casper = require('casper').create({
  // clientScripts:  [
  //   'includes/jquery.js',      // These two scripts will be injected in remote
  //   'includes/underscore.js'   // DOM on every request
  // ],
  pageSettings: {
    loadImages:  false,        // The WebPage instance used by Casper will
    loadPlugins: false         // use these settings
  },
  logLevel: "debug",              // Only "info" level messages will be logged
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

casper.thenOpen(select_team_page, function(response) { //).waitForUrl(/login/, function() { 
  // require('utils').dump(response);
  // this.echo(this.getHTML());
  this.fillSelectors('form#command', {
    'input[name="appleId"]':          'a.yakimov@corp.badoo.com',
    'input[name="accountPassword"]':  '1OZBQB*QSe4!'
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

casper.then(function() {
  this.each(teams, function(self, team) {
    this.thenOpen(select_team_page, function(response) {
      // console.log(team);
      this.fillSelectors('form#saveTeamSelection', {
        'select[name="memberDisplayId"]':  team,
      }, true);
      this.thenOpen(devices_list_page, function(response) {
        var team_devices = this.evaluate(function() {
          var team_devices = {};
          var device_name_nodes = document.querySelectorAll('#grid-table td[aria-describedby="grid-table_name"]');
          var device_uuid_nodes = document.querySelectorAll('#grid-table td[aria-describedby="grid-table_deviceNumber"]');
          for (var i = 0; i < device_uuid_nodes.length; i++) {
            // console.log(device_uuid_nodes[i].innerHTML);
            // console.log(device_name_nodes[i].innerHTML);
            team_devices[device_uuid_nodes[i].innerHTML] = device_name_nodes[i].innerHTML;
          }
          return team_devices;
        });
        devices[team] = team_devices;
      });
    });
  });
});

var devices_sorted = {};

casper.then(function () {
  for (team in devices) {
    // console.log(team);
    // console.log(Object.keys(devices[team]).length);
    for (uuid in devices[team]) {
      if (devices_sorted[uuid] != undefined) {
        if (devices_sorted[uuid] != devices[team][uuid]) {
          console.log(uuid);
          console.log('\'' + devices_sorted[uuid] + '\'\nOR\n\'' + devices[team][uuid] + '\'\n');
        }
      } else {
        devices_sorted[uuid] = devices[team][uuid];
      }
    }
  }
  // console.log(Object.keys(devices_sorted).length);
});

casper.run();

var utils = require('utils');
var fs = require('fs');

var select_team_page = 'https://developer.apple.com/membercenter/selectTeam.action';
var devices_list_page = 'https://developer.apple.com/account/ios/device/deviceList.action';
var devices_create_page = 'https://developer.apple.com/account/ios/device/deviceCreate.action';

var teams;
var devices = {};
var devices_all = {};

var casper = require('casper').create({
  pageSettings: {
    loadImages:  false,
    loadPlugins: false
  },
  // logLevel: "debug",
  // verbose: true
});

casper.on('remote.message', function(msg) {
  this.echo('remote message caught: ' + msg);
});

// casper.on("resource.error", function(resourceError){
//   console.log('Unable to load resource (#' + resourceError.id + 'URL:' + resourceError.url + ')');
//   console.log('Error code: ' + resourceError.errorCode + '. Description: ' + resourceError.errorString);
// });

casper.start();

configFile = fs.read('./config.json');
casper.then(function() {
    config = JSON.parse(configFile);
});

var devices_hardcoded_names = config.devices_hardcoded_names;

casper.thenOpen(select_team_page, function(response) { //).waitForUrl(/login/, function() { 
  // require('utils').dump(response);
  // this.echo(this.getHTML());
  this.fillSelectors('form#command', {
    'input[name="appleId"]':          config.appleid,
    'input[name="accountPassword"]':  config.password
  }, true);
});

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
var devices_to_upload = {};

casper.then(function() {
  for (team in devices) {
    devices_to_upload[team] = {};
    fs.write(team+'.txt', '{UUID}\t{NAME}\n', 'w');
    for (uuid in devices_all) {
      if (!devices[team].hasOwnProperty(uuid)){
        fs.write(team+'.txt', uuid + '\t' + devices_all[uuid] + '\n', 'a');
        devices_to_upload[team][uuid] = devices_all[uuid];
      }
    }
  }
});


casper.then(function() {
  this.each(teams, function(self, team) {
    this.thenOpen(select_team_page, function(response) {
      console.log('-- Adding devices to following team: ' + team);
      this.fillSelectors('form#saveTeamSelection', {
        'select[name="memberDisplayId"]':  team,
      }, true);
      this.thenOpen(devices_create_page, function(response) {
      }).waitForSelector('input#register-multiple', function() {
        this.click('input#register-multiple');
        this.fill('form#deviceImport', {
          'upload': team+'.txt'
        }, true);
        this.waitForSelector('form#deviceImportSave', function() {
          this.fill('form#deviceImportSave', {
          }, true);
          utils.dump(devices_to_upload[team]);
        });
        this.waitForText('Registration complete.', function() {
          this.capture(team+'.png');
          console.log('Successfully imported\n');
        }, function() {
          this.capture(team+'.png');
          console.log('FATAL: Import failed\n');
        });
      }, function() {
        this.capture(team+'.png');
        console.log('FATAL: Can\'t open the teams devices page.\n');
      });
    });
  });
});

casper.run();

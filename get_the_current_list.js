var utils = require('utils');
var fs = require('fs');

var select_team_page = 'https://developer.apple.com/account/selectTeam.action';
var devices_list_page = 'https://developer.apple.com/account/ios/device/deviceList.action';
var devices_create_page = 'https://developer.apple.com/account/ios/device/deviceCreate.action';

var teams;
var devices = {};
var devices_all = {};
var devices_to_upload = {};

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

casper.then(function() {
  configFile = fs.read('./config.json');
  config = JSON.parse(configFile);
  this.options.waitTimeout = config.waitTimeout;
  this.options.timeout = config.timeout;
  devices_hardcoded_names = config.devices_hardcoded_names;
});

casper.thenOpen(select_team_page, function openSelectTeamPage(response) {
  this.fillSelectors('form#command', {
    'input[name="appleId"]':          config.appleid,
    'input[name="accountPassword"]':  config.password
  }, true);
}).then(function getTeamsList() {
  teams = this.evaluate(function() {
    var teams = [];
    $('.input').children('.team-value').each(function () {
      teams.push({
        'id': $(this).children('.radio').val(),
        'name': $.trim($(this).children('.label-primary').text()),
        'program': $(this).children('.label-secondary').text()
      });
    });
    return teams;
  });
});

casper.then(function() {
  this.eachThen(teams, function(team_data) {
    var team = team_data.data;
    var status = 'ok';
    var team_devices = {};
    this.thenOpen(select_team_page, function openSelectTeamPage() {
    }).waitForSelector('form#saveTeamSelection', function waitForSelectTeamPage() {
    }, function() {
      fs.write(config.logfile, 'ERROR: Could not open select team page for team: ' + team.id + '\n', 'a');
      status = 'fail';
    }).then(function selectTeam() {
      if (status === 'ok') {
        this.fillSelectors('form#saveTeamSelection', {
          'input[name="memberDisplayId"]':  team.id,
        }, true);
      }
    }).waitForSelector('#content', function waitForTeamSelected() {
    }, function() {
      fs.write(config.logfile, 'ERROR: Could not select team: ' + team.id + '\n', 'a');
      status = 'fail';
    }).thenOpen(devices_list_page, function openDevicesListPage() {
    }).waitForSelector(".innercontent", function waitForDevicesListPage() {
    }).then(function checkDevicesListPage() {
      if (status === 'ok') {
        status = this.evaluate(function () {
          if ($('.innercontent').find('.overview').length === 1) {
            return 'fail';
          }
          if ($('.innercontent').find('.no-items-content').length === 1) {
            return 'empty';
          }
          return 'ok';
        });
      }
    }).then(function getDevicesData() {
      if (status === 'ok') {
        team_devices = this.evaluate(function() {
          var team_devices = {};
          var device_name_nodes = $('#grid-table').find('td[aria-describedby="grid-table_name"]');
          var device_uuid_nodes = $('#grid-table').find('td[aria-describedby="grid-table_deviceNumber"]');
          var uuid
          var name;
          for (var i = 0, devices_count = device_uuid_nodes.length; i < devices_count; i++) {
            uuid = device_uuid_nodes[i].innerHTML;
            name = device_name_nodes[i].innerHTML;
            team_devices[uuid] = name;
            // console.log(uuid);
            // console.log(name);
          }
          return team_devices;
        });
        for (uuid in team_devices) {
          if (devices_hardcoded_names.hasOwnProperty(uuid)) {
            team_devices[uuid] = devices_hardcoded_names[uuid];
          }
        }
        devices[team.id] = team_devices;
        utils.mergeObjects(devices_all, team_devices);
      }
    });
  });
});

casper.then(function() {
  for (team in devices) {
    devices_to_upload[team] = {};
    devices_to_upload[team]['deviceNames'] = '';
    devices_to_upload[team]['deviceNumbers'] = '';
    fs.write(team+'.txt', '{UUID}\t{NAME}\n', 'w');
    for (uuid in devices_all) {
      if (!devices[team].hasOwnProperty(uuid)){
        fs.write(team+'.txt', uuid + '\t' + devices_all[uuid] + '\n', 'a');
        devices_to_upload[team][uuid] = devices_all[uuid];
        devices_to_upload[team]['deviceNames'] += devices_all[uuid] + ',';
        devices_to_upload[team]['deviceNumbers'] += uuid + ',';
      }
    }
  }
});


casper.then(function addDevices() {
  this.eachThen(teams, function(team_data) {
    var status = 'ok';
    var team = team_data.data;
    console.log('-- Adding devices to following team: ' + team.name);
    this.thenOpen(select_team_page, function openSelectTeamPage() {
    }).waitForSelector('form#saveTeamSelection', function waitForSelectTeamPage() {
      }, function() {
        fs.write(config.logfile, 'ERROR: Could not open select team page for team: ' + team.id + '\n', 'a');
        status = 'fail';
    }).then(function selectTeam() {
      if (status === 'ok') {
        this.fillSelectors('form#saveTeamSelection', {
          'input[name="memberDisplayId"]':  team.id,
        }, true);
      }
    }).waitForSelector('#content', function waitForTeamSelected() {
    }, function() {
      fs.write(config.logfile, 'ERROR: Could not select team: ' + team.id + '\n', 'a');
      status = 'fail';
    }).thenOpen(devices_create_page, function openDevicesCreatePage() {
    }).waitForSelector(".innercontent", function waitForDevicesCreatePage() {
    }, function() {
      fs.write(config.logfile, 'ERROR: Could not open provision certificates page for team ' + team.id + '\n', 'a');
      status = 'fail';
    }).then(function checkDevicesCreatePage() {
      if (status === 'ok') {
        status = this.evaluate(function () {
          if ($('.innercontent').find('.overview').length === 1) {
            return 'fail';
          }
          if ($('.innercontent').find('.no-items-content').length === 1) {
            return 'empty';
          }
          return 'ok';
        });
      }
    }).then(function selectMultipleDevicesUpload() {
      if (status === 'ok') {
        this.click('input#register-multiple');
      }
    // }).waitForSelector('form#deviceImport .file-input[disabled!=disabled]', function uploadDevicesList() {
    }).wait(1000, function uploadDevicesList() {
      this.fillSelectors('form#deviceImport', {
        'input[name="upload"]': team.id+'.txt',
        'input[name="deviceNames"]': devices_to_upload[team.id]['deviceNames'],
        'input[name="deviceNumbers"]': devices_to_upload[team.id]['deviceNumbers'],
      }, true);
    }).waitForSelector('form#deviceImportSave', function waitForConfirmPage() {
    }, function() {
      // fs.write(config.logfile, 'ERROR: Could not open provision certificates page for team ' + team.id + '\n', 'a');
      status = 'fail';
    }).then(function confirmUpload() {
      if (status === 'ok') {
        utils.dump(devices_to_upload[team.id]);
        this.fill('form#deviceImportSave', {
        }, true);
      }
    }).waitForText('Registration complete.', function importSucceed() {
      this.capture(team.id+'.png');
      console.log('Successfully imported\n');
    }, function importFailed() {
      this.capture(team.id+'.png');
      console.log('FATAL: Import failed\n');
    });
        // this.capture(team+'.png');
        // console.log('FATAL: Can\'t open the teams devices page.\n');
  });
});

// casper.then(function() {
//   utils.dump(devices_to_upload);
// });

casper.run();

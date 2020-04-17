const Wemo = require('wemo-client');
const wemo = new Wemo({ listen_interface: "Ethernet" });
const ioHook = require('iohook');
const CONSTANTS = require('./constants');
const player = require('sound-play');
const robot = require('robotjs');
const ping = require("net-ping");
const ring = require('./RingBuffer')

let wemoLightClient;
var SerialPort = require('serialport');
var port;// = new SerialPort("COM3");
const Readline = require('@serialport/parser-readline');
const parser = new Readline();

const CTRL = 29;
const SHIFT = 42;
const ALT = 56;
const F10 = 68;
const F11 = 87;
const F12 = 88;

var getBoxPort = (cb) => {
    var portName = "";

    SerialPort.list((e, ports) => {
        ports.some((port) => {
            if (port.manufacturer.indexOf('Arduino') > -1) {
                console.log('ini t', port.comName);
                portName = port.comName;
            }
        });
        cb(portName);
    });
}

var parseInput = function (message) {
    console.log(message.toString(2));
    retVal = {};
    retVal.inputs = message & 0x1FF;
    retVal.dial = (message >> 9) & 0x3F;
    retVal.conf = !!(message >> 15);
    console.log(retVal.conf.toString(2), retVal.dial.toString(2), retVal.inputs.toString(2));
    return retVal;
}

function toggleLightCommand() {
    robot.keyToggle("control", "down");
    robot.keyToggle("alt", "down");
    robot.keyToggle("shift", "down");
    robot.keyToggle("f11", "down");
    robot.keyTap("f12");
    robot.keyToggle("control", "up");
    robot.keyToggle("alt", "up");
    robot.keyToggle("shift", "up");
    robot.keyToggle("f11", "up");
}

function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

var actions = {
    511: function (dial) { console.log('congrats', dial); },
    1: function () { console.log('pressed 1'); },
    359: function (dial) { if (dial > 1) console.log('whoanow'); },
    32: function () {
        const path = require('path');

        const filePath = path.join(__dirname, `sounds/Honk${getRandomInt(4) + 1}.mp3`);
        console.log(filePath);
        player.play(filePath);
    },
    480: function () {
        toggleLightCommand();
    }
}

var performAction = function (input, dial = 0) {
    if (actions.hasOwnProperty(input)) {
        console.log(dial);
        actions[input](dial);
    } else {
        console.log('nop');
    }
};

getBoxPort((p) => {
    port = new SerialPort(p);
    port.pipe(parser);
    port.on('data', (data) => {
        var message = parseInt(data.toString());
        console.log(message);
        var input = parseInput(message);
        console.log(input);
        performAction(input.inputs, input.dial);
        // for(var i = 0; i < data.length; i++) {
        //     console.log("data at ", i, data[i]);
        //     console.log("char at ", i, String.fromCharCode(data[i]));
        // }
    });
});

function foundDevice(err, deviceInfo) {
    if (err) {
        console.log(err);
    }

    console.log('Wemo device found: %s', deviceInfo.friendlyName);

    var client = wemo.client(deviceInfo);
    wemoLightClient = client;

    client.on('error', err => {
        console.log('Error: %s', err.code);
    });

    client.on('binaryState', value => {
        console.log('Binary state set to %s', value);
        console.log('binary state was %s', this.binaryState);
        this.binaryState = value;
        console.log('binary state IS %s', this.binaryState);
    });

    ioHook.registerShortcut([
        CONSTANTS.KEY_CTRL,
        CONSTANTS.KEY_SHIFT,
        CONSTANTS.KEY_ALT,
        CONSTANTS.KEY_F11,
        CONSTANTS.KEY_F12], (keys) => {
            console.log('Entered shortcut with keys: ', keys);
            console.log('Setting to %i', +!+this.binaryState);
            client.setBinaryState(+!+this.binaryState);
        });
}

console.log(wemo._listenInterface);
// wemo.discover(foundDevice);
const wemoUrl = 'http://192.168.1.167:49153/setup.xml';
wemo.load(wemoUrl, foundDevice);
var wemoAttempts = 0;
setInterval(function () {
    var session = ping.createSession();
    var target = '192.168.1.167';
    session.pingHost(target, function (error, target) {
        if (error && wemoAttempts < 5) {
            console.log(target + ": " + error.toString());
            console.log("trying to reconnect to wemo");
            wemoAttempts++;
            wemo.load(wemoUrl, foundDevice);
        } else if (error && wemoAttempts >= 5) {
            console.log(target + ": " + error.toString());
            console.log("trying to reconnect to wemo with discover");
            wemoAttempts++;
            wemo.discover(foundDevice);
        }
        else {
            console.log(target + ": Alive");
            wemoAttempts = 0;
        }
    });
}, 30000);

ioHook.on('keydown', event => {
    // console.log(event);
    console.log(`pressed raw ${event.rawcode}, key ${event.keycode}`);
});

ioHook.registerShortcut([CTRL, SHIFT, ALT, F10, F12], (keys) => {
    console.log('Entered shortcut with keys: ', keys);
    console.log('Killing process');
    process.exit();
});

ioHook.start();

var buf = ring.createRingBuffer(10);
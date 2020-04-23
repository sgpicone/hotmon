const Wemo = require('wemo-client');
const wemo = new Wemo({ listen_interface: "Ethernet" });
const ioHook = require('iohook');
const CONSTANTS = require('./constants');
const player = require('sound-play');
const ping = require("net-ping");
const ring = require('./RingBuffer')


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
        lightCommand();
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


console.log(wemo._listenInterface);
const wemoUrl = 'http://192.168.1.167:49153/setup.xml';


let wemoLightClient = new Promise((resolve, reject) => {
    console.log("connecting to wemo");
    wemo.load(wemoUrl, (err, deviceInfo) => {
        if (err) {
            reject(err);
        }
        console.log('Wemo device found: %s', deviceInfo.friendlyName);

        var client = wemo.client(deviceInfo);
        resolve(client);
    });
});


function toggleLight(wemoClient) {
    wemoClient.getBinaryState((err,state) => {
        console.log('Setting to %i', +!+state);
        wemoClient.setBinaryState(+!+state);
    })
}

function lightCommand() {
    wemoLightClient.then((client) => {
        toggleLight(client);
        client = null;
    });
}

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
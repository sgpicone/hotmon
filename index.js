const Wemo = require('wemo-client');
const wemo = new Wemo();
const ioHook = require('iohook');

const CTRL = 29;
const SHIFT = 42;
const ALT = 56;
const F10 = 68;
const F11 = 87;
const F12 = 88;

wemo.discover(function(err, deviceInfo) {
    console.log('Wemo device found: %s', deviceInfo.friendlyName);

    var client = wemo.client(deviceInfo);

    client.on('error', err => {
        console.log('Error: %s', err.code);
    });

    client.on('binaryState', value => {
        console.log('Binary state set to %s', value);
        console.log('binary state was %s', this.binaryState);
        this.binaryState = value;
        console.log('binary state IS %s', this.binaryState);
    });

    ioHook.registerShortcut([CTRL,SHIFT,ALT,F11,F12], (keys) => {
        console.log('Entered shortcut with keys: ', keys);
        console.log('Setting to %i', +!+this.binaryState);
        client.setBinaryState(+!+this.binaryState);
    });

    ioHook.registerShortcut([CTRL,SHIFT,ALT,F10,F12], (keys) => {
        console.log('Entered shortcut with keys: ', keys);
        console.log('Killing process');
        process.exit();
    });

    ioHook.on('keydown', event => {
        console.log(event);
    });

    ioHook.start();

});


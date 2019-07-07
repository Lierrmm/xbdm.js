const xbdm = require('./index');
xbdm.connect("192.168.1.7").then(resp => {
    xbdm.xNotify("Welcome from xbdm.js");
    xbdm.LaunchXEX("USB0:\\Games\\Modern Warfare 3\\default_mp.xex").then(console.log);
}).catch((err) => {
    console.log(err);
});
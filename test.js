const xbdm = require('./index');
xbdm.connect("192.168.1.7").then(resp => {
    xbdm.xNotify("Welcome from xbdm.js");
    xbdm.getTitleInfo("415608CB").then(console.log);
}).catch((err) => {
    console.log(err);
});
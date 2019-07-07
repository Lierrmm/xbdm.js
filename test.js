const xbdm = require('./index');
xbdm.connect("192.168.1.7").then(resp => {
    xbdm.xNotify("Welcome from xbdm.js");  
    xbdm.getCPUKey().then(console.log).catch(console.log);
    xbdm.getConsoleID().then(console.log).catch(console.log);
    xbdm.getMemory(0x8210E58C, 4).then(console.log).catch(console.log);
    xbdm.setMemory(0x8210E58C, 60000000);
    xbdm.getMemory(0x8210E58C, 4).then(console.log).catch(console.log);
    xbdm.disconnect().then(console.log);
}).catch((err) => {
    console.log(err);
});
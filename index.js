const {
    PromiseSocket
} = require("promise-socket");
const net = require('net');
const rl = require('readline');
const fs = require('fs');
const bmpjs = require('bmp-js');
const flip = require('./flipbytes');
let connectedIp = '127.0.0.1';
let socket = new net.Socket();
const promiseSocket = new PromiseSocket(socket);
let i = rl.createInterface(socket, socket);
let timeout = 5;
let running = false;
socket.setNoDelay(true);

function connect(ip) {
    return new Promise((resolve, reject) => {
        promiseSocket.connect(730, ip).then((data) => {
            resolve(true);
        }).catch((err) => {
            reject(err);
        });
    });
}

function sendCommand(command) {
    return new Promise((resolve, reject) => {
        promiseSocket.write(command + "\r\n").then(() => {
            i.on('line', function (line) {
                if (!line.startsWith("202- ")) resolve(line);
            });
        }).catch(err => {
            reject("Not Connected");
        });
    });
}

function setMemory(address, data) {
    sendCommand(`setmem addr=${address} data=${data}`).catch();
}

function disconnect() {
    return new Promise(resolve => {
        promiseSocket.destroy();
        promiseSocket.end();
        resolve("died.");
    });
}

function getMemory(address, rlength, type = "hex") {
    return new Promise((resolve, reject) => {
        running ? timeout = timeout + 55 : timeout = timeout = 5;
        running = true;
        setTimeout(() => {
            sendCommand(`getmem addr=${address} length=${rlength}`).then((data) => {
                if (type == "dec") data = parseInt(data, 16);
                resolve(data);
            }).catch(reject);
        }, timeout);
    });
}

function getCPUKey() {
    return new Promise((resolve, reject) => {
        running ? timeout = timeout + 10 : timeout = timeout = 5;
        running = true;
        setTimeout(() => {
            sendCommand("getcpukey").then(data => {
                resolve(data.substr(5, 32));
            }).catch(reject);
        }, timeout);
    });
}

function getConsoleID() {
    return new Promise((resolve, reject) => {
        running ? timeout = timeout + 10 : timeout = timeout = 5;
        running = true;
        setTimeout(() => {
            running = true;
            sendCommand("getconsoleid").then(data => {
                resolve(data.split("=")[1]);
            }).catch(reject);
        }, timeout);
    });
}

function xNotify(message, type = "default") {
    let command =
        "consolefeatures ver=2" +
        ' type=12 params="A\\0\\A\\2\\' +
        2 +
        "/" +
        message.length +
        "\\" +
        Buffer.from(message, "utf8").toString("hex") +
        "\\" +
        1 +
        "\\";
    switch (type) {
        case "default":
            command += '0\\"';
            break;
        case "invitation":
            command += '1\\"';
            break;
        case "friend":
            command += '2\\"';
            break;
        default:
            command += '0\\"';
            break;
    }
    sendCommand(command).catch();
}

function readStream(size) {
    return new Promise((resolve, reject) => {
        promiseSocket.read(size).then(data => {
            resolve(data);
        }).catch(reject);
    });
}

function grabSSInfo(command) {
    return new Promise((resolve, reject) => {
        promiseSocket.write(command + "\r\n").then((data) => {
            readStream().then(data => {
                data = data.toString().split('\r\n')[1];
                let obj = {
                    pitch: parseInt(data.split('pitch=')[1].split(' ')[0],16),
                    width: parseInt(data.split('width=')[1].split(' ')[0],16),
                    height: parseInt(data.split('height=')[1].split(' ')[0],16),
                    format: parseInt(data.split('format=')[1].split(' ')[0],16),
                    offsetx: parseInt(data.split('offsetx=')[1].split(' ')[0],16),
                    offsety: parseInt(data.split('offsety=')[1].split(' ')[0],16),
                    framebuffersize: parseInt(data.split('framebuffersize=')[1].split(' ')[0], 16)
                };
                resolve(obj);
            }).catch(reject);
        });
    });
}

function screenshot() {
    return new Promise(resolve => {
        setTimeout(() => {
            grabSSInfo("screenshot").then((data) => {
                PauseSystem();
                console.log(data);
                let buf = new Buffer.alloc(data.framebuffersize);
                readStream(buf).then(response => {
                    let _data = response;
                    let newData = flip.reorder(_data);
                    console.log(newData.length);
                    let bmpData = {
                        width: data.width,
                        height: data.height,
                        data: newData
                    };
                    let bmpResult = bmpjs.encode(bmpData);
                    unPauseSystem();
                    fs.writeFile("screenshot.bmp", bmpResult.data, err => console.log(err));
                    resolve("wrote image");
                });
            }).catch(() => {
                unPauseSystem();
            });
        }, 1500);
    });
}

function grabSysInfo(command) {
    return new Promise((resolve) => {
        promiseSocket.write(command + "\r\n").then((data) => {
            promiseSocket.read().then(data => {
                if (data.toString().startsWith("202- multiline")) {
                    let _data = data.toString().replace("202- multiline response follows\r\n", "");
                    _data = _data.split('\r\n');
                    let obj = [];
                    _data.forEach((item, i) => {
                        obj.push(item);
                        if (i == _data.length - 1) resolve(obj);
                    });
                }
            });
        });
    });
}
/**
 * Returns System Info - Error Prone
 */
function getSysInfo() {
    return new Promise(resolve => {
        setTimeout(() => {
            grabSysInfo("systeminfo").then(data => {
                let obj = {
                    "HDD": data[0].split("=")[1],
                    "Type": data[1].split("=")[1],
                    "Platform": data[2],
                    "Kernal": data[3]
                };
                resolve(obj);
            });
        }, 1500);
    });
}

function moduleList(command) {
    return new Promise((resolve) => {
        promiseSocket.write(command + "\r\n").then((data) => {
            promiseSocket.read().then(data => {
                console.log(data.toString());
                if (data.toString().startsWith("202- multiline")) {
                    let _data = data.toString().replace("202- multiline response follows\r\n", "");
                    _data = _data.split('\r\n');
                    let obj = [];
                    _data.forEach((item, i) => {
                        if (item.startsWith("name=") && obj.indexOf(item, 1) == -1) obj.push(item);
                        if (i == _data.length - 1) resolve(obj);
                    });
                }
            });
        });
    });
}
/**
 * Returns Module List - PoC Do not use in prod - Error Prone
 */
function getModuleList() {
    return new Promise(resolve => {
        setTimeout(() => {
            moduleList("modules").then(data => {
                let obj = {};
                let _obj = [];
                data.forEach(elem => {
                    obj.name = elem.split('name=')[1].split('"')[1];
                    obj.base = elem.split('base=')[1].split(" ")[0];
                    obj.size = elem.split('size=')[1].split(" ")[0];
                    obj.psize = elem.split('psize=')[1].split(" ")[0];
                    _obj.push(obj);
                    if (_obj.length === data.length) resolve(_obj);
                });
            });
        }, 5000);
    });
}

function PauseSystem() {
    sendCommand("stop");
}

function unPauseSystem() {
    sendCommand("go");
}

function shutdown() {
    sendCommand("shutdown");
}

function setColor(color = "bluegray") {
    sendCommand(`setcolor name=${color}`);
}

function sendfile(name, buffer, folder = "hdd") {
    let length = buffer.length;
    let hxlength = length.toString(16);
    sendCommand(`sendfile name=${folder}:\\${name} length=0x${hxlength}`).then((data) => {
        setTimeout(() => {
            console.log("result", data);
            promiseSocket.write(Buffer.from(buffer)).then((data) => {
                console.log("Written bytes:", data);
            });
        }, 1600);
    });
}

function coldReboot() {
    sendCommand("magicboot  COLD").then(console.log);
}

function LaunchXEX(xexPath) {
    return new Promise((resolve) => {
        let directory = xexPath.substr(0, xexPath.lastIndexOf('\\') + 1);
        setTimeout(() =>
            sendCommand("magicboot title=\"" + xexPath + "\" directory=\"" + directory + "\"").then(data => {
                resolve(`Launching ${directory}`);
            }), 500);
    });
}

function notImplemented() {
    return "not implemented yet.";
}

module.exports = {
    ip: connectedIp,
    connect: connect,
    socket: socket,
    setMemory: setMemory,
    xNotify: xNotify,
    getMemory: getMemory,
    getCPUKey: getCPUKey,
    disconnect: disconnect,
    getConsoleID: getConsoleID,
    getSysInfo: getSysInfo,
    PauseSystem: PauseSystem,
    unPauseSystem: unPauseSystem,
    shutdown: shutdown,
    setColor: setColor,
    sendfile: sendfile,
    coldReboot: coldReboot,
    LaunchXEX: LaunchXEX,
    screenshot: notImplemented
};
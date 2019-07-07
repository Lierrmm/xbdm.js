const {
    PromiseSocket
} = require("promise-socket");
const net = require('net');
const rl = require('readline');
let connectedIp = '127.0.0.1';
let socket = new net.Socket();
const promiseSocket = new PromiseSocket(socket);
let i = rl.createInterface(socket, socket);
let timeout = 5;
let running = false;

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

function screenshot() {
    sendCommand("Screenshot ").then((data) => {
        console.log(data);
        data = data.split('colorspace=0x0\r\n')[1];
        console.log(data);
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
                console.log("resp", data);
                resolve(`Launching ${directory}`);
            }), 500);
    });
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
    LaunchXEX: LaunchXEX
};
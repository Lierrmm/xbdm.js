const {
    PromiseSocket
} = require("promise-socket");
const net = require('net');
const rl = require('readline');
const fs = require('fs');
const bmpjs = require('bmp-js');
const flip = require('./flipbytes');
const axios = require("axios");
axios.defaults.headers.get["content-type"] = "application/json";

let connectedIp = '127.0.0.1';
let socket = new net.Socket();
const promiseSocket = new PromiseSocket(socket);
let i = rl.createInterface(socket, socket);
let timeout = 5;
let running = false;
socket.setNoDelay(true);
socket.setKeepAlive(true);

/**
 * Connect to target machine
 * @param {string} ip 
 * @param {number} port 
 */
function connect(ip, port = 730) {
    return new Promise((resolve, reject) => {
        promiseSocket.connect(port, ip).then((data) => {
            resolve(true);
        }).catch((err) => {
            reject(err);
        });
    });
}

/**
 * Send command to target machine
 * @param {string} command 
 */
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

/**
 * Set memory on the target machine
 * @param {number} address 
 * @param {number} data 
 */
function setMemory(address, data) {
    sendCommand(`setmem addr=${address} data=${data}`).catch();
}

/**
 * Disconnect from target machine
 */
function disconnect() {
    return new Promise(resolve => {
        promiseSocket.destroy();
        promiseSocket.end();
        resolve("died.");
    });
}

/**
 * Returns memory from target machine
 * @param {number} address 
 * @param {number} rlength 
 * @param {string} type 
 */
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

/**
 * Grab CPU Key from target machine
 */
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

/**
 * Grab Console ID from target machine
 */
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

/**
 * Send notification to target machine
 * @param {string} message 
 * @param {string} type 
 */
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

/**
 * Read response from target machine
 * @param {number} size 
 */
function readStream(size = 0) {
    return new Promise((resolve, reject) => {
        promiseSocket.read(size).then(data => {
            resolve(data);
        }).catch(reject);
    });
}

/**
 * Returns Screenshot data from target machine
 * @param {string} command 
 */
function grabSSInfo(command) {
    return new Promise((resolve, reject) => {
        promiseSocket.write(command + "\r\n").then((data) => {
            readStream().then(data => {
                data = data.toString().split('\r\n')[1];
                let obj = {
                    pitch: parseInt(data.split('pitch=')[1].split(' ')[0], 16),
                    width: parseInt(data.split('width=')[1].split(' ')[0], 16),
                    height: parseInt(data.split('height=')[1].split(' ')[0], 16),
                    format: parseInt(data.split('format=')[1].split(' ')[0], 16),
                    offsetx: parseInt(data.split('offsetx=')[1].split(' ')[0], 16),
                    offsety: parseInt(data.split('offsety=')[1].split(' ')[0], 16),
                    framebuffersize: parseInt(data.split('framebuffersize=')[1].split(' ')[0], 16)
                };
                resolve(obj);
            }).catch(reject);
        });
    });
}

/**
 * Screenshots the target machine
 */
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

/**
 * Returns system information from target machine
 * @param {string} command 
 */
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

/**
 * Returns module list from target machine
 * @param {string} command 
 */
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

/**
 * Pauses the target machine
 */
function PauseSystem() {
    sendCommand("stop");
}

/**
 * Unpauses the target machine
 */
function unPauseSystem() {
    sendCommand("go");
}

/**
 * Shutdown the target machine
 */
function shutdown() {
    sendCommand("shutdown");
}


/**
 * Update color of target machine in Neighborhood
 * @param {string} color 
 */
function setColor(color = "bluegray") {
    sendCommand(`setcolor name=${color}`);
}

/**
 * Send file to target machine
 * @param {string} name 
 * @param {string} buffer 
 * @param {string} folder 
 */
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
/**
 * Restart the target machine
 */
function coldReboot() {
    sendCommand("magicboot  COLD").then(console.log);
}

/**
 * Launch XEX on target machine
 * @param {string} xexPath 
 */
function LaunchXEX(xexPath) {
    return new Promise((resolve) => {
        let directory = xexPath.substr(0, xexPath.lastIndexOf('\\') + 1);
        setTimeout(() =>
            sendCommand("magicboot title=\"" + xexPath + "\" directory=\"" + directory + "\"").then(data => {
                resolve(`Launching ${directory}`);
            }), 500);
    });
}

/**
 * Returns a not implemented message
 */
function notImplemented() {
    return "not implemented yet.";
}

/**
 * Parses hex to string
 * @param {number} hexx 
 */
function hex2String(hexx) {
    var hex = hexx.toString();
    var str = '';
    for (var i = 0;
        (i < hex.length && hex.substr(i, 2) !== '00'); i += 2)
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    return str;
}

String.prototype.hexEncode = function () {
    var hex, i;
    var result = "";
    for (i = 0; i < this.length; i++) {
        hex = this.charCodeAt(i).toString(16);
        result += ("000" + hex).slice(-4);
    }
    return result;
};

/**
 * Grab title ID from target machine
 */
function getTitleID() {
    return new Promise((resolve) => {
        setTimeout(() => {
            let command =
                "consolefeatures ver=2" +
                ' type=9 params="A\\0\\A\\2\\' +
                2 +
                "/" +
                "xam.xex".length +
                "\\" +
                Buffer.from("xam.xex").toString("hex") +
                "\\" +
                1 +
                "\\" +
                "0x1CF" + '\\"';
            sendCommand(command).then(data => {
                console.log(data);
                data = data.split("200- ")[1];
                resolve(data);
            });
        }, 1500);
    });
}

/**
 * Get title information from title id
 * @param {string} titleId 
 */
function getTitleInfo(titleId) {
    return new Promise(resolve => {
        axios.get(`http://xboxunity.net/Resources/Lib/TitleList.php?page=0&count=1&search=${titleId}&sort=3&direction=1&category=0&filter=0`).then((data) => {
            resolve(data.data);
        });
    });
}

/**
 * return bytes as an array
 * @param {string} argument 
 */
function getData(argument) {
    let numArray = [];
    let bytes = argument;
    numArray.push(bytes);
    return numArray;
}

/**
 * Reverse bytes
 * @param {number} addr 
 */
function reverse(addr) {
    let _data;
    let x = addr;
    let y = x.toString(2);
    let yl = y.length;
    let mask = (Math.pow(2, yl) - 1);
    _data = ~x & mask;
    return _data;
}

/**
 * Grab title ID from target machine
 */
function titleIDv2() {
    setTimeout(() => {
        let bytes1 = Buffer.from("xam.xex").toString("hex");
        getMemory(0x91C088AE, 4).then(data => {
            let bufferAddr = parseInt(data, 16);
            let stringPointer = bufferAddr + 1500;
            setMemory(bufferAddr, 100);
            setMemory(stringPointer, 100);
            setMemory(stringPointer, bytes1);
            let numArray = [stringPointer, 0];
            stringPointer += "xam.xex".length + 1;
            numArray[1] = 0x1CF;
            let _data = getData(0x1CF);
            setMemory(bufferAddr + 8, _data);
            let bytes2 = parseInt(2181038081, 16).toString();
            setMemory(bufferAddr, bytes2);
            setTimeout(() => {
                getMemory(bufferAddr + 4092, 4).then((data) => {
                    console.log(data);
                });
            }, 1500);
        });
    }, 1500);
}

let Temperature = {
    CPU: 0,
    GPU: 1,
    EDRAM: 2,
    MotherBoard: 3
};

/**
 * Gets Temperature from target machine
 * @param {Temperature} Temperature 
 */
function getTemp(Temperature = 0) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let command =
                "consolefeatures ver=2" +
                ' type=15 params="A\\0\\A\\2\\' +
                1 +
                "\\" +
                Temperature +
                '\\"';
            promiseSocket.write(command + "\r\n").then((data) => {
                promiseSocket.read().then(data => {
                    let num = parseInt(data.toString().substr(4, data.length), 16);
                    if (!isNaN(num)) resolve(num);
                    else reject("Not A Number..");
                });
            });
        }, 1500);
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
    LaunchXEX: LaunchXEX,
    screenshot: notImplemented,
    getTitleID: notImplemented,
    getTitleInfo: getTitleInfo,
    Temperature: Temperature,
    getTemp: getTemp
};
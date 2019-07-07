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
                if(!line.startsWith("202- mem")) resolve(line);
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
module.exports = {
    ip: connectedIp,
    connect: connect,
    socket: socket,
    setMemory: setMemory,
    xNotify: xNotify,
    getMemory: getMemory,
    getCPUKey: getCPUKey,
    disconnect: disconnect,
    getConsoleID: getConsoleID
};
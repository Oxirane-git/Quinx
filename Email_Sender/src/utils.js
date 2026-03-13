function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelay(min = 3000, max = 6000) {
    const ms = Math.floor(Math.random() * (max - min + 1)) + min;
    return sleep(ms);
}

function getTimestamp() {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

const logger = {
    info: (msg) => console.log(`[${getTimestamp()}] [INFO]    ${msg}`),
    warn: (msg) => console.warn(`[${getTimestamp()}] [WARN]    ${msg}`),
    error: (msg) => console.error(`[${getTimestamp()}] [ERROR]   ${msg}`),
    success: (msg) => console.log(`[${getTimestamp()}] [SUCCESS] ${msg}`)
};

function formatLeadLog(index, total, email) {
    return `Sending email ${index}/${total} → ${email}`;
}

module.exports = {
    sleep,
    randomDelay,
    logger,
    formatLeadLog
};

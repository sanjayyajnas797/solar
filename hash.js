const crypto = require("crypto");

module.exports = password =>
    crypto.createHash("sha256")
    .update(password)
    .digest("hex");

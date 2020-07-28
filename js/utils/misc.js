(function (definition) {

    module.exports = definition();

})(function () {

    var module = this;

    /**
     * Get random number.
     * 
     * @param {integer} min - Minimum number.
     * @param {integer} max - Maximum number.
     */
    module.rand = function (min, max) {

        return Math.floor(Math.random() * (max - min + 1) + min);

    };

    /**
     * Get random element of an array.
     * 
     * @param {array} arr - Array.
     */
    module.rand_element = function (arr) {
        return arr[module.rand(0, arr.length - 1)];
    };

    /**
     * Convert timestamp into time string.
     * 
     * @param {boolean} full - Full time string?
     * @param {integer} timestamp - Timestamp.
     */
    module.time_string = function (full, timestamp) {

        var t = new Date();

        if (timestamp) {
            t.setTime(timestamp);
        }

        return '[' +
            (full ? (('0' + (t.getMonth() + 1)).slice(-2) + '/') : '') +
            (full ? (('0' + (t.getDate() + 1)).slice(-2) + '/') : '') +
            (full ? (('0' + (t.getFullYear() + 1)).slice(-2) + '/') : '') +
            ('0' + t.getHours()).slice(-2) + ':' +
            ('0' + t.getMinutes()).slice(-2) + ':' +
            ('0' + t.getSeconds()).slice(-2) + '.' +
            ('00' + t.getMilliseconds()).slice(-3) +
            ']';

    };

    /**
     * Get current timestamp.
     */
    module.timestamp = function () {
        return (new Date()).getTime();
    };

    /**
     * Create hash from string.
     * 
     * @param {string} s - String.
     */
    module.hash_string = function (s) {

        return (s.split("").reduce(function (a, b) {
            a = ((a << 5) - a) + b.charCodeAt(0);
            return a & a;
        }, 0) + 2147483647 + 1);

    };

    /**
     * Calculate modulo.
     * 
     * @param {integer} a - Dividend.
     * @param {integer} b - Divisor.
     */
    module.modulo = function (a, b) {

        return (+a % (b = +b) + b) % b;

    };

    // Parse/store command-line arguments.
    module.args = (function () {
        var _a = {};
        process.argv.forEach(function (val) {
            var equals = val.indexOf('=');
            _a[((equals > -1) ? val.substring(0, equals) : val)] = ((equals > -1) ? val.substring(equals + 1) : true);
        });
        return _a;
    })();

    // Get own IP.
    module.ip = (function () {
        var ifaces = require('os').networkInterfaces(),
            values = [].concat.apply([], (ifaces.eth0 || {})).filter(function (val) {
                return ((val.family == 'IPv4') && (val.internal == false));
            });

        if (values.length < 1) {

            var interfaces = Object.keys(ifaces);

            for (var i = 0; i < interfaces.length; i++) {
                if (interfaces[i] != 'lo') {
                    var info = ifaces[interfaces[i]];
                    for (var j = 0; j < info.length; j++) {
                        if (info[j].family == 'IPv4') {
                            values.push(info[j]);
                        }
                    }
                }
            }

        }

        return ((values.length > 0) ? values[0].address : '0.0.0.0'); // '10.10.10.30';

    })();

    /**
     * Convert serial number to ID.
     * 
     * @param {integer} sn - Serial number.
     */
    module.sn2id = function sn2id(sn) {

        return '' + sn;

    }; //.toString()

    /**
     * Convert Id to serial number.
     * 
     * @param {string} id - ID.
     */
    module.id2sn = function id2sn(id) {

        // TODO: id2sn assumes the form bellow: "substr(1)"
        //     function sn2id (sn) { return 's'+sn; }
        return (id == 'ffffffff') || (id == 'ffffff') ? 4294967295 : Number(id);

    };

    return module;

});
console.log("Starting.");

const config = require('./config.json');

const PORT = config.port;
const CLIENT_ID = config.auth.client_id;
const CLIENT_SECRET = config.auth.client_secret;
const REDIRECT_URI = config.auth.redirect_uri;

const http = require('http');
const url = require('url');
const request = require('request');

const tokens = [];

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

/**
 * @param {http.ClientRequest} req
 * @param {http.ServerResponse} res
 */
function handleIncoming(req, res) {
    let path = url.parse(req.url, true);
    if (path.pathname === '/') {
        res.writeHead(200);
        res.write('power /');
        res.end();
        return;
    }
    if (path.pathname === '/a/oauth') {
        handleOauth(req, res, path);
        return;
    }
    if (path.pathname === '/a/refresh') {
        handleRefresh(req, res, path);
        return;
    }
    if (path.pathname === '/a/logout') {
        handleLogout(req, res, path);
        return;
    }
    res.writeHead(404);
    res.write('Not Found');
    res.end();
}

function handleOauth(req, res, path) {
    // get the code
    if (!path.query['code']) {
        res.writeHead(400);
        res.write('No code!');
        res.end();
        return;
    }
    let oauth_code = path.query['code'];
    let to_microsoft_query = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'code': oauth_code,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'authorization_code'
    };
    postTokenMS(to_microsoft_query, (err, _res, body) => {
        let contents = JSON.parse(body);
        let headers = {'Content-Type': 'application/json'};
        for (let key in contents) {
            if (!contents.hasOwnProperty(key)) {
                continue;
            }
            if (typeof contents[key] === 'number' || typeof contents[key] === 'string') {
                headers['MS-' + key.replaceAll('_', '-')] = contents[key];
            } else {
                headers['MS-' + key.replaceAll('_', '-')] = JSON.stringify(contents[key]);
            }
        }
        res.writeHead(_res.statusCode, headers);
        res.end();
    });
}

function handleRefresh(req, res, path) {
    if (!path.query['refresh_token']) {
        res.writeHead(400);
        res.write('No refresh_token!');
        res.end();
        return;
    }
    let refresh_token = path.query['refresh_token'];
    let to_microsoft_query = {
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'refresh_token': refresh_token,
        'redirect_uri': REDIRECT_URI,
        'grant_type': 'refresh_token'
    };
    postTokenMS(to_microsoft_query, (err, _res, body) => {
        let contents = JSON.parse(body);
        let headers = {'Content-Type': 'application/json'};
        for (let key in contents) {
            if (!contents.hasOwnProperty(key)) {
                continue;
            }
            if (typeof contents[key] === 'number' || typeof contents[key] === 'string') {
                headers['MS-' + key.replaceAll('_', '-')] = contents[key];
            } else {
                headers['MS-' + key.replaceAll('_', '-')] = JSON.stringify(contents[key]);
            }
        }
        res.writeHead(_res.statusCode, headers);
        res.end();
    });
}

function handleLogout(req, res, path) {
    // todo
    res.writeHead(501);
    res.write('Not Implemented');
    res.end();
}

function postTokenMS(query, callback) {
    request.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {form: query},
        (err, _res, body) => {
            if (err) {
                console.error(err);
                return;
            }
            if (callback) {
                callback(err, _res, body);
            }
        });
}

http.createServer(handleIncoming).listen(PORT, function () {
    console.log('server open');
});

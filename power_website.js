console.log("Starting.");

const config = require('./config.json');

const PORT = config.port;
const CLIENT_ID = config.auth.client_id;
const CLIENT_SECRET = config.auth.client_secret;
const REDIRECT_URI = config.auth.redirect_uri;

const http = require('http');
const url = require('url');
const request = require('request');
const sha1 = require('sha1');

const tokens = [];
const sessions = {};

/**
 * @param {http.ClientRequest} req
 * @param {http.ServerResponse} res
 */
function handleIncoming(req, res) {
    let path = url.parse(req.url, true);
    if (path.pathname === '/') {
        res.writeHead(200);
        res.write('welcome to power');
        res.end();
        return;
    }
    if (path.pathname === '/a/oauth') {
        handleOauth(req, res, path);
        return;
    }
    if (path.pathname === '/a/logout') {
        handleLogout(req, res, path) ;
        return;
    }
    res.writeHead(404);
    res.write('Not found');
    res.end();
}

function handleOauth(req, res, path) {
    // get the code
    if (!path.query['code']) {
        res.writeHead('400');
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
    let sess_id = sha1(oauth_code);
    sessions[sess_id] = {
        req: req,
        res: res,
        path: path
    };
    console.log('sess: ' + sess_id);
    request.post('https://login.microsoftonline.com/common/oauth2/v2.0/token',
        {form: to_microsoft_query, header: {'power_sess': sess_id}},
        (err, _res, body) => {
            if (err) {
                console.error(err);
                return;
            }
            if (!_res.headers['power_sess']) {
                console.error('no sess!');
                return;
            }
            let sess = sessions[_res.headers['power_sess']];
            if (!sess) {
                console.error('unknown sess');
                return;
            }
            sess.res.writeHead(200, {'Content-Type': 'application/json'});
            sess.res.write(body);
            sess.res.end();
            delete sessions[_res.headers['power_sess']];
        });
}

function handleLougout(req, res, path) {

}

http.createServer(handleIncoming).listen(PORT, function() {
    console.log('server open');
});

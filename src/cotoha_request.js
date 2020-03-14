const request = require('request');
const fs = require('fs-extra');

const DEVELOPER_API_BASE_URL   = "https://api.ce-cotoha.com/api/dev/";
const ACCESS_TOKEN_PUBLISH_URL = "https://api.ce-cotoha.com/v1/oauth/accesstokens";
const CLIENT_ID     = "gkMVspYQsAh4MZSyMOBoDtZrioZGq4qZ";
const CLIENT_SECRET = "7OIpNdd93FTP8gdW";

const main = async () => {
  let accessToken = await getAccessToken();
  document = fs.readFileSync(process.argv[2], 'utf-8');
  let ret = [];
  let sentences = document.split('。').map(s => s.trim()).filter(s => s);
  for (let i = 0; i < sentences.length; i++) {
    let parse = await getParse(accessToken, sentences[i]);
    ret.push({ id: i, chunks: parse });
    await sleep(1000);
  };
  fs.writeFileSync(`${process.argv[2]}.kotoha.json`, JSON.stringify(ret, null, '  '));
}

const sleep = delay  => new Promise(resolve => setTimeout(resolve, delay));

const getAccessToken = () => {
  return new Promise((resolve, reject) => {
    request(
      {
        url: ACCESS_TOKEN_PUBLISH_URL,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        json: {
          grantType: "client_credentials",
          clientId: CLIENT_ID,
          clientSecret: CLIENT_SECRET,
        },
      },
      (error, response, body) => {
        if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
          if (typeof body !== 'object') body = JSON.parse(body);
          resolve(body.access_token);
        } else {
          if (error) {
            console.log(`request fail. error: ${error}`);
          } else {
            console.log(`request fail. response.statusCode: ${response.statusCode}, ${body}`);
          }
          reject(body);
        }
      },
    );
  });
}

const getParse = (accessToken, sentence) => {
  return new Promise((resolve, reject) => {
    request(
      {
        url: `${DEVELOPER_API_BASE_URL}nlp/v1/parse`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8', Authorization: `Bearer ${accessToken}`},
        json: { sentence: sentence },
      },
      (error, response, body) => {
        if (!error && (response.statusCode === 200 || response.statusCode === 201)) {
          if (typeof body !== 'object') body = JSON.parse(body);
          if (body.status === 0) {
            resolve(body.result);
          } else {
            console.log(`request fail. error: ${body.message}`);
            reject(body);
          }
        } else {
          if (error) {
            console.log(`request fail. error: ${error}`);
          } else {
            msg = (typeof body !== 'object') ? body : JSON.stringify(body);
            console.log(`request fail. response.statusCode: ${response.statusCode}, ${msg}`);
          }
          reject(body);
        }
      }
    );
  });
}

main();

var async = require('async');
const {Pool, Client} = require('pg')
var sleep = require('system-sleep');
var fs = require('fs');
var striptags = require('striptags');
var DiscoveryV1 = require('watson-developer-cloud/discovery/v1');



const collection = {
    environment_id: '05db4c06-4839-4449-9897-78bf181c9511',
    collection_id: '825ac5f6-5849-48f0-9655-71142350e997',
    configuration_id: '9ce44720-da6e-4041-ab49-e851ce7ab54a'
};


var retryOptions = {times: 3, interval: 5000};

process.env.VCAP_SERVICES = process.env.VCAP_SERVICES || fs.readFileSync('./credentials.json', 'utf-8');

var discovery = new DiscoveryV1({
    //username: '7f17eab1-733f-4be5-a6c1-90ebdfe86ba1',
    //password: 'Q3Kb7Nmlodg2',
    version_date: '2018-03-05'
});
const client = new Client({
    user: 'admin',
    host: 'sl-us-south-1-portal.6.dblayer.com',
    database: 'compose',
    password: 'UCWGJGBSMGQOOEWU',
    port: 44502
});

client.connect();


var listDocs = function (query, callback) {
    discovery.query({environment_id: collection.environment_id, collection_id: collection.collection_id,
        query: query
    }, (error, data) => {
        if (error) {
            console.error(error);
            return;
        }
        for (var i in data.results)
            callback(data.results[i].id)
    });

};


var loadDocument = function (row) {
    //console.log(row.title);
    var newDoc = row;
    if (row.format === 'html')
        striptags(row.answer);
    // row.file = {filename: '\/node\/'.concat(row.id, '.json')};
    // row.document_id = '96d761d6-10f6-47bb-8b00-6e9874229070';
    /* {
     "id": row.id,
     "url": "http://nome_host:80/id=" || row.id,
     "title": row.title,
     "context": row.context,
     "answer": row.answer
     };
     */

    if (row.document_id.length > 0)
    {
        var params = collection;
        params.document_id = row.document_id;
        discovery.deleteDocument(params, function (error, data) {
            console.log(JSON.stringify(data, null, 2));
        });
    }

    discovery.addJsonDocument({environment_id: collection.environment_id, collection_id: collection.collection_id,
        file: newDoc
    }, (error, data) => {
        if (error) {
            console.error(error);
            return;
        }
        
        console.log(data);
        client.query("UPDATE chats.answers set loaded=now() AT TIME ZONE 'CEST' , document_id=$1 where code=$2::integer", [data.document_id, newDoc.id], (qerr, qres) => {
            if (qerr)
              console.error(qerr);
            else
              console.log ('rows udated: ', qres.rowCount);
        });
    });
};


/**
 * Calls discovery addDocument to add a single document to collections with 3 retry options
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {String}   params.file
 * @param  {String}   params.collection_id
 * @param  {Function} cb
 * @return {Object}
 */
var uploadDocumentAsync = function (params, cb) {
    return async.retry(retryOptions, discovery.addJsonDocument.bind(discovery, {
        environment_id: `${params.env_id}`,
        collection_id: `${params.collection_id}`,
        file: params.file,
        configuration_id: `${params.config_id}`,
    }), cb);
};


/**
 * Calls uploadDocumentAsync to add a single document to collections
 * @param  {Object}   params
 * @param  {String}   params.env_id
 * @param  {String}   params.config_id
 * @param  {String}   params.file
 * @param  {String}   params.collection_id
 * @param  {Function} cb
 * @return {Object}
 */
var uploadDocument = function (params, cb) {
    var wrapped = async.timeout(uploadDocumentAsync, 16000);
    wrapped(params, function (err, res) {
        if (err) {
            console.log(params.file.path, err);
            return cb();
        }
        cb(null, res);
    });
};


var handleUpdload = function (errorUpload, docs) {
    if (errorUpload) {
        console.log('error', errorUpload);
        return;
    }
    console.log(`${docs.length} documents uploaded`);
    console.log('Updating .env file');

    console.log('finishing...');
    process.exit(0);
};


client.query('SELECT r.* from chats.answer_units as r', [], (err, res) => {
    var asyncTasks = [];
    for (var i in res.rows)
            // if (i < 4)
            {
                console.log(res.rows[i].title);
                loadDocument(res.rows[i]);
                sleep(3000);

                /*
                 asyncTasks.push(uploadDocument.bind(this, {
                 env_id: collection.environment_id,
                 config_id: collection.configuration_id,
                 file: res.rows[i],
                 collection_id: collection.collection_id
                 }));
                 
                 async.parallelLimit(asyncTasks, 1, function (err, res) {
                 if (err) {
                 return handleUpdload(err);
                 }
                 handleUpdload(null, res);
                 });
                 
                 */
            }

    client.end();
});